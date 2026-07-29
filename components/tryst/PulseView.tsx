'use client'

import { useState, useEffect, useMemo } from 'react'
import { Zap, Lock, Loader2, MapPin, Search, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePulseGlobe, usePulsePeople, usePulseConnect, type WorldPerson } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import ProfileAvatar from './ProfileAvatar'
import PulseEarthMap from './PulseEarthMap'

import { publicConfig } from '@/lib/config'

const API_BASE = publicConfig.apiOrigin

export default function PulseView() {
    const { data: globe, isLoading: globeLoading } = usePulseGlobe()
    const { data: people = [], isLoading: peopleLoading } = usePulsePeople()
    const { data: me } = useAuthUser()
    const connectMutation = usePulseConnect()

    const [region, setRegion] = useState<string | null>(null)
    const [viewer, setViewer] = useState<WorldPerson | null>(null)
    const [searchOpen, setSearchOpen] = useState(false)
    const [featured, setFeatured] = useState(0)
    const [flashId, setFlashId] = useState<string | null>(null)
    const [lastSent, setLastSent] = useState<{ id: string; alias: string } | null>(null)

    const cities = globe?.cities || []
    const isGold = me?.isGold || me?.isObsidian
    const feed = useMemo(() => [...people], [people])
    const list = region ? feed.filter(p => p.city === region) : feed
    const feat = feed[featured]

    useEffect(() => {
        if (viewer || !feed.length) return
        const t = setInterval(() => setFeatured(f => (f + 1) % feed.length), 4200)
        return () => clearInterval(t)
    }, [viewer, feed.length])

    const connect = (p: WorldPerson) => {
        if (!isGold) {
            setViewer(p)
            return
        }
        if (!p.id || p.pulseSent || connectMutation.isPending) return

        connectMutation.mutate(p.id, {
            onSuccess: () => {
                setFlashId(p.id)
                setLastSent({ id: p.id, alias: p.alias })
                window.setTimeout(() => setFlashId(null), 2500)
                if (viewer?.id === p.id) window.setTimeout(() => setViewer(null), 600)
            },
        })
    }

    const photoUrl = (p: WorldPerson) => {
        const url = p.avatarUrl
        return url ? (url.startsWith('http') ? url : `${API_BASE}${url}`) : null
    }

    const isConnecting = (id: string) =>
        connectMutation.isPending && connectMutation.variables === id

    if (globeLoading || peopleLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-24 page-transition">
            <div className="flex items-center justify-between px-4 py-4 animate-fade-in">
                <div>
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400">Pulse · Worldwide</p>
                    <h2 className="font-playfair text-xl text-ivory-100">Desire, live across the planet</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-gold-400 hover:border-gold/30 transition-all"
                        aria-label="Search locations"
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setRegion(null); if (feed[0]) setViewer(feed[0]) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-tryst-card border border-tryst-border text-xs text-ivory-300 hover:border-crimson/40 transition-colors">
                        <Zap className="w-3.5 h-3.5 text-crimson" fill="currentColor" /> Surprise me
                    </button>
                </div>
            </div>

            {lastSent && (
                <div className="mx-4 mb-3 tryst-card p-3 border-success/30 bg-success/5 flex items-center gap-3 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-ivory-100 font-medium">Connect sent to {lastSent.alias}</p>
                        <p className="text-xs text-ivory-500">They&apos;ll see it in notifications · waiting for reply</p>
                    </div>
                    <button type="button" onClick={() => setLastSent(null)} className="text-ivory-600 text-xs hover:text-ivory-400">Dismiss</button>
                </div>
            )}

            <PulseEarthMap
                cities={cities}
                totalActive={globe?.totalActive || 0}
                userCity={me?.city ?? undefined}
                selectedCity={region}
                onCitySelect={(city) => setRegion(city)}
                searchOpen={searchOpen}
                onSearchOpenChange={setSearchOpen}
            />

            {region && (
                <div className="mx-4 mb-3 animate-fade-in">
                    <div className="tryst-card p-3 flex items-center justify-between border-gold/30 bg-gold/5">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gold-400" />
                            <span className="font-playfair text-ivory-100">{region}</span>
                            <span className="text-ivory-500 text-xs">
                                · {list.length} {list.length === 1 ? 'person' : 'people'} nearby
                            </span>
                        </div>
                        <button onClick={() => setRegion(null)}
                            className="text-crimson-300 text-xs font-medium hover:underline px-2">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {feat && !viewer && (
                <div className="mx-4 mb-4 tryst-card p-4 border-crimson/20 animate-fade-in-up">
                    <p className="font-mono text-[9px] text-gold-400 mb-2">LIVE PROMPT</p>
                    <p className="text-ivory-200 text-sm italic mb-3">&ldquo;{feat.prompt}&rdquo;</p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${feat.online ? 'bg-success animate-pulse' : 'bg-ivory-600'}`} />
                            <span className="text-ivory-400 text-xs">{feat.alias} · {feat.city}</span>
                        </div>
                        <button onClick={() => setViewer(feat)} className="text-crimson-300 text-xs font-medium">Watch →</button>
                    </div>
                </div>
            )}

            <div className="px-4 space-y-3">
                {list.map((p, i) => {
                    const sent = Boolean(p.pulseSent)
                    const flashing = flashId === p.id

                    return (
                        <div
                            key={p.id}
                            className={`tryst-card p-4 flex gap-3 items-start animate-fade-in transition-all duration-500 ${
                                flashing ? 'border-success/50 bg-success/5 ring-1 ring-success/30' : ''
                            }`}
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className="relative">
                                {photoUrl(p) ? (
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-tryst-border">
                                        <Image src={photoUrl(p)!} alt={p.alias} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                    </div>
                                ) : (
                                    <ProfileAvatar seed={p.alias} size={48} />
                                )}
                                {p.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-tryst-card" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-ivory-200 font-medium text-sm">{p.alias}</span>
                                    <span className="text-ivory-600 text-xs">{p.city}</span>
                                </div>
                                <p className="text-gold-400/80 text-xs mt-0.5">{p.tag}</p>
                                <p className="text-ivory-400 text-sm mt-2 italic">&ldquo;{p.prompt}&rdquo;</p>
                                {sent && (
                                    <p className="text-success/80 text-[10px] mt-2 font-mono uppercase tracking-wider">
                                        Request sent · awaiting reply
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                disabled={isConnecting(p.id) || sent}
                                onClick={() => connect(p)}
                                className={`flex-shrink-0 min-w-[4.75rem] px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                    sent ? 'bg-success/20 text-success cursor-default' :
                                    isGold ? 'bg-crimson text-white hover:shadow-crimson disabled:opacity-70' : 'bg-gold/10 text-gold-400 border border-gold/30'
                                }`}
                            >
                                {isConnecting(p.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : sent ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Sent
                                    </>
                                ) : isGold ? (
                                    'Connect'
                                ) : (
                                    <Lock className="w-3 h-3" />
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>

            {!isGold && (
                <div className="mx-4 mt-4 text-center">
                    <Link href="/gold" className="text-gold-400 text-sm hover:underline">Gold members can send connect requests worldwide</Link>
                </div>
            )}

            {viewer && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setViewer(null)}>
                    <div className="bg-tryst-card border border-tryst-border rounded-2xl p-6 max-w-sm w-full match-animate" onClick={e => e.stopPropagation()}>
                        <ProfileAvatar seed={viewer.alias} src={photoUrl(viewer)} size={80} className="mx-auto mb-4 border-2 border-crimson" />
                        <h3 className="font-playfair text-xl text-center text-ivory-100">{viewer.alias}</h3>
                        <p className="text-ivory-500 text-sm text-center mb-4">{viewer.city}, {viewer.country}</p>
                        <p className="text-ivory-300 text-center italic mb-6">&ldquo;{viewer.prompt}&rdquo;</p>
                        {isGold ? (
                            viewer.pulseSent ? (
                                <div className="text-center py-3 rounded-xl bg-success/10 border border-success/30">
                                    <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                                    <p className="text-success text-sm font-medium">Request already sent</p>
                                    <p className="text-ivory-500 text-xs mt-1">Waiting for {viewer.alias} to respond</p>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isConnecting(viewer.id)}
                                    onClick={() => connect(viewer)}
                                    className="w-full py-3 bg-crimson-gradient text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isConnecting(viewer.id) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Send connect request
                                </button>
                            )
                        ) : (
                            <Link href="/gold" className="block w-full py-3 bg-gold-gradient text-black text-center rounded-xl font-bold">
                                Unlock with Gold
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
