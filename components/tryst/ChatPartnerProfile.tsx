'use client'

import { createPortal } from 'react-dom'
import { X, MapPin, Flame, CheckCircle2, Briefcase, Phone, Video } from 'lucide-react'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import type { Match } from '@/lib/hooks/useDiscover'

const ARCHETYPES: Record<string, string> = {
    WANDERER: 'Wanderer',
    FLAME: 'Flame',
    GHOST: 'Ghost',
    SPARK: 'Spark',
    STORY: 'Story',
}

export type ChatPartner = Match & {
    bio?: string | null
    profession?: string | null
    desireArchetype?: string | null
    gender?: string | null
    orientation?: string | null
    build?: string | null
    country?: string | null
    profileCompletion?: number | null
}

interface ChatPartnerProfileProps {
    partner: ChatPartner
    open: boolean
    onClose: () => void
    canCall?: boolean
    onAudioCall?: () => void
    onVideoCall?: () => void
}

export default function ChatPartnerProfile({
    partner,
    open,
    onClose,
    canCall = false,
    onAudioCall,
    onVideoCall,
}: ChatPartnerProfileProps) {
    if (!open || typeof document === 'undefined') return null

    const archetype = partner.desireArchetype
        ? ARCHETYPES[partner.desireArchetype] || partner.desireArchetype
        : null
    const tags = partner.desireTags || []
    const photos = (partner.photoUrls || []).filter(Boolean)

    return createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true">
            <button
                type="button"
                aria-label="Close profile backdrop"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm border-0 cursor-pointer"
                onClick={onClose}
            />
            <div
                className="relative z-[201] w-full max-w-sm bg-tryst-card border-l border-tryst-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 h-full pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-tryst-border shrink-0">
                    <h3 className="font-playfair text-lg text-ivory-100">Profile</h3>
                    <button
                        type="button"
                        aria-label="Close profile"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-100 hover:bg-tryst-bg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col items-center text-center mb-5">
                        <div className="orbit-profile-avatar">
                            <span className="orbit-profile-avatar-ring" />
                            <span className="orbit-profile-avatar-glow" />
                            <div className="orbit-profile-avatar-img">
                                <ProfileAvatar
                                    seed={partner.alias}
                                    src={partner.avatarUrl || photos[0]}
                                    size={120}
                                    className="w-full h-full"
                                />
                            </div>
                            {partner.isVerified && (
                                <span className="orbit-profile-verified" title="Verified">✓</span>
                            )}
                            <span className={`orbit-profile-status ${partner.isOnline ? 'is-online' : 'is-offline'}`} />
                        </div>

                        <h3 className="font-playfair text-2xl font-bold text-ivory-100 mt-4">
                            {partner.alias}{partner.age ? `, ${partner.age}` : ''}
                        </h3>
                        <p className="text-ivory-500 text-sm mt-0.5">
                            {[partner.city, archetype].filter(Boolean).join(' · ') || 'Nearby'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
                            {partner.city && (
                                <span className="flex items-center gap-1 text-gold-400 text-xs">
                                    <MapPin className="w-3 h-3" />
                                    {partner.city}{partner.country ? `, ${partner.country}` : ''}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-ivory-500">
                                <span className={`w-2 h-2 rounded-full ${partner.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                                {partner.isOnline ? 'Online now' : 'Offline'}
                            </span>
                            {partner.isVerified && (
                                <span className="flex items-center gap-1 text-xs text-crimson-300">
                                    <CheckCircle2 className="w-3 h-3" /> Verified
                                </span>
                            )}
                        </div>

                        {partner.profession && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tryst-bg border border-tryst-border">
                                <Briefcase className="w-3.5 h-3.5 text-ivory-400" />
                                <span className="text-ivory-300 text-xs font-medium">{partner.profession}</span>
                            </div>
                        )}

                        {partner.profileCompletion != null && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/30">
                                <Flame className="w-3.5 h-3.5 text-gold-300" />
                                <span className="text-gold-300 text-xs font-semibold">
                                    {partner.profileCompletion}% profile complete
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="text-ivory-400 text-sm mb-4 leading-relaxed text-center">
                        {partner.bio || 'No bio yet.'}
                    </p>

                    {(partner.gender || partner.orientation || partner.build) && (
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {partner.gender && (
                                <span className="px-3 py-1 rounded-full border border-tryst-border text-xs text-ivory-400 bg-tryst-bg/50">
                                    {partner.gender}
                                </span>
                            )}
                            {partner.orientation && (
                                <span className="px-3 py-1 rounded-full border border-tryst-border text-xs text-ivory-400 bg-tryst-bg/50">
                                    {partner.orientation}
                                </span>
                            )}
                            {partner.build && (
                                <span className="px-3 py-1 rounded-full border border-tryst-border text-xs text-ivory-400 bg-tryst-bg/50">
                                    {partner.build}
                                </span>
                            )}
                        </div>
                    )}

                    {tags.length > 0 && (
                        <>
                            <p className="text-ivory-500 text-xs uppercase tracking-wider text-center mb-2">Interests</p>
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {tags.map((t) => (
                                    <span
                                        key={t}
                                        className="px-3 py-1 rounded-full border border-crimson/30 text-xs text-crimson-200 bg-crimson/10"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}

                    {photos.length > 1 && (
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {photos.slice(0, 6).map((url, i) => (
                                <div key={`${url}-${i}`} className="aspect-square rounded-xl overflow-hidden border border-tryst-border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!canCall}
                            onClick={() => {
                                onClose()
                                onAudioCall?.()
                            }}
                            title={canCall ? 'Audio call' : 'Both must agree to call first'}
                            className="flex-1 py-3 border border-crimson/40 text-crimson-300 rounded-xl text-sm font-medium hover:bg-crimson/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            <Phone className="w-4 h-4" />
                            Audio
                        </button>
                        <button
                            type="button"
                            disabled={!canCall}
                            onClick={() => {
                                onClose()
                                onVideoCall?.()
                            }}
                            title={canCall ? 'Video call' : 'Both must agree to call first'}
                            className="flex-1 py-3 bg-crimson text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                            <Video className="w-4 h-4" />
                            Video
                        </button>
                    </div>
                    {!canCall && (
                        <p className="text-center text-ivory-600 text-xs mt-3">
                            Mutual call consent required before calling
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    )
}
