'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from './useToast'
import { requestPushNotify } from '@/lib/onesignal/client'

export type CallMode = 'audio' | 'video'
export type CallPhase =
    | 'idle'
    | 'outgoing'
    | 'incoming'
    | 'connecting'
    | 'connected'
    | 'ended'

export interface CallPeer {
    alias: string
    avatarUrl?: string | null
    partnerId: string
    myAlias?: string
}

type SignalPayload = {
    type: 'invite' | 'offer' | 'answer' | 'ice' | 'accept' | 'decline' | 'end'
    callId?: string
    mode?: CallMode
    matchId?: string
    fromUserId?: string
    fromAlias?: string
    fromAvatar?: string
    toUserId?: string
    sdp?: RTCSessionDescriptionInit
    candidate?: RTCIceCandidateInit | null
}

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * 1:1 audio/video calls over WebRTC + Supabase Realtime signaling.
 * Mute / hold / camera off / hang up only — no recording, no conference.
 */
export function useSupabaseCall(matchId: string | null, peer: CallPeer | null) {
    const toast = useToast()
    const myId = useAppStore((s) => s.currentUserId)

    const [phase, setPhase] = useState<CallPhase>('idle')
    const [mode, setMode] = useState<CallMode>('audio')
    const [muted, setMuted] = useState(false)
    const [onHold, setOnHold] = useState(false)
    const [cameraOff, setCameraOff] = useState(false)
    const [speakerOn, setSpeakerOn] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [elapsed, setElapsed] = useState(0)

    const pcRef = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const remoteStreamRef = useRef<MediaStream | null>(null)
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
    const callIdRef = useRef<string | null>(null)
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
    const makingOfferRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const phaseRef = useRef<CallPhase>('idle')
    const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const speakerOnRef = useRef(true)

    useEffect(() => {
        phaseRef.current = phase
    }, [phase])

    const broadcast = useCallback((payload: SignalPayload) => {
        void channelRef.current?.send({
            type: 'broadcast',
            event: 'call',
            payload,
        })
    }, [])

    const broadcastGlobal = useCallback(async (toUserId: string, payload: SignalPayload) => {
        try {
            const supabase = createClient()
            const ch = supabase.channel(`calls:user:${toUserId}`)
            await new Promise<void>((resolve) => {
                ch.subscribe((status) => {
                    if (status === 'SUBSCRIBED') resolve()
                })
                setTimeout(() => resolve(), 1200)
            })
            await ch.send({ type: 'broadcast', event: 'call', payload })
            void supabase.removeChannel(ch)
        } catch {
            /* non-blocking */
        }
    }, [])

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const cleanupMedia = useCallback(() => {
        stopTimer()
        if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current)
            disconnectTimerRef.current = null
        }
        try {
            pcRef.current?.close()
        } catch {
            /* ignore */
        }
        pcRef.current = null
        localStreamRef.current?.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
        remoteStreamRef.current = null
        pendingOfferRef.current = null
        makingOfferRef.current = false
        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    }, [stopTimer])

    const resetCallUi = useCallback(() => {
        setMuted(false)
        setOnHold(false)
        setCameraOff(false)
        setSpeakerOn(true)
        speakerOnRef.current = true
        setElapsed(0)
        setError(null)
        callIdRef.current = null
    }, [])

    const playMedia = useCallback((el: HTMLMediaElement | null) => {
        if (!el) return
        if ('playsInline' in el) {
            ;(el as HTMLVideoElement).playsInline = true
        }
        void el.play().catch(() => undefined)
    }, [])

    const applySpeaker = useCallback(async (on: boolean) => {
        const audio = remoteAudioRef.current as HTMLAudioElement & {
            setSinkId?: (id: string) => Promise<void>
        } | null
        if (!audio) return
        audio.volume = 1
        try {
            if (typeof audio.setSinkId === 'function') {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const outputs = devices.filter((d) => d.kind === 'audiooutput')
                if (on) {
                    const speaker =
                        outputs.find((d) => /speaker|loud/i.test(d.label)) ||
                        outputs.find((d) => !/earpiece|phone|handset|communication/i.test(d.label)) ||
                        outputs[0]
                    if (speaker?.deviceId) await audio.setSinkId(speaker.deviceId)
                } else {
                    const ear =
                        outputs.find((d) => /earpiece|phone|handset|communication/i.test(d.label)) ||
                        outputs.find((d) => d.deviceId === 'default') ||
                        outputs[0]
                    if (ear?.deviceId) await audio.setSinkId(ear.deviceId)
                }
            }
        } catch {
            /* browser may block setSinkId */
        }
    }, [])

    const attachLocalPreview = useCallback((stream: MediaStream, callMode: CallMode) => {
        localStreamRef.current = stream
        if (localVideoRef.current) {
            if (localVideoRef.current.srcObject !== stream) {
                localVideoRef.current.srcObject = stream
            }
            localVideoRef.current.muted = true
            localVideoRef.current.playsInline = true
            if (callMode === 'video') playMedia(localVideoRef.current)
        }
    }, [playMedia])

    const attachRemoteStream = useCallback((stream: MediaStream) => {
        // Keep one stable MediaStream — replace tracks instead of swapping objects
        if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream()
        }
        const stable = remoteStreamRef.current
        stream.getTracks().forEach((track) => {
            const existing = stable.getTracks().find((t) => t.kind === track.kind)
            if (existing && existing.id !== track.id) {
                stable.removeTrack(existing)
            }
            if (!stable.getTracks().some((t) => t.id === track.id)) {
                stable.addTrack(track)
            }
        })

        if (remoteAudioRef.current) {
            if (remoteAudioRef.current.srcObject !== stable) {
                remoteAudioRef.current.srcObject = stable
            }
            playMedia(remoteAudioRef.current)
            void applySpeaker(speakerOnRef.current)
        }
        if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== stable) {
                remoteVideoRef.current.srcObject = stable
            }
            remoteVideoRef.current.playsInline = true
            playMedia(remoteVideoRef.current)
        }
    }, [applySpeaker, playMedia])

    const ensurePeerConnection = useCallback(
        (callMode: CallMode) => {
            if (pcRef.current) return pcRef.current
            const pc = new RTCPeerConnection({
                iceServers: ICE_SERVERS,
                iceCandidatePoolSize: 4,
            })
            pcRef.current = pc

            pc.onicecandidate = (ev) => {
                if (!ev.candidate || !matchId || !myId) return
                broadcast({
                    type: 'ice',
                    callId: callIdRef.current || undefined,
                    matchId,
                    fromUserId: myId,
                    toUserId: peer?.partnerId,
                    candidate: ev.candidate.toJSON(),
                })
            }

            pc.ontrack = (ev) => {
                const stream = ev.streams[0] || new MediaStream([ev.track])
                attachRemoteStream(stream)
                ev.track.onunmute = () => {
                    if (remoteStreamRef.current) attachRemoteStream(remoteStreamRef.current)
                }
            }

            pc.onconnectionstatechange = () => {
                const state = pc.connectionState
                if (state === 'connected' || state === 'connecting') {
                    if (disconnectTimerRef.current) {
                        clearTimeout(disconnectTimerRef.current)
                        disconnectTimerRef.current = null
                    }
                }
                if (state === 'connected') {
                    setPhase('connected')
                    if (!timerRef.current) {
                        setElapsed(0)
                        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
                    }
                    // Re-bind media after ICE settles (fixes black flicker)
                    if (remoteStreamRef.current) attachRemoteStream(remoteStreamRef.current)
                    if (localStreamRef.current) attachLocalPreview(localStreamRef.current, callMode)
                } else if (state === 'failed' || state === 'closed') {
                    if (phaseRef.current === 'connected' || phaseRef.current === 'connecting') {
                        toast.info('Call ended', 'The other person left the call')
                        cleanupMedia()
                        resetCallUi()
                        setPhase('idle')
                    }
                } else if (state === 'disconnected') {
                    // Brief ICE blips are common — wait before ending
                    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
                    disconnectTimerRef.current = setTimeout(() => {
                        if (pcRef.current?.connectionState === 'disconnected' || pcRef.current?.connectionState === 'failed') {
                            toast.info('Call ended', 'Connection lost')
                            cleanupMedia()
                            resetCallUi()
                            setPhase('idle')
                        }
                    }, 4000)
                }
            }

            return pc
        },
        [attachLocalPreview, attachRemoteStream, broadcast, cleanupMedia, matchId, myId, peer?.partnerId, resetCallUi, toast],
    )

    const getLocalMedia = useCallback(async (callMode: CallMode) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: callMode === 'video'
                ? {
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 24, max: 30 },
                    facingMode: 'user',
                }
                : false,
        })
        attachLocalPreview(stream, callMode)
        return stream
    }, [attachLocalPreview])

    const endCall = useCallback(
        (notify = true) => {
            if (notify && matchId && callIdRef.current) {
                const payload: SignalPayload = {
                    type: 'end',
                    callId: callIdRef.current,
                    matchId,
                    fromUserId: myId || undefined,
                    toUserId: peer?.partnerId,
                }
                broadcast(payload)
                if (peer?.partnerId) void broadcastGlobal(peer.partnerId, payload)
            }
            cleanupMedia()
            resetCallUi()
            setPhase('idle')
        },
        [broadcast, broadcastGlobal, cleanupMedia, matchId, myId, peer?.partnerId, resetCallUi],
    )

    const startCall = useCallback(
        async (callMode: CallMode) => {
            if (!matchId || !peer || !myId) return
            const callId = `call_${Date.now()}`
            callIdRef.current = callId
            setMode(callMode)
            setPhase('outgoing')
            setError(null)

            const invitePayload: SignalPayload = {
                type: 'invite',
                callId,
                mode: callMode,
                matchId,
                fromUserId: myId,
                fromAlias: peer.myAlias || 'Match',
                toUserId: peer.partnerId,
            }
            broadcast(invitePayload)
            void broadcastGlobal(peer.partnerId, invitePayload)

            void requestPushNotify({
                toUserId: peer.partnerId,
                kind: callMode === 'video' ? 'video_call' : 'audio_call',
                title: callMode === 'video' ? '📹 Incoming video call' : '📞 Incoming audio call',
                body: callMode === 'video'
                    ? `${peer.myAlias || 'Your match'} is video calling you — tap to answer`
                    : `${peer.myAlias || 'Your match'} is calling you — tap to answer`,
                matchId,
                callId,
                mode: callMode,
            })

            try {
                setPhase('connecting')
                const stream = await getLocalMedia(callMode)
                const pc = ensurePeerConnection(callMode)
                stream.getTracks().forEach((track) => pc.addTrack(track, stream))

                makingOfferRef.current = true
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                makingOfferRef.current = false

                broadcast({
                    type: 'offer',
                    callId,
                    mode: callMode,
                    matchId,
                    fromUserId: myId,
                    toUserId: peer.partnerId,
                    sdp: offer,
                })
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Could not start call'
                setError(msg)
                toast.error('Call failed', msg)
                cleanupMedia()
                resetCallUi()
                setPhase('idle')
            }
        },
        [
            broadcast,
            broadcastGlobal,
            cleanupMedia,
            ensurePeerConnection,
            getLocalMedia,
            matchId,
            myId,
            peer,
            resetCallUi,
            toast,
        ],
    )

    const answerWithOffer = useCallback(async (forcedMode?: CallMode) => {
        if (!matchId || !myId || !peer) return
        const callMode = forcedMode || mode
        setMode(callMode)
        setPhase('connecting')
        broadcast({
            type: 'accept',
            callId: callIdRef.current || undefined,
            matchId,
            mode: callMode,
            fromUserId: myId,
            toUserId: peer.partnerId,
        })

        try {
            const offer = pendingOfferRef.current
            if (!offer) {
                throw new Error('Call offer expired — ask them to call again')
            }
            const stream = await getLocalMedia(callMode)
            const pc = ensurePeerConnection(callMode)
            stream.getTracks().forEach((track) => pc.addTrack(track, stream))
            await pc.setRemoteDescription(offer)
            pendingOfferRef.current = null
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            broadcast({
                type: 'answer',
                callId: callIdRef.current || undefined,
                matchId,
                mode: callMode,
                fromUserId: myId,
                toUserId: peer.partnerId,
                sdp: answer,
            })
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Could not answer'
            toast.error('Call failed', msg)
            endCall(true)
        }
    }, [
        broadcast,
        endCall,
        ensurePeerConnection,
        getLocalMedia,
        matchId,
        mode,
        myId,
        peer,
        toast,
    ])

    const acceptCall = useCallback(async () => {
        if (phase !== 'incoming') return
        await answerWithOffer()
    }, [answerWithOffer, phase])

    /** Deep-link Accept when offer may arrive slightly later */
    const answerFromDeepLink = useCallback(
        async (callMode: CallMode) => {
            setMode(callMode)
            setPhase('incoming')
            const started = Date.now()
            while (!pendingOfferRef.current && Date.now() - started < 8000) {
                await new Promise((r) => setTimeout(r, 200))
            }
            if (!pendingOfferRef.current) {
                toast.info('Waiting for caller', 'Ask them to call again if this stays empty')
                setPhase('idle')
                return
            }
            await answerWithOffer(callMode)
        },
        [answerWithOffer, toast],
    )

    const declineCall = useCallback(() => {
        if (matchId && myId) {
            const payload: SignalPayload = {
                type: 'decline',
                callId: callIdRef.current || undefined,
                matchId,
                fromUserId: myId,
                toUserId: peer?.partnerId,
            }
            broadcast(payload)
            if (peer?.partnerId) void broadcastGlobal(peer.partnerId, payload)
        }
        cleanupMedia()
        resetCallUi()
        setPhase('idle')
    }, [broadcast, broadcastGlobal, cleanupMedia, matchId, myId, peer?.partnerId, resetCallUi])

    const toggleMute = useCallback(() => {
        setMuted((prev) => {
            const next = !prev
            localStreamRef.current?.getAudioTracks().forEach((t) => {
                t.enabled = !next && !onHold
            })
            return next
        })
    }, [onHold])

    const toggleHold = useCallback(() => {
        setOnHold((prev) => {
            const next = !prev
            localStreamRef.current?.getAudioTracks().forEach((t) => {
                t.enabled = !next && !muted
            })
            localStreamRef.current?.getVideoTracks().forEach((t) => {
                t.enabled = !next && !cameraOff
            })
            return next
        })
    }, [cameraOff, muted])

    const toggleCamera = useCallback(() => {
        if (mode !== 'video') return
        setCameraOff((prev) => {
            const next = !prev
            localStreamRef.current?.getVideoTracks().forEach((t) => {
                t.enabled = !next && !onHold
            })
            return next
        })
    }, [mode, onHold])

    const toggleSpeaker = useCallback(() => {
        setSpeakerOn((prev) => {
            const next = !prev
            speakerOnRef.current = next
            void applySpeaker(next)
            return next
        })
    }, [applySpeaker])

    // Match signaling channel
    useEffect(() => {
        if (!matchId || !myId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`calls:${matchId}`, { config: { broadcast: { self: false } } })
            .on('broadcast', { event: 'call' }, ({ payload }) => {
                const p = payload as SignalPayload
                if (!p?.type || p.fromUserId === myId) return

                if (p.type === 'invite') {
                    callIdRef.current = p.callId || null
                    const callMode = p.mode === 'video' ? 'video' : 'audio'
                    setMode(callMode)
                    setPhase('incoming')
                    toast.info(
                        callMode === 'video' ? '📹 Incoming video call' : '📞 Incoming audio call',
                        peer?.alias
                            ? callMode === 'video'
                                ? `${peer.alias} is video calling you`
                                : `${peer.alias} is calling you`
                            : 'Answer or decline below',
                    )
                }

                if (p.type === 'offer' && p.sdp) {
                    pendingOfferRef.current = p.sdp
                    if (p.mode) setMode(p.mode === 'video' ? 'video' : 'audio')
                    if (phaseRef.current === 'idle') setPhase('incoming')
                }

                if (p.type === 'answer' && p.sdp && pcRef.current) {
                    void pcRef.current.setRemoteDescription(p.sdp).catch(() => undefined)
                }

                if (p.type === 'ice' && p.candidate && pcRef.current) {
                    void pcRef.current.addIceCandidate(p.candidate).catch(() => undefined)
                }

                if (p.type === 'decline' || p.type === 'end') {
                    cleanupMedia()
                    resetCallUi()
                    setPhase('idle')
                    if (p.type === 'decline') toast.info('Call declined')
                    else toast.info('Call ended')
                }
            })
            .subscribe()

        channelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [cleanupMedia, matchId, myId, peer?.alias, resetCallUi, toast])

    useEffect(() => () => cleanupMedia(), [cleanupMedia])

    return {
        phase,
        mode,
        muted,
        onHold,
        cameraOff,
        speakerOn,
        isMock: false,
        error,
        elapsed,
        startCall,
        acceptCall,
        answerFromDeepLink,
        declineCall,
        endCall,
        toggleMute,
        toggleHold,
        toggleCamera,
        toggleSpeaker,
        setLocalVideoEl: (el: HTMLVideoElement | null) => {
            localVideoRef.current = el
            if (el && localStreamRef.current) {
                el.srcObject = localStreamRef.current
                el.muted = true
                el.playsInline = true
                void el.play().catch(() => undefined)
            }
        },
        setRemoteVideoEl: (el: HTMLVideoElement | null) => {
            remoteVideoRef.current = el
            if (el && remoteStreamRef.current) {
                el.srcObject = remoteStreamRef.current
                el.playsInline = true
                void el.play().catch(() => undefined)
            }
        },
        setRemoteAudioEl: (el: HTMLAudioElement | null) => {
            remoteAudioRef.current = el
            if (el && remoteStreamRef.current) {
                el.srcObject = remoteStreamRef.current
                void el.play().catch(() => undefined)
                void applySpeaker(speakerOnRef.current)
            }
        },
    }
}

/** @deprecated Use useSupabaseCall — kept for import compatibility during rename */
export const useTwilioCall = useSupabaseCall
