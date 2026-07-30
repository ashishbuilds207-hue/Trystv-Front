'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from './useToast'

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
}

interface TokenResponse {
    token: string | null
    identity: string
    roomName: string
    mode: CallMode
    mock?: boolean
    message?: string
}

type VideoRoom = import('twilio-video').Room
type LocalTrack = import('twilio-video').LocalAudioTrack | import('twilio-video').LocalVideoTrack

async function fetchCallToken(matchId: string, mode: CallMode): Promise<TokenResponse> {
    const res = await fetch('/api/twilio/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, mode }),
        credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not start call')
    }
    return json.data as TokenResponse
}

export function useTwilioCall(matchId: string | null, peer: CallPeer | null) {
    const toast = useToast()
    const myId = useAppStore((s) => s.currentUserId)

    const [phase, setPhase] = useState<CallPhase>('idle')
    const [mode, setMode] = useState<CallMode>('audio')
    const [muted, setMuted] = useState(false)
    const [onHold, setOnHold] = useState(false)
    const [cameraOff, setCameraOff] = useState(false)
    const [isMock, setIsMock] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [elapsed, setElapsed] = useState(0)

    const roomRef = useRef<VideoRoom | null>(null)
    const localTracksRef = useRef<LocalTrack[]>([])
    const localStreamRef = useRef<MediaStream | null>(null)
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
    const callIdRef = useRef<string | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const cleanupMedia = useCallback(() => {
        localTracksRef.current.forEach((t) => {
            try {
                t.stop()
            } catch {
                /* ignore */
            }
        })
        localTracksRef.current = []
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop())
            localStreamRef.current = null
        }
        if (roomRef.current) {
            try {
                roomRef.current.disconnect()
            } catch {
                /* ignore */
            }
            roomRef.current = null
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    }, [])

    const resetCallUi = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        setMuted(false)
        setOnHold(false)
        setCameraOff(false)
        setElapsed(0)
        setError(null)
        callIdRef.current = null
    }, [])

    const endCall = useCallback(
        (broadcast = true) => {
            if (broadcast && matchId && callIdRef.current) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'call',
                    payload: {
                        type: 'end',
                        callId: callIdRef.current,
                        fromUserId: myId,
                    },
                })
            }
            cleanupMedia()
            resetCallUi()
            setPhase('idle')
        },
        [cleanupMedia, matchId, myId, resetCallUi],
    )

    const attachRemoteParticipant = useCallback((participant: import('twilio-video').RemoteParticipant) => {
        const attachTrack = (track: import('twilio-video').RemoteTrack) => {
            if (track.kind === 'audio' && remoteAudioRef.current) {
                track.attach(remoteAudioRef.current)
            }
            if (track.kind === 'video' && remoteVideoRef.current) {
                track.attach(remoteVideoRef.current)
            }
        }
        participant.tracks.forEach((pub) => {
            if (pub.track) attachTrack(pub.track)
        })
        participant.on('trackSubscribed', attachTrack)
    }, [])

    const joinRoom = useCallback(
        async (callMode: CallMode) => {
            if (!matchId) return
            setPhase('connecting')
            setMode(callMode)
            setError(null)

            try {
                const data = await fetchCallToken(matchId, callMode)
                setIsMock(!!data.mock)

                if (data.mock || !data.token) {
                    // Demo: local mic/camera only so mute / hold / end still work
                    const constraints: MediaStreamConstraints = {
                        audio: true,
                        video: callMode === 'video',
                    }
                    const stream = await navigator.mediaDevices.getUserMedia(constraints)
                    localStreamRef.current = stream
                    if (callMode === 'video' && localVideoRef.current) {
                        localVideoRef.current.srcObject = stream
                        localVideoRef.current.muted = true
                        void localVideoRef.current.play().catch(() => undefined)
                    }
                    setPhase('connected')
                    setElapsed(0)
                    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
                    if (data.message) toast.info('Demo call', data.message)
                    return
                }

                const Video = await import('twilio-video')
                const tracks: LocalTrack[] = []
                const audioTrack = await Video.createLocalAudioTrack({ name: 'microphone' })
                tracks.push(audioTrack)

                if (callMode === 'video') {
                    const videoTrack = await Video.createLocalVideoTrack({ name: 'camera' })
                    tracks.push(videoTrack)
                    if (localVideoRef.current) {
                        videoTrack.attach(localVideoRef.current)
                    }
                }

                localTracksRef.current = tracks

                const room = await Video.connect(data.token, {
                    name: data.roomName,
                    tracks,
                    dominantSpeaker: true,
                })
                roomRef.current = room

                room.participants.forEach(attachRemoteParticipant)
                room.on('participantConnected', attachRemoteParticipant)

                setPhase('connected')
                setElapsed(0)
                timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Call failed'
                setError(msg)
                toast.error('Call failed', msg)
                cleanupMedia()
                setPhase('idle')
            }
        },
        [attachRemoteParticipant, cleanupMedia, matchId, toast],
    )

    const startCall = useCallback(
        async (callMode: CallMode) => {
            if (!matchId || !peer || !myId) return
            const callId = `call_${Date.now()}`
            callIdRef.current = callId
            setMode(callMode)
            setPhase('outgoing')

            channelRef.current?.send({
                type: 'broadcast',
                event: 'call',
                payload: {
                    type: 'invite',
                    callId,
                    mode: callMode,
                    fromUserId: myId,
                    fromAlias: useAppStore.getState().currentUserId,
                    toUserId: peer.partnerId,
                },
            })

            // Auto-connect after invite (callee accepts separately)
            await joinRoom(callMode)
        },
        [joinRoom, matchId, myId, peer],
    )

    const acceptCall = useCallback(async () => {
        if (phase !== 'incoming') return
        channelRef.current?.send({
            type: 'broadcast',
            event: 'call',
            payload: {
                type: 'accept',
                callId: callIdRef.current,
                fromUserId: myId,
            },
        })
        await joinRoom(mode)
    }, [joinRoom, mode, myId, phase])

    const declineCall = useCallback(() => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'call',
            payload: {
                type: 'decline',
                callId: callIdRef.current,
                fromUserId: myId,
            },
        })
        resetCallUi()
        setPhase('idle')
    }, [myId, resetCallUi])

    const toggleMute = useCallback(() => {
        setMuted((prev) => {
            const next = !prev
            localTracksRef.current.forEach((t) => {
                if (t.kind === 'audio') t.enable(!next)
            })
            localStreamRef.current?.getAudioTracks().forEach((t) => {
                t.enabled = !next
            })
            return next
        })
    }, [])

    const toggleHold = useCallback(() => {
        setOnHold((prev) => {
            const next = !prev
            localTracksRef.current.forEach((t) => {
                if (next) t.disable()
                else if (t.kind === 'audio') t.enable(!muted)
                else if (t.kind === 'video') t.enable(!cameraOff)
            })
            localStreamRef.current?.getTracks().forEach((t) => {
                if (next) t.enabled = false
                else if (t.kind === 'audio') t.enabled = !muted
                else if (t.kind === 'video') t.enabled = !cameraOff
            })
            return next
        })
    }, [cameraOff, muted])

    const toggleCamera = useCallback(() => {
        if (mode !== 'video') return
        setCameraOff((prev) => {
            const next = !prev
            localTracksRef.current.forEach((t) => {
                if (t.kind === 'video') t.enable(!next)
            })
            localStreamRef.current?.getVideoTracks().forEach((t) => {
                t.enabled = !next
            })
            return next
        })
    }, [mode])

    // Signalling channel per match
    useEffect(() => {
        if (!matchId || !myId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`calls:${matchId}`, { config: { broadcast: { self: false } } })
            .on('broadcast', { event: 'call' }, ({ payload }) => {
                const p = payload as {
                    type?: string
                    callId?: string
                    mode?: CallMode
                    fromUserId?: string
                    toUserId?: string
                }
                if (!p?.type || p.fromUserId === myId) return

                if (p.type === 'invite' && (!p.toUserId || p.toUserId === myId)) {
                    callIdRef.current = p.callId || null
                    setMode(p.mode === 'video' ? 'video' : 'audio')
                    setPhase('incoming')
                }
                if (p.type === 'decline' || p.type === 'end') {
                    cleanupMedia()
                    resetCallUi()
                    setPhase('idle')
                    if (p.type === 'decline') toast.info('Call declined')
                }
            })
            .subscribe()

        channelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [cleanupMedia, matchId, myId, resetCallUi, toast])

    useEffect(() => {
        return () => {
            cleanupMedia()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [cleanupMedia])

    return {
        phase,
        mode,
        muted,
        onHold,
        cameraOff,
        isMock,
        error,
        elapsed,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleHold,
        toggleCamera,
        setLocalVideoEl: (el: HTMLVideoElement | null) => {
            localVideoRef.current = el
        },
        setRemoteVideoEl: (el: HTMLVideoElement | null) => {
            remoteVideoRef.current = el
        },
        setRemoteAudioEl: (el: HTMLAudioElement | null) => {
            remoteAudioRef.current = el
        },
    }
}
