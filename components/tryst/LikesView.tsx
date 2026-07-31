'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Flame, X, Loader2, MapPin, MessageCircle, Sparkles, Crown } from 'lucide-react'
import { useLikes, useSwipe, type IncomingLike } from '@/lib/hooks/useDiscover'
import { useAuthUser } from '@/lib/hooks/useAuth'
import ProfileAvatar from './ProfileAvatar'
import { OnlineDot } from './OnlineStatus'

const ARCHETYPES: Record<string, string> = {
    WANDERER: 'Wanderer', FLAME: 'Flame', GHOST: 'Ghost', SPARK: 'Spark', STORY: 'Story',
}

export default function LikesView() {
    const { data: likes = [], isLoading } = useLikes()
    const { data: me } = useAuthUser()
    const swipe = useSwipe()
    const router = useRouter()

    const isGold = me?.isGold
    const [busy, setBusy] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

    const sparkBack = async (p: IncomingLike) => {
        setBusy(p.id)
        try {
            const { data } = await swipe.mutateAsync({ targetId: p.id, direction: p.isSuper ? 'super' : 'like' })
            if (data.data.matched && data.data.matchId) {
                flash(`It's a match with ${p.alias}!`)
                // Let party celebration play, then open chat
                setTimeout(() => router.push(`/chat?match=${data.data.matchId}`), 2200)
            } else {
                flash(`You sparked ${p.alias} back`)
            }
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number } }
            if (ax.response?.status === 402) flash('Daily like limit reached — upgrade to Gold')
            else flash('Could not spark back')
        } finally {
            setBusy(null)
        }
    }

    const pass = async (p: IncomingLike) => {
        setBusy(p.id)
        try {
            await swipe.mutateAsync({ targetId: p.id, direction: 'pass' })
            flash(`Passed on ${p.alias}`)
        } catch {
            flash('Could not pass')
        } finally {
            setBusy(null)
        }
    }

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-28 page-transition max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pt-4">
                <div>
                    <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold-400 mb-1">Your Likes</p>
                    <h2 className="font-playfair text-2xl sm:text-3xl text-ivory-100">
                        People who <span className="text-crimson-300">like you</span>
                    </h2>
                    <p className="text-ivory-500 text-xs mt-1">Spark back to match and start chatting.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-crimson/10 border border-crimson/30 rounded-full px-3 py-1.5 text-xs text-crimson-200 self-start">
                    <Heart className="w-3.5 h-3.5" fill="currentColor" /> {likes.length} {likes.length === 1 ? 'like' : 'likes'}
                </div>
            </div>

            {likes.length === 0 ? (
                <div className="tryst-card p-10 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center mb-4">
                        <Heart className="w-7 h-7 text-crimson-300" />
                    </div>
                    <p className="text-ivory-200 font-playfair text-lg">No likes yet</p>
                    <p className="text-ivory-500 text-sm mt-1">When someone pulls or ignites you, they&apos;ll show up here.</p>
                    <Link href="/orbits" className="inline-block mt-4 text-crimson-300 text-sm hover:underline">Explore orbits →</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {likes.map((p) => (
                        <div key={p.id} className="tryst-card p-4 flex flex-col">
                            <div className="flex gap-3">
                                <div className="relative flex-shrink-0">
                                    <div className={`rounded-full p-0.5 ${p.isSuper ? 'bg-gold-gradient' : 'border-2 border-crimson/40'}`}>
                                        <ProfileAvatar seed={p.alias} src={p.avatarUrl} size={64} className="!rounded-full" />
                                    </div>
                                    {p.isSuper && (
                                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center" title="Super like">
                                            <Sparkles className="w-3.5 h-3.5 text-black" />
                                        </span>
                                    )}
                                    <OnlineDot online={!!p.isOnline} size="md" className="absolute bottom-0 right-0" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-playfair text-lg text-ivory-100 truncate">{p.alias}, {p.age}</h3>
                                        {p.isVerified && <span className="text-gold-400 text-xs">✓</span>}
                                    </div>
                                    <p className="text-ivory-500 text-xs">
                                        {p.city}{p.desireArchetype ? ` · ${ARCHETYPES[p.desireArchetype] || p.desireArchetype}` : ''}
                                    </p>
                                    <p className={`text-[11px] mt-0.5 font-medium ${p.isOnline ? 'text-emerald-400' : 'text-ivory-600'}`}>
                                        {p.isOnline ? 'Online now' : 'Offline'}
                                    </p>
                                    {p.distanceKm != null && (
                                        <p className="flex items-center gap-1 text-gold-400 text-xs mt-1">
                                            <MapPin className="w-3 h-3" /> {p.distanceKm < 1 ? 'Less than 1' : Math.round(p.distanceKm)} km away
                                        </p>
                                    )}
                                    {p.isSuper && <p className="text-gold-400 text-xs mt-1 font-medium">Ignited you</p>}
                                </div>
                            </div>

                            {p.bio && <p className="text-ivory-400 text-sm mt-3 line-clamp-2">{p.bio}</p>}

                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {(p.desireTags || []).slice(0, 3).map(t => (
                                    <span key={t} className="px-2 py-0.5 rounded-full border border-tryst-border text-[11px] text-ivory-400 bg-tryst-bg/50">{t}</span>
                                ))}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => pass(p)}
                                    disabled={busy === p.id}
                                    className="flex-1 py-2.5 rounded-xl border border-tryst-border text-ivory-400 text-sm font-medium hover:bg-tryst-bg/60 hover:text-ivory-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" /> Pass
                                </button>
                                <button
                                    onClick={() => sparkBack(p)}
                                    disabled={busy === p.id}
                                    className="flex-1 py-2.5 rounded-xl bg-crimson-gradient text-white text-sm font-semibold hover:shadow-crimson transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {busy === p.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <><Flame className="w-4 h-4" /> Spark back</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isGold && likes.length > 0 && (
                <Link href="/gold" className="mt-6 tryst-card p-4 flex items-center gap-3 border-gold/30 bg-gold/5 hover:border-gold/50 transition-colors">
                    <Crown className="w-5 h-5 text-gold-400" />
                    <div className="flex-1">
                        <p className="text-gold-400 font-medium text-sm">Spark back without limits</p>
                        <p className="text-ivory-500 text-xs">Gold gives you unlimited likes &amp; instant matches</p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-gold-400" />
                </Link>
            )}

            {toast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm z-50 shadow-card backdrop-blur-md bg-tryst-card/95 border border-tryst-border text-ivory-200">
                    {toast}
                </div>
            )}
        </div>
    )
}
