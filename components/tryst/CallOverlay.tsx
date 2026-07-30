'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import {
    PhoneOff,
    Mic,
    MicOff,
    Pause,
    Play,
    Video,
    VideoOff,
    Phone,
    Loader2,
} from 'lucide-react'
import { DEFAULT_AVATAR } from '@/components/tryst/ProfileAvatar'
import type { CallMode, CallPhase } from '@/lib/hooks/useTwilioCall'

function formatElapsed(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface CallOverlayProps {
    open: boolean
    phase: CallPhase
    mode: CallMode
    partnerName: string
    partnerAvatar?: string | null
    muted: boolean
    onHold: boolean
    cameraOff: boolean
    isMock?: boolean
    elapsed: number
    onAccept: () => void
    onDecline: () => void
    onEnd: () => void
    onToggleMute: () => void
    onToggleHold: () => void
    onToggleCamera: () => void
    setLocalVideoEl: (el: HTMLVideoElement | null) => void
    setRemoteVideoEl: (el: HTMLVideoElement | null) => void
    setRemoteAudioEl: (el: HTMLAudioElement | null) => void
}

export default function CallOverlay({
    open,
    phase,
    mode,
    partnerName,
    partnerAvatar,
    muted,
    onHold,
    cameraOff,
    isMock,
    elapsed,
    onAccept,
    onDecline,
    onEnd,
    onToggleMute,
    onToggleHold,
    onToggleCamera,
    setLocalVideoEl,
    setRemoteVideoEl,
    setRemoteAudioEl,
}: CallOverlayProps) {
    const localRef = useRef<HTMLVideoElement | null>(null)
    const remoteRef = useRef<HTMLVideoElement | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        setLocalVideoEl(localRef.current)
        setRemoteVideoEl(remoteRef.current)
        setRemoteAudioEl(audioRef.current)
    }, [open, phase, setLocalVideoEl, setRemoteVideoEl, setRemoteAudioEl])

    if (!open || phase === 'idle' || phase === 'ended') return null

    const isIncoming = phase === 'incoming'
    const isRinging = phase === 'outgoing' || phase === 'incoming'
    const isActive = phase === 'connected' || phase === 'connecting'
    const showVideo = mode === 'video' && (phase === 'connected' || phase === 'connecting')

    const statusLabel = (() => {
        if (phase === 'incoming') return `Incoming ${mode} call…`
        if (phase === 'outgoing') return `Calling ${partnerName}…`
        if (phase === 'connecting') return 'Connecting…'
        if (onHold) return 'On hold'
        if (muted) return 'Muted'
        return formatElapsed(elapsed)
    })()

    return (
        <div className="fixed inset-0 z-[220] flex flex-col bg-[#0A0908]/95 backdrop-blur-md">
            <audio ref={audioRef} autoPlay playsInline />

            {/* Video stage */}
            {showVideo ? (
                <div className="relative flex-1 min-h-0">
                    <video
                        ref={remoteRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover bg-tryst-bg"
                    />
                    {!cameraOff && (
                        <video
                            ref={localRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute bottom-28 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl object-cover border border-tryst-border shadow-lg bg-tryst-card"
                        />
                    )}
                    {cameraOff && (
                        <div className="absolute bottom-28 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl border border-tryst-border bg-tryst-card flex items-center justify-center">
                            <VideoOff className="w-6 h-6 text-ivory-500" />
                        </div>
                    )}
                    {onHold && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <p className="text-ivory-200 font-playfair text-xl">On hold</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <div className={`relative mb-6 ${isRinging ? 'animate-pulse' : ''}`}>
                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-crimson/50 shadow-crimson">
                            <Image
                                src={partnerAvatar || DEFAULT_AVATAR}
                                alt={partnerName}
                                width={112}
                                height={112}
                                className="object-cover w-full h-full"
                                unoptimized
                            />
                        </div>
                        {phase === 'connecting' && (
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-crimson animate-spin" />
                            </div>
                        )}
                    </div>
                    <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">{partnerName}</h2>
                    <p className="text-ivory-400 text-sm mb-1 capitalize">
                        {mode === 'video' ? 'Video call' : 'Audio call'}
                    </p>
                    <p className="text-crimson-300 text-sm font-medium">{statusLabel}</p>
                    {isMock && phase === 'connected' && (
                        <p className="text-ivory-600 text-xs mt-3 text-center max-w-xs">
                            Demo mode — add Twilio keys for live partner audio
                        </p>
                    )}
                    {/* keep local video mount for attach even in audio layout when switching */}
                    <video ref={localRef} className="hidden" muted playsInline autoPlay />
                    <video ref={remoteRef} className="hidden" playsInline autoPlay />
                </div>
            )}

            {/* Status bar for video mode */}
            {showVideo && (
                <div className="absolute top-0 inset-x-0 pt-8 pb-4 px-4 text-center bg-gradient-to-b from-black/70 to-transparent">
                    <p className="text-ivory-100 font-semibold">{partnerName}</p>
                    <p className="text-crimson-300 text-sm">{statusLabel}</p>
                </div>
            )}

            {/* Controls */}
            <div className="safe-bottom pb-8 pt-4 px-6">
                {isIncoming ? (
                    <div className="flex items-center justify-center gap-10">
                        <button
                            type="button"
                            onClick={onDecline}
                            className="flex flex-col items-center gap-2"
                        >
                            <span className="w-16 h-16 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-300 hover:bg-tryst-bg transition-colors">
                                <PhoneOff className="w-7 h-7" />
                            </span>
                            <span className="text-ivory-500 text-xs">Decline</span>
                        </button>
                        <button
                            type="button"
                            onClick={onAccept}
                            className="flex flex-col items-center gap-2"
                        >
                            <span className="w-16 h-16 rounded-full bg-crimson shadow-crimson flex items-center justify-center text-white hover:opacity-90 transition-opacity">
                                <Phone className="w-7 h-7" />
                            </span>
                            <span className="text-ivory-300 text-xs">Accept</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                        <ControlBtn
                            label={muted ? 'Unmute' : 'Mute'}
                            active={muted}
                            onClick={onToggleMute}
                            disabled={!isActive}
                        >
                            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </ControlBtn>

                        <ControlBtn
                            label={onHold ? 'Resume' : 'Hold'}
                            active={onHold}
                            onClick={onToggleHold}
                            disabled={!isActive}
                        >
                            {onHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                        </ControlBtn>

                        {mode === 'video' && (
                            <ControlBtn
                                label={cameraOff ? 'Camera' : 'Cam off'}
                                active={cameraOff}
                                onClick={onToggleCamera}
                                disabled={!isActive}
                            >
                                {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                            </ControlBtn>
                        )}

                        <button
                            type="button"
                            onClick={onEnd}
                            className="flex flex-col items-center gap-2"
                        >
                            <span className="w-14 h-14 rounded-full bg-crimson shadow-crimson flex items-center justify-center text-white hover:opacity-90 transition-opacity">
                                <PhoneOff className="w-6 h-6" />
                            </span>
                            <span className="text-ivory-500 text-xs">End</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function ControlBtn({
    children,
    label,
    active,
    onClick,
    disabled,
}: {
    children: React.ReactNode
    label: string
    active?: boolean
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center gap-2 disabled:opacity-40"
        >
            <span
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                    active
                        ? 'bg-crimson text-white border-crimson shadow-crimson'
                        : 'bg-tryst-card text-ivory-300 border-tryst-border hover:bg-tryst-bg'
                }`}
            >
                {children}
            </span>
            <span className="text-ivory-500 text-xs">{label}</span>
        </button>
    )
}
