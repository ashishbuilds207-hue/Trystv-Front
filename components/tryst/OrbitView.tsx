'use client'

import { useRef, useState, useCallback } from 'react'
import { Flame, Heart, Filter, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useOrbitFeed, useOrbitPull, useOrbitIgnite, type OrbitProfile } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useAppStore } from '@/lib/store/useAppStore'
import ProfileAvatar from './ProfileAvatar'

const ARCHETYPES: Record<string, string> = {
    WANDERER: 'Wanderer', FLAME: 'Flame', GHOST: 'Ghost', SPARK: 'Spark', STORY: 'Story',
}

function OrbitNode({ profile, size, onPull, onIgnite, onTap, pulled, fx }: {
    profile: OrbitProfile; size: number
    onPull: () => void; onIgnite: () => void; onTap: () => void
    pulled: boolean; fx: 'pull' | 'ignite' | null
}) {
    const hold = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false })
    const tap = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null; pid: string | null }>({ count: 0, timer: null, pid: null })

    const handlers = {
        onPointerDown: (e: React.PointerEvent) => {
            e.stopPropagation()
            hold.current.fired = false
            hold.current.timer = setTimeout(() => { hold.current.fired = true; onPull() }, 600)
        },
        onPointerUp: (e: React.PointerEvent) => {
            e.stopPropagation()
            if (hold.current.timer) clearTimeout(hold.current.timer)
            if (hold.current.fired) return
            if (tap.current.pid !== profile.id) { tap.current.count = 0; tap.current.pid = profile.id }
            tap.current.count++
            if (tap.current.timer) clearTimeout(tap.current.timer)
            if (tap.current.count >= 2) { tap.current.count = 0; onIgnite() }
            else tap.current.timer = setTimeout(() => { tap.current.count = 0; onTap() }, 250)
        },
        onPointerLeave: () => { if (hold.current.timer) clearTimeout(hold.current.timer) },
    }

    return (
        <div {...handlers} className="relative cursor-pointer touch-none" style={{ width: size, height: size }}>
            {pulled && <div className="absolute -inset-1 rounded-full border-2 border-crimson-400" />}
            <div className={`w-full h-full rounded-full overflow-hidden border-2 ${profile.isVerified ? 'border-gold/70' : 'border-tryst-card'}`}>
                <ProfileAvatar seed={profile.alias} src={profile.avatarUrl || profile.photoUrls?.[0]} size={size} />
            </div>
            {profile.isOnline && <div className="absolute top-1 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-tryst-bg" />}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-playfair text-[10px] text-ivory-500 whitespace-nowrap">{profile.alias}</div>
            {fx === 'pull' && <div className="absolute -inset-2 rounded-full border-2 border-crimson animate-pulse-ring" />}
            {fx === 'ignite' && <Flame className="absolute inset-0 m-auto w-6 h-6 text-gold animate-flame-up" />}
        </div>
    )
}

function OrbitRing({ items, radius, duration, reverse, size, pulled, fx, onPull, onIgnite, onTap }: {
    items: OrbitProfile[]; radius: number; duration: number; reverse?: boolean; size: number
    pulled: Record<string, boolean>; fx: { pid: string; type: 'pull' | 'ignite' } | null
    onPull: (p: OrbitProfile) => void; onIgnite: (p: OrbitProfile) => void; onTap: (p: OrbitProfile) => void
}) {
    const spinClass = reverse ? 'animate-orbit-spin-r' : 'animate-orbit-spin'
    const counterClass = reverse ? 'animate-orbit-spin' : 'animate-orbit-spin-r'

    return (
        <div className={`absolute left-1/2 top-1/2 w-0 h-0 ${spinClass}`} style={{ animationDuration: `${duration}s` }}>
            <div className="absolute rounded-full border border-tryst-border/60" style={{
                left: -radius, top: -radius, width: radius * 2, height: radius * 2,
            }} />
            {items.map((p, i) => {
                const angle = (i / items.length) * 360
                return (
                    <div key={p.id} className="absolute" style={{ transform: `rotate(${angle}deg) translate(${radius}px)` }}>
                        <div className={`${counterClass}`} style={{ transform: 'translate(-50%,-50%)', animationDuration: `${duration}s` }}>
                            <OrbitNode
                                profile={p} size={size}
                                pulled={!!pulled[p.id]}
                                fx={fx?.pid === p.id ? fx.type : null}
                                onPull={() => onPull(p)}
                                onIgnite={() => onIgnite(p)}
                                onTap={() => onTap(p)}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default function OrbitView() {
    const { data: profiles = [], isLoading } = useOrbitFeed()
    const pullMut = useOrbitPull()
    const igniteMut = useOrbitIgnite()
    const { data: me } = useAuthUser()
    const { isNightMode } = useAppStore()

    const [frozen, setFrozen] = useState(false)
    const [pulled, setPulled] = useState<Record<string, boolean>>({})
    const [fx, setFx] = useState<{ pid: string; type: 'pull' | 'ignite' } | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [selected, setSelected] = useState<OrbitProfile | null>(null)

    const isGold = me?.isGold
    const ring1 = profiles.filter(p => p.ring === 1).slice(0, 3)
    const ring2 = profiles.filter(p => p.ring === 2).slice(0, 4)
    const baseDur = isNightMode ? [70, 96] : [120, 150]

    const flash = useCallback((msg: string, gold = false) => {
        setToast(msg)
        setTimeout(() => setToast(null), 1900)
    }, [])

    const doPull = async (p: OrbitProfile) => {
        if (pulled[p.id]) { flash(`Already interested in ${p.alias}`); return }
        setFx({ pid: p.id, type: 'pull' })
        setTimeout(() => setFx(null), 900)
        setPulled(s => ({ ...s, [p.id]: true }))
        try {
            const { data } = await pullMut.mutateAsync(p.id)
            flash(data.data.simmer ? `Simmer with ${p.alias}!` : `Quiet interest sent to ${p.alias}`)
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number; data?: { message?: string } } }
            if (ax.response?.status === 402) {
                flash('Daily limit reached — upgrade to Gold')
            } else flash('Could not send interest')
        }
    }

    const doIgnite = async (p: OrbitProfile) => {
        setFx({ pid: p.id, type: 'ignite' })
        setTimeout(() => setFx(null), 900)
        try { await igniteMut.mutateAsync(p.id) } catch (err: unknown) {
            const ax = err as { response?: { status?: number } }
            if (ax.response?.status === 402) flash('Daily limit reached — upgrade to Gold', true)
            else flash('Spark failed')
        }
    }

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-24 page-transition">
            <div className="flex items-center justify-between py-4">
                <div>
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400">Spark Orbits</p>
                    <h2 className="font-playfair text-xl text-ivory-100">Tonight in {me?.city || 'your city'}</h2>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 bg-tryst-card border border-tryst-border rounded-full px-3 py-1.5 text-xs text-ivory-400">
                        <Heart className="w-3 h-3" /> {isGold ? '∞' : '3'}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5 text-xs text-gold-400">
                        <Flame className="w-3 h-3" /> {isGold ? '∞' : '1'}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-ivory-500 mb-4">
                <Filter className="w-3 h-3" />
                <span>
                    {me?.seeking || 'Everyone'} · {me?.agePrefMin || 18}–{me?.agePrefMax || 50} · {(me?.maxDistanceKm || 50) >= 100 ? 'worldwide' : `${me?.maxDistanceKm || 50} km`}
                </span>
            </div>

            <div className="relative h-[420px] mx-auto" onPointerDown={() => setFrozen(true)} onPointerUp={() => setTimeout(() => setFrozen(false), 350)}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-tryst-card border border-crimson/30 flex items-center justify-center z-10">
                    <ProfileAvatar seed={me?.alias || 'You'} src={me?.avatarUrl} size={56} />
                </div>
                <div style={{ animationPlayState: frozen ? 'paused' : 'running' }}>
                    <OrbitRing items={ring1} radius={100} duration={baseDur[0]} size={52} pulled={pulled} fx={fx}
                        onPull={doPull} onIgnite={doIgnite} onTap={setSelected} />
                    <OrbitRing items={ring2} radius={155} duration={baseDur[1]} reverse size={44} pulled={pulled} fx={fx}
                        onPull={doPull} onIgnite={doIgnite} onTap={setSelected} />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-ivory-500">
                <div className="tryst-card p-3"><span className="text-crimson-300 font-medium">Hold</span><br />Quiet interest</div>
                <div className="tryst-card p-3"><span className="text-gold-400 font-medium">Double-tap</span><br />Ignite spark</div>
                <div className="tryst-card p-3"><span className="text-ivory-300 font-medium">Tap</span><br />View profile</div>
            </div>

            {toast && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm z-50 shadow-card ${
                    toast.includes('Gold') ? 'bg-gold/20 border border-gold/40 text-gold-300' : 'bg-tryst-card border border-tryst-border text-ivory-200'
                }`}>
                    {toast}
                    {toast.includes('Gold') && (
                        <Link href="/gold" className="ml-2 underline font-medium">Upgrade</Link>
                    )}
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="bg-tryst-card border border-tryst-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-4 mb-4">
                            <ProfileAvatar seed={selected.alias} src={selected.avatarUrl} size={72} />
                            <div>
                                <h3 className="font-playfair text-xl text-ivory-100">{selected.alias}, {selected.age}</h3>
                                <p className="text-ivory-500 text-sm">{selected.city} · {ARCHETYPES[selected.desireArchetype] || selected.desireArchetype}</p>
                                <p className="text-crimson-300 text-sm mt-1">{selected.matchScore}% DesireIQ</p>
                            </div>
                        </div>
                        <p className="text-ivory-400 text-sm mb-4">{selected.bio || 'No bio yet.'}</p>
                        <div className="flex gap-2">
                            <button onClick={() => { doPull(selected); setSelected(null) }}
                                className="flex-1 py-2.5 border border-crimson/40 text-crimson-300 rounded-xl text-sm">Pull</button>
                            <button onClick={() => { doIgnite(selected); setSelected(null) }}
                                className="flex-1 py-2.5 bg-gold-gradient text-black font-semibold rounded-xl text-sm">Ignite</button>
                        </div>
                        {!isGold && (
                            <Link href="/gold" className="block text-center text-gold-400 text-xs mt-3 hover:underline">Upgrade for unlimited sparks</Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
