'use client'

import { useRef, useState, useCallback } from 'react'
import { Flame, Heart, Filter, Loader2, X, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useOrbitFeed, useOrbitPull, useOrbitIgnite, type OrbitProfile } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useAppStore } from '@/lib/store/useAppStore'
import { userApi } from '@/lib/api/auth'
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
            {profile.isOnline !== false ? (
                <div className="absolute top-0.5 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-tryst-bg" title="Online" />
            ) : (
                <div className="absolute top-0.5 right-0 w-3 h-3 bg-red-500/80 rounded-full border-2 border-tryst-bg" title="Offline" />
            )}
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
    const [showFilters, setShowFilters] = useState(false)
    const [rotation, setRotation] = useState(0)
    const dragRef = useRef<{ active: boolean; startX: number; startRot: number }>({ active: false, startX: 0, startRot: 0 })
    const [prefs, setPrefs] = useState({ seeking: 'Everyone', ageMin: 18, ageMax: 60, distance: 50 })

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
                    <button onClick={() => setShowFilters(true)} className="w-9 h-9 rounded-full border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 bg-tryst-card border border-tryst-border rounded-full px-3 py-1.5 text-xs text-ivory-400">
                        <Heart className="w-3 h-3 text-crimson-300" /> {isGold ? '∞' : '15/day'}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5 text-xs text-gold-400">
                        <Flame className="w-3 h-3" /> {isGold ? '∞' : 'Ignites'}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-ivory-500 mb-4">
                <Filter className="w-3 h-3" />
                <span>
                    {me?.seeking || prefs.seeking} · {me?.agePrefMin || prefs.ageMin}–{me?.agePrefMax || prefs.ageMax} · {(me?.maxDistanceKm || prefs.distance) >= 100 ? 'worldwide' : `${me?.maxDistanceKm || prefs.distance} km`}
                </span>
            </div>

            <p className="text-ivory-600 text-xs mb-2 text-center">Drag to spin the orbit · tap profile to inspect · hold to pull · double-tap to ignite</p>

            <div
                className="relative h-[420px] mx-auto touch-none select-none"
                style={{ perspective: '800px' }}
                onPointerDown={(e) => {
                    setFrozen(true)
                    dragRef.current = { active: true, startX: e.clientX, startRot: rotation }
                }}
                onPointerMove={(e) => {
                    if (!dragRef.current.active) return
                    const delta = e.clientX - dragRef.current.startX
                    setRotation(dragRef.current.startRot + delta * 0.4)
                }}
                onPointerUp={() => { dragRef.current.active = false; setTimeout(() => setFrozen(false), 350) }}
                onPointerLeave={() => { dragRef.current.active = false }}
            >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-tryst-card border border-crimson/30 flex items-center justify-center z-10 shadow-[0_0_30px_rgba(192,57,43,0.2)]">
                    <ProfileAvatar seed={me?.alias || 'You'} src={me?.avatarUrl} size={56} />
                </div>
                <div style={{ transform: `rotateY(${rotation}deg)`, transformStyle: 'preserve-3d', animationPlayState: frozen ? 'paused' : 'running' }}>
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
                <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-tryst-card border-l border-tryst-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-tryst-border">
                        <h3 className="font-playfair text-lg text-ivory-100">Profile</h3>
                        <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full border border-tryst-border flex items-center justify-center text-ivory-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex gap-4 mb-4">
                            <ProfileAvatar seed={selected.alias} src={selected.avatarUrl} size={80} />
                            <div>
                                <h3 className="font-playfair text-xl font-bold text-ivory-100">{selected.alias}, {selected.age}</h3>
                                <p className="text-ivory-500 text-sm">{selected.city} · {ARCHETYPES[selected.desireArchetype] || selected.desireArchetype}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${selected.isOnline !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="text-xs text-ivory-500">{selected.isOnline !== false ? 'Online now' : 'Offline'}</span>
                                </div>
                                <p className="text-crimson-300 text-sm mt-1">{selected.matchScore}% DesireIQ</p>
                            </div>
                        </div>
                        <p className="text-ivory-400 text-sm mb-4">{selected.bio || 'No bio yet.'}</p>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {(selected.desireTags || []).map(t => (
                                <span key={t} className="px-2 py-1 rounded-full border border-tryst-border text-xs text-ivory-400">{t}</span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => doPull(selected)}
                                className="flex-1 py-2.5 border border-crimson/40 text-crimson-300 rounded-xl text-sm">Pull</button>
                            <button onClick={() => doIgnite(selected)}
                                className="flex-1 py-2.5 bg-gold-gradient text-black font-semibold rounded-xl text-sm">Ignite</button>
                        </div>
                        {!isGold && (
                            <Link href="/gold" className="block text-center text-gold-400 text-xs mt-3 hover:underline">Upgrade for unlimited sparks</Link>
                        )}
                    </div>
                </div>
            )}

            {showFilters && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowFilters(false)}>
                    <div className="bg-tryst-card border border-tryst-border rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="font-playfair text-xl text-ivory-100 mb-4">Orbit filters</h3>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Looking for</label>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {['Women', 'Men', 'Everyone'].map(s => (
                                <button key={s} onClick={() => setPrefs(p => ({ ...p, seeking: s }))}
                                    className={`py-2 rounded-lg border text-sm ${prefs.seeking === s ? 'border-crimson bg-crimson/10 text-crimson-300' : 'border-tryst-border text-ivory-400'}`}>{s}</button>
                            ))}
                        </div>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Age {prefs.ageMin}–{prefs.ageMax}</label>
                        <div className="flex gap-3 mb-4">
                            <input type="range" min={18} max={60} value={prefs.ageMin} onChange={e => setPrefs(p => ({ ...p, ageMin: +e.target.value }))} className="flex-1" />
                            <input type="range" min={18} max={60} value={prefs.ageMax} onChange={e => setPrefs(p => ({ ...p, ageMax: +e.target.value }))} className="flex-1" />
                        </div>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Distance {prefs.distance} km</label>
                        <input type="range" min={5} max={200} value={prefs.distance} onChange={e => setPrefs(p => ({ ...p, distance: +e.target.value }))} className="w-full mb-6" />
                        <button onClick={async () => {
                            await userApi.updateProfile({
                                seeking: prefs.seeking,
                                agePrefMin: prefs.ageMin,
                                agePrefMax: prefs.ageMax,
                                maxDistanceKm: prefs.distance,
                            })
                            setShowFilters(false)
                        }} className="w-full py-3 bg-crimson-gradient text-white rounded-xl font-medium">Apply filters</button>
                    </div>
                </div>
            )}
        </div>
    )
}
