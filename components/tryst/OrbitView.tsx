'use client'

import { useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Flame, Heart, Filter, Loader2, X, UserCircle, ImageIcon, SlidersHorizontal, Navigation, Globe, MapPin, Hand, MousePointerClick, HelpCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useOrbitFeed, useOrbitPull, useOrbitIgnite, type OrbitProfile } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useUpdateLocation } from '@/lib/hooks/useGeoLocation'
import { useAppStore } from '@/lib/store/useAppStore'
import { userApi } from '@/lib/api/auth'
import { useQueryClient } from '@tanstack/react-query'
import ProfileAvatar from './ProfileAvatar'
import OrbitSpark from './OrbitSpark'

const ARCHETYPES: Record<string, string> = {
    WANDERER: 'Wanderer', FLAME: 'Flame', GHOST: 'Ghost', SPARK: 'Spark', STORY: 'Story',
}

export default function OrbitView() {
    const { data: profiles = [], isLoading } = useOrbitFeed()
    const pullMut = useOrbitPull()
    const igniteMut = useOrbitIgnite()
    const { data: me } = useAuthUser()
    const updateLocation = useUpdateLocation()
    const qc = useQueryClient()
    const { isNightMode, orbitAvatarMode, toggleOrbitAvatarMode, orbitGuideOpen, setOrbitGuideOpen } = useAppStore()

    const { data: completionData } = useQuery({
        queryKey: ['profile-completion'],
        queryFn: async () => {
            const { data: res } = await userApi.getProfileCompletion()
            return res.data as {
                dailyLikes: { remaining: number; limit: number; isGold: boolean }
            }
        },
        staleTime: 20 * 1000,
    })

    const dailyLikes = completionData?.dailyLikes
    const likesLabel = dailyLikes?.isGold ? '∞' : String(dailyLikes?.remaining ?? '—')
    const heartsLabel = likesLabel

    const [pulled, setPulled] = useState<Record<string, boolean>>({})
    const [fx, setFx] = useState<{ pid: string; type: 'pull' | 'ignite' } | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [toastGold, setToastGold] = useState(false)
    const [selected, setSelected] = useState<OrbitProfile | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [activeGesture, setActiveGesture] = useState<'hold' | 'double' | 'tap'>('tap')
    const [prefs, setPrefs] = useState({ seeking: 'Everyone', ageMin: 18, ageMax: 60, distance: 50 })
    const [applying, setApplying] = useState(false)

    const isGold = me?.isGold
    const visible = profiles.slice(0, 20)
    const maxDistanceKm = me?.maxDistanceKm ?? 50

    const flash = useCallback((msg: string, gold = false) => {
        setToast(msg)
        setToastGold(gold)
        setTimeout(() => { setToast(null); setToastGold(false) }, 1900)
    }, [])

    const closeProfile = useCallback(() => setSelected(null), [])

    const openProfile = useCallback((p: OrbitProfile) => setSelected(p), [])

    // Keep open profile's online dot in sync with the presence socket
    const selectedLive = useMemo(() => {
        if (!selected) return null
        const live = profiles.find((p) => p.id === selected.id)
        if (!live) return selected
        return { ...selected, isOnline: live.isOnline }
    }, [selected, profiles])

    const doPull = async (p: OrbitProfile) => {
        if (pulled[p.id]) { flash(`Already showing interest in ${p.alias}`); closeProfile(); return }
        setFx({ pid: p.id, type: 'pull' })
        setTimeout(() => setFx(null), 900)
        setPulled(s => ({ ...s, [p.id]: true }))
        try {
            const { data } = await pullMut.mutateAsync(p.id)
            qc.invalidateQueries({ queryKey: ['profile-completion'] })
            flash(data.data.simmer ? `Simmer with ${p.alias}!` : `Quiet interest sent to ${p.alias}`)
            closeProfile()
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number } }
            setPulled(s => { const n = { ...s }; delete n[p.id]; return n })
            if (ax.response?.status === 402) flash('Out of Likes today — upgrade to Gold', true)
            else flash('Could not send Like')
            closeProfile()
        }
    }

    const doIgnite = async (p: OrbitProfile) => {
        setFx({ pid: p.id, type: 'ignite' })
        setTimeout(() => setFx(null), 900)
        try {
            await igniteMut.mutateAsync(p.id)
            qc.invalidateQueries({ queryKey: ['profile-completion'] })
            flash(`Spark sent to ${p.alias} · they're notified`, true)
            closeProfile()
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number } }
            if (ax.response?.status === 402) flash('Out of Hearts today — upgrade to Gold', true)
            else flash('Heart failed')
            closeProfile()
        }
    }

    const openFilters = () => {
        setPrefs({
            seeking: me?.seeking || 'Everyone',
            ageMin: me?.agePrefMin ?? 18,
            ageMax: me?.agePrefMax ?? 60,
            distance: me?.maxDistanceKm ?? 50,
        })
        setShowFilters(true)
    }

    const useMyLocation = async () => {
        try {
            const loc = await updateLocation.mutateAsync()
            flash(loc.city ? `Location set · ${loc.city}` : 'Location updated — showing people near you')
        } catch {
            flash('Could not get your location — allow access in your browser')
        }
    }

    const hasLocation = !!me?.hasLocation

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    const orbitTheme = isNightMode ? 'dark' : 'light'
    const filterLabel = `${me?.seeking || prefs.seeking} · ${me?.agePrefMin || prefs.ageMin}–${me?.agePrefMax || prefs.ageMax} · ${(me?.maxDistanceKm || prefs.distance) >= 100 ? 'worldwide' : `${me?.maxDistanceKm || prefs.distance} km`}`

    return (
        <div className={`page-content pb-28 page-transition max-w-3xl mx-auto orbit-cosmic-shell ${orbitTheme === 'light' ? 'orbit-cosmic-shell--light' : ''}`}>
            <div>
                <header className="orbit-cosmic-header px-[18px] pt-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-crimson-300 mb-0.5">Spark Orbits</p>
                            <h2 className="font-playfair text-xl sm:text-2xl text-tryst-text leading-tight truncate">
                                Tonight in {me?.city || 'your city'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="orbit-cosmic-pill" title="Daily Likes remaining">
                                <Heart className="w-3.5 h-3.5 text-crimson-300" />
                                <span className="font-mono text-xs">{likesLabel}</span>
                            </div>
                            <div className="orbit-cosmic-pill orbit-cosmic-pill--gold" title="Daily Hearts remaining">
                                <Flame className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                                <span className="font-mono text-xs">{heartsLabel}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <section className={`orbit-cosmic-card orbit-cosmic-card--immersive mt-3 ${orbitTheme === 'light' ? 'orbit-cosmic-card--light' : ''}`}>
                    <div className="orbit-cosmic-toolbar">
                        <button
                            onClick={openFilters}
                            className="orbit-cosmic-filter flex-1 flex items-center gap-2 min-w-0"
                        >
                            <Filter className="w-3.5 h-3.5 text-crimson-300 shrink-0" />
                            <span className="truncate text-xs sm:text-sm text-tryst-muted">{filterLabel}</span>
                            <SlidersHorizontal className="w-4 h-4 text-crimson-300/70 shrink-0 ml-auto" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleOrbitAvatarMode}
                            className={`orbit-cosmic-avatar-btn shrink-0 flex items-center gap-1.5 ${orbitAvatarMode ? 'orbit-cosmic-avatar-btn--active' : ''}`}
                            aria-pressed={orbitAvatarMode}
                            title="Photos / Avatars"
                        >
                            {orbitAvatarMode ? <UserCircle className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                            <span className="font-mono text-[9px] tracking-wider">{orbitAvatarMode ? 'AVATAR' : 'PHOTO'}</span>
                        </button>
                    </div>

                    <div className="orbit-cosmic-viewport orbit-cosmic-viewport--spark touch-none select-none">
                        <OrbitSpark
                            profiles={visible}
                            meAlias={me?.alias || 'You'}
                            meAvatarUrl={me?.avatarUrl}
                            meCity={me?.city}
                            maxDist={maxDistanceKm}
                            pulled={pulled}
                            fx={fx}
                            avatarMode={orbitAvatarMode}
                            night={isNightMode}
                            onPull={doPull}
                            onIgnite={doIgnite}
                            onTap={openProfile}
                        />

                        {visible.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="text-center px-8 tryst-card rounded-2xl py-5 shadow-card max-w-xs backdrop-blur-md border-crimson/25">
                                    <p className="text-tryst-text text-sm font-medium">No souls in your orbit yet</p>
                                    <p className="text-tryst-muted text-xs mt-2 leading-relaxed">
                                        Widen filters, set your location, or check back later.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => qc.invalidateQueries({ queryKey: ['orbit-feed'] })}
                                        className="mt-3 text-xs font-semibold text-gold-400 hover:underline pointer-events-auto"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="orbit-cosmic-hint flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-tryst-muted">
                        <span><Hand className="inline w-3 h-3" /> hold · like</span>
                        <span><Flame className="inline w-3 h-3" /> double · heart</span>
                        <span><MousePointerClick className="inline w-3 h-3" /> tap · profile</span>
                        <span className="orbit-cosmic-hint--drag">↺ drag to turn the orbit</span>
                    </div>

                    <div className="orbit-how-it-works px-4 pb-3">
                        <button
                            type="button"
                            className="orbit-how-it-works-pill"
                            onClick={() => setOrbitGuideOpen(!orbitGuideOpen)}
                            aria-expanded={orbitGuideOpen}
                        >
                            <HelpCircle className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span>How it works</span>
                            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${orbitGuideOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {orbitGuideOpen && (
                            <div className="orbit-how-it-works-body">
                                <p><strong>You</strong> are at the center. Others orbit around you by match and distance.</p>
                                <ul>
                                    <li><Hand className="inline w-3.5 h-3.5" /> <strong>Hold</strong> someone → send a Like</li>
                                    <li><Flame className="inline w-3.5 h-3.5" /> <strong>Double-tap</strong> → send a Heart</li>
                                    <li><MousePointerClick className="inline w-3.5 h-3.5" /> <strong>Tap</strong> → open profile</li>
                                    <li>↺ Drag to rotate the orbit and explore</li>
                                </ul>
                                <p className="text-xs opacity-70">Green dot = online · gray dot = offline</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className={`orbit-cosmic-gestures grid grid-cols-1 sm:grid-cols-3 gap-3 pb-28 ${orbitTheme === 'light' ? 'orbit-cosmic-gestures--light' : ''}`}>
                    <button
                        type="button"
                        onClick={() => setActiveGesture('hold')}
                        aria-pressed={activeGesture === 'hold'}
                        className={`orbit-gesture-card orbit-gesture-card--hold ${activeGesture === 'hold' ? 'orbit-gesture-card--active' : ''}`}
                    >
                        <Hand className="orbit-gesture-card__icon" />
                        <p className="orbit-gesture-card__title">Hold</p>
                        <p className="orbit-gesture-card__sub">Send a Like</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveGesture('double')}
                        aria-pressed={activeGesture === 'double'}
                        className={`orbit-gesture-card orbit-gesture-card--double ${activeGesture === 'double' ? 'orbit-gesture-card--active' : ''}`}
                    >
                        <Flame className="orbit-gesture-card__icon orbit-gesture-card__icon--fill" />
                        <p className="orbit-gesture-card__title">Double-tap</p>
                        <p className="orbit-gesture-card__sub">Send a Heart</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveGesture('tap')}
                        aria-pressed={activeGesture === 'tap'}
                        className={`orbit-gesture-card orbit-gesture-card--tap ${activeGesture === 'tap' ? 'orbit-gesture-card--active' : ''}`}
                    >
                        <MousePointerClick className="orbit-gesture-card__icon" />
                        <p className="orbit-gesture-card__title">Tap</p>
                        <p className="orbit-gesture-card__sub">View full profile</p>
                    </button>
                </section>
            </div>

            {toast && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm z-50 shadow-card backdrop-blur-md whitespace-nowrap ${
                    toastGold ? 'bg-gold/20 border border-gold/40 text-gold-300' : 'bg-tryst-card/95 border border-tryst-border text-ivory-200'
                }`}>
                    {toast}
                    {toast.includes('Gold') && (
                        <Link href="/gold" className="ml-2 underline font-medium">Upgrade</Link>
                    )}
                </div>
            )}

            {selectedLive && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        aria-label="Close profile backdrop"
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm border-0 cursor-pointer"
                        onClick={closeProfile}
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
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    closeProfile()
                                }}
                                className="relative z-[202] w-9 h-9 rounded-full border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-100 hover:bg-tryst-bg transition-colors"
                            >
                                <X className="w-4 h-4 pointer-events-none" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex flex-col items-center text-center mb-5">
                                <div className="orbit-profile-avatar">
                                    <span className="orbit-profile-avatar-ring" />
                                    <span className="orbit-profile-avatar-glow" />
                                    <div className="orbit-profile-avatar-img">
                                        <ProfileAvatar seed={selectedLive.alias} src={selectedLive.avatarUrl} size={120} className="w-full h-full" />
                                    </div>
                                    {selectedLive.isVerified && (
                                        <span className="orbit-profile-verified" title="Verified">✓</span>
                                    )}
                                    <span className={`orbit-profile-status ${selectedLive.isOnline ? 'is-online' : 'is-offline'}`} />
                                </div>
                                <h3 className="font-playfair text-2xl font-bold text-ivory-100 mt-4">{selectedLive.alias}, {selectedLive.age}</h3>
                                <p className="text-ivory-500 text-sm mt-0.5">{selectedLive.city} · {ARCHETYPES[selectedLive.desireArchetype] || selectedLive.desireArchetype}</p>
                                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
                                    {selectedLive.distanceKm != null && (
                                        <span className="flex items-center gap-1 text-gold-400 text-xs">
                                            <MapPin className="w-3 h-3" /> {selectedLive.distanceKm < 1 ? 'Less than 1' : Math.round(selectedLive.distanceKm)} km away
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 text-xs text-ivory-500">
                                        <span className={`w-2 h-2 rounded-full ${selectedLive.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                                        {selectedLive.isOnline ? 'Online now' : 'Offline'}
                                    </span>
                                </div>
                                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson/10 border border-crimson/30">
                                    <Flame className="w-3.5 h-3.5 text-crimson-300" />
                                    <span className="text-crimson-200 text-xs font-semibold">{selectedLive.matchScore}% DesireIQ</span>
                                </div>
                                {selectedLive.profileCompletion != null && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/30">
                                        <span className="text-gold-300 text-xs font-semibold">{selectedLive.profileCompletion}% profile complete</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-ivory-400 text-sm mb-4 leading-relaxed text-center">{selectedLive.bio || 'No bio yet.'}</p>
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {(selectedLive.desireTags || []).map(t => (
                                    <span key={t} className="px-3 py-1 rounded-full border border-tryst-border text-xs text-ivory-400 bg-tryst-bg/50">{t}</span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => doPull(selectedLive)}
                                    className="flex-1 py-3 border border-crimson/40 text-crimson-300 rounded-xl text-sm font-medium hover:bg-crimson/10 transition-colors">
                                    Like
                                </button>
                                <button type="button" onClick={() => doIgnite(selectedLive)}
                                    className="flex-1 py-3 bg-gold-gradient text-black font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity">
                                    Heart
                                </button>
                            </div>
                            {!isGold && (
                                <Link href="/gold" className="block text-center text-gold-400 text-xs mt-4 hover:underline">Upgrade for unlimited sparks</Link>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {showFilters && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowFilters(false)}>
                    <div className="bg-tryst-card border border-tryst-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-playfair text-xl text-ivory-100 mb-4">Map filters</h3>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Looking for</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {['Women', 'Men', 'Non-binary', 'Everyone'].map(s => (
                                <button key={s} onClick={() => setPrefs(p => ({ ...p, seeking: s }))}
                                    className={`py-2.5 rounded-xl border text-sm transition-all ${prefs.seeking === s ? 'border-crimson bg-crimson/10 text-crimson-300' : 'border-tryst-border text-ivory-400 hover:border-tryst-border-2'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Age {prefs.ageMin}–{prefs.ageMax}</label>
                        <div className="flex gap-3 mb-4">
                            <input type="range" min={18} max={60} value={prefs.ageMin} onChange={e => setPrefs(p => ({ ...p, ageMin: +e.target.value }))} className="flex-1 accent-crimson" />
                            <input type="range" min={18} max={60} value={prefs.ageMax} onChange={e => setPrefs(p => ({ ...p, ageMax: +e.target.value }))} className="flex-1 accent-crimson" />
                        </div>
                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">My location</label>
                        <button
                            type="button"
                            onClick={useMyLocation}
                            disabled={updateLocation.isPending}
                            className={`w-full mb-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm transition-all ${
                                hasLocation ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-tryst-border text-ivory-300 hover:border-crimson/40'
                            }`}
                        >
                            {updateLocation.isPending
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting location…</>
                                : <><Navigation className="w-4 h-4" /> {hasLocation ? 'Location set · Update' : 'Use my current location'}</>
                            }
                        </button>

                        <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">Range</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setPrefs(p => ({ ...p, distance: p.distance >= 100 ? 50 : p.distance }))}
                                className={`py-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 transition-all ${prefs.distance < 100 ? 'border-crimson bg-crimson/10 text-crimson-300' : 'border-tryst-border text-ivory-400'}`}>
                                <MapPin className="w-4 h-4" /> Nearby
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrefs(p => ({ ...p, distance: 100 }))}
                                className={`py-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 transition-all ${prefs.distance >= 100 ? 'border-gold bg-gold/10 text-gold-400' : 'border-tryst-border text-ivory-400'}`}>
                                <Globe className="w-4 h-4" /> Worldwide
                            </button>
                        </div>

                        {prefs.distance < 100 ? (
                            <>
                                <label className="text-xs text-ivory-500 uppercase tracking-wider mb-2 block">
                                    Within {prefs.distance} km {!hasLocation && <span className="text-gold-500 normal-case tracking-normal">· set location for precise results</span>}
                                </label>
                                <input type="range" min={5} max={99} value={prefs.distance} onChange={e => setPrefs(p => ({ ...p, distance: +e.target.value }))} className="w-full mb-6 accent-crimson" />
                            </>
                        ) : (
                            <p className="text-ivory-500 text-xs mb-6">Showing sparks from everywhere — distance limits are off.</p>
                        )}
                        <button
                            disabled={applying}
                            onClick={async () => {
                            setApplying(true)
                            try {
                                const ageMin = Math.min(prefs.ageMin, prefs.ageMax)
                                const ageMax = Math.max(prefs.ageMin, prefs.ageMax)
                                await userApi.updateProfile({
                                    seeking: prefs.seeking,
                                    agePrefMin: ageMin,
                                    agePrefMax: ageMax,
                                    maxDistanceKm: prefs.distance,
                                })
                                await Promise.all([
                                    qc.invalidateQueries({ queryKey: ['me'] }),
                                    qc.invalidateQueries({ queryKey: ['profile', 'me'] }),
                                    qc.invalidateQueries({ queryKey: ['orbit-feed'] }),
                                    qc.invalidateQueries({ queryKey: ['discover'] }),
                                ])
                                await qc.refetchQueries({ queryKey: ['orbit-feed'] })
                                setShowFilters(false)
                                const rangeLabel =
                                    prefs.distance >= 100
                                        ? 'worldwide'
                                        : `within ${prefs.distance} km`
                                flash(`Filters applied · ${prefs.seeking} · ages ${ageMin}–${ageMax} · ${rangeLabel}`)
                            } catch {
                                flash('Could not save filters')
                            } finally {
                                setApplying(false)
                            }
                        }} className="w-full py-3 bg-crimson-gradient text-white rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                            {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : 'Apply filters'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
