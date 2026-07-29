'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Flame, Pencil } from 'lucide-react'
import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import ProfileAvatar from './ProfileAvatar'

const HUB_SIZE = 56
const AVATAR_INSET_RATIO = 0.72

interface OrbitSparkProps {
    profiles: OrbitProfile[]
    meAlias: string
    meAvatarUrl?: string | null
    meCity?: string | null
    maxDist: number
    pulled: Record<string, boolean>
    fx: { pid: string; type: 'pull' | 'ignite' } | null
    avatarMode: boolean
    night: boolean
    onPull: (p: OrbitProfile) => void
    onIgnite: (p: OrbitProfile) => void
    onTap: (p: OrbitProfile) => void
}

function pickSrc(p: OrbitProfile, avatarMode: boolean) {
    if (avatarMode) return p.avatarUrl
    return p.photoUrls?.[0] || p.avatarUrl
}

function locLabel(p: OrbitProfile) {
    if (p.distanceKm != null && p.distanceKm < 9000) {
        return p.distanceKm < 1 ? '<1 km' : `${Math.round(p.distanceKm)} km`
    }
    if (p.city) return p.city
    return ''
}

function assignRings(profiles: OrbitProfile[]) {
    const all = profiles.slice(0, 12)
    if (all.length === 0) return { ring1: [] as OrbitProfile[], ring2: [] as OrbitProfile[], ring3: [] as OrbitProfile[] }

    const byRing = {
        r1: all.filter(p => p.ring === 1),
        r2: all.filter(p => p.ring === 2),
        r3: all.filter(p => p.ring === 3),
    }

    if (byRing.r1.length + byRing.r2.length + byRing.r3.length === 0) {
        return {
            ring1: all.slice(0, 3),
            ring2: all.slice(3, 7),
            ring3: all.slice(7, 12),
        }
    }

    let ring1 = byRing.r1.slice(0, 3)
    let ring2 = byRing.r2.slice(0, 4)
    let ring3 = byRing.r3.slice(0, 5)

    const placed = new Set([...ring1, ...ring2, ...ring3].map(p => p.id))
    const rest = all.filter(p => !placed.has(p.id))

    for (const p of rest) {
        if (ring1.length < 3) ring1 = [...ring1, p]
        else if (ring2.length < 4) ring2 = [...ring2, p]
        else if (ring3.length < 5) ring3 = [...ring3, p]
    }

    if (all.length <= 4 && ring1.length === 0 && ring2.length > 0) {
        ring1 = [ring2[0]]
        ring2 = ring2.slice(1)
    }

    return { ring1, ring2, ring3 }
}

interface SparkProfileCardProps {
    size: number
    seed: string
    src?: string | null
    alias: string
    loc?: string
    online?: boolean
    verified?: boolean
    pulled?: boolean
    fx?: { type: 'pull' | 'ignite' } | null
    hub?: boolean
    gestureHandlers?: {
        onPointerDown: (e: React.PointerEvent) => void
        onPointerUp: (e: React.PointerEvent) => void
        onPointerLeave: () => void
    }
}

function SparkProfileCard({
    size, seed, src, alias, loc, online = true, verified, pulled, fx, hub, gestureHandlers,
}: SparkProfileCardProps) {
    const borderClass = verified ? 'orbit-spark-pin-head--verified' : hub ? 'orbit-spark-pin-head--hub' : ''

    const avatarSize = Math.round(size * AVATAR_INSET_RATIO)

    return (
        <div
            className={`orbit-spark-profile orbit-spark-profile--pin ${hub ? 'orbit-spark-profile--hub' : ''}`}
            style={{ ['--pin-size' as string]: `${size}px` }}
            {...(gestureHandlers ?? {})}
        >
            <div className="orbit-spark-pin-wrap">
                {pulled && <span className="orbit-spark-pulled-ring" />}
                <div className={`orbit-spark-pin-head ${borderClass}`}>
                    <div className="orbit-spark-profile-avatar">
                        <ProfileAvatar seed={seed} src={src} size={avatarSize} className="w-full h-full" />
                    </div>
                    <span
                        className={`orbit-spark-status ${online !== false ? 'orbit-spark-status--online' : 'orbit-spark-status--offline'} orbit-spark-status--pin`}
                        title={online !== false ? 'Online' : 'Offline'}
                    />
                    {hub && (
                        <Link
                            href="/you"
                            onPointerDown={e => e.stopPropagation()}
                            className="orbit-spark-hub-edit"
                            title="Style your profile"
                        >
                            <Pencil className="w-3.5 h-3.5 text-[#3a2a08]" />
                        </Link>
                    )}
                    {fx?.type === 'pull' && <span className="orbit-spark-fx orbit-spark-fx--pull" />}
                    {fx?.type === 'ignite' && (
                        <span className="orbit-spark-fx orbit-spark-fx--ignite">
                            <Flame className="w-full h-full text-gold-400 fill-gold-400" />
                        </span>
                    )}
                </div>
                <span className={`orbit-spark-pin-tail ${verified ? 'orbit-spark-pin-tail--verified' : ''}`} aria-hidden />
            </div>
            <span className="orbit-spark-profile-name">{alias}</span>
            {loc && <span className="orbit-spark-profile-loc">{loc}</span>}
        </div>
    )
}

interface NodeProps {
    p: OrbitProfile
    i: number
    n: number
    rx: number
    ry: number
    size: number
    speed: number
    rot: number
    frozen: boolean
    avatarMode: boolean
    pulled: Record<string, boolean>
    fx: OrbitSparkProps['fx']
    phase: number
    handlers: (p: OrbitProfile) => SparkProfileCardProps['gestureHandlers']
}

function OrbitNode({ p, i, n, rx, ry, size, speed, rot, frozen, avatarMode, pulled, fx, phase, handlers }: NodeProps) {
    const ang = rot * speed + phase + (i / n) * Math.PI * 2
    const x = Math.cos(ang) * rx
    const y = Math.sin(ang) * ry
    const front = (Math.sin(ang) + 1) / 2
    const isFx = fx?.pid === p.id
    const loc = locLabel(p)
    const gh = handlers(p)

    return (
        <div
            className={`orbit-spark-node ${frozen ? 'orbit-spark-node--frozen' : ''}`}
            style={{
                zIndex: 12 + Math.round(front * 38),
                transform: `translate(-50%, -100%) translate(${x}px, ${y}px)`,
            }}
        >
            <SparkProfileCard
                size={size}
                seed={p.alias}
                src={pickSrc(p, avatarMode)}
                alias={p.alias}
                loc={loc}
                online={p.isOnline}
                verified={p.isVerified}
                pulled={!!pulled[p.id]}
                fx={isFx ? fx : null}
                gestureHandlers={gh}
            />
        </div>
    )
}

function OrbitPath({ rx, ry, label, accent }: {
    rx: number; ry: number; label?: string; accent?: 'inner' | 'mid' | 'outer'
}) {
    return (
        <div
            className={`orbit-spark-path orbit-spark-path--${accent || 'mid'}`}
            style={{ width: rx * 2, height: ry * 2 }}
        >
            {label && <span className="orbit-spark-path-label">{label}</span>}
        </div>
    )
}

export default function OrbitSpark({
    profiles, meAlias, meAvatarUrl, meCity, maxDist, pulled, fx, avatarMode, night,
    onPull, onIgnite, onTap,
}: OrbitSparkProps) {
    const [frozen, setFrozen] = useState(false)
    const [rot, setRot] = useState(0)
    const [grabbing, setGrabbing] = useState(false)

    const hold = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false })
    const tap = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null; pid: string | null }>({ count: 0, timer: null, pid: null })
    const drag = useRef({ x: 0, moved: false, on: false })
    const raf = useRef(0)
    const stageRef = useRef<HTMLDivElement>(null)
    const [orbitScale, setOrbitScale] = useState(1)

    const { ring1, ring2, ring3 } = useMemo(() => assignRings(profiles), [profiles])
    const soulCount = ring1.length + ring2.length + ring3.length

    useEffect(() => {
        let last = performance.now()
        const speed = night ? 0.11 : 0.065
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            if (!frozen && !drag.current.on) setRot(r => r + speed * dt)
            raf.current = requestAnimationFrame(loop)
        }
        raf.current = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf.current)
    }, [frozen, night])

    useEffect(() => {
        const el = stageRef.current
        if (!el) return
        const update = () => {
            const { width, height } = el.getBoundingClientRect()
            const fitW = (width / 2 - 12) / 188
            const fitH = (height / 2 - 40) / 128
            setOrbitScale(Math.min(1, Math.max(0.72, fitW), Math.max(0.72, fitH)))
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const nodeHandlers = useCallback((p: OrbitProfile): SparkProfileCardProps['gestureHandlers'] => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.stopPropagation()
            setFrozen(true)
            hold.current.fired = false
            hold.current.timer = setTimeout(() => {
                hold.current.fired = true
                onPull(p)
            }, 600)
        },
        onPointerUp: (e: React.PointerEvent) => {
            e.stopPropagation()
            if (hold.current.timer) clearTimeout(hold.current.timer)
            setTimeout(() => setFrozen(false), 350)
            if (hold.current.fired) return
            if (tap.current.pid !== p.id) { tap.current.count = 0; tap.current.pid = p.id }
            tap.current.count++
            if (tap.current.timer) clearTimeout(tap.current.timer)
            if (tap.current.count >= 2) {
                tap.current.count = 0
                onIgnite(p)
            } else {
                tap.current.timer = setTimeout(() => {
                    tap.current.count = 0
                    onTap(p)
                }, 250)
            }
        },
        onPointerLeave: () => {
            if (hold.current.timer) clearTimeout(hold.current.timer)
        },
    }), [onPull, onIgnite, onTap])

    const stageDown = (e: React.PointerEvent) => {
        drag.current = { x: e.clientX, moved: false, on: true }
        setGrabbing(true)
    }
    const stageMove = (e: React.PointerEvent) => {
        if (!drag.current.on) return
        const dx = e.clientX - drag.current.x
        if (Math.abs(dx) > 1) drag.current.moved = true
        setRot(r => r + dx * 0.012)
        drag.current.x = e.clientX
    }
    const stageUp = () => {
        drag.current.on = false
        setGrabbing(false)
    }

    const distLabel = maxDist >= 100 ? 'worldwide' : `${maxDist} km`
    const midDist = maxDist >= 100 ? 'global' : `${Math.round(maxDist * 0.55)} km`
    const s = orbitScale
    const nodeCommon = { rot, frozen, avatarMode, pulled, fx, handlers: nodeHandlers }

    return (
        <div
            ref={stageRef}
            className={`orbit-spark-stage ${grabbing ? 'orbit-spark-stage--grab' : ''} ${night ? 'orbit-spark-stage--night' : ''}`}
            onPointerDown={stageDown}
            onPointerMove={stageMove}
            onPointerUp={stageUp}
            onPointerLeave={stageUp}
        >
            <p className="orbit-spark-drag-top">↺ drag to turn the orbit</p>

            <div className="orbit-spark-live-chip">
                <span className="orbit-spark-live-dot" />
                <span>{soulCount} souls orbiting you</span>
                <span className="orbit-spark-live-tag">LIVE</span>
            </div>

            <div className="orbit-spark-glow" style={{ transform: `translate(-50%, calc(-50% - 28px)) scale(${s})` }} />

            <div
                className="orbit-spark-system"
                style={{
                    transform: `translate(-50%, calc(-50% - 28px)) scale(${s})`,
                    left: '50%',
                    top: '50%',
                }}
            >
                <OrbitPath rx={188} ry={128} label={distLabel} accent="outer" />
                <OrbitPath rx={138} ry={94} label={midDist} accent="mid" />
                <OrbitPath rx={92} ry={62} label="nearby" accent="inner" />

                {ring3.map((p, i) => (
                    <OrbitNode key={p.id} p={p} i={i} n={Math.max(ring3.length, 1)} rx={188} ry={128} size={HUB_SIZE} speed={0.55} phase={0.4} {...nodeCommon} />
                ))}
                {ring2.map((p, i) => (
                    <OrbitNode key={p.id} p={p} i={i} n={Math.max(ring2.length, 1)} rx={138} ry={94} size={HUB_SIZE} speed={0.82} phase={1.2} {...nodeCommon} />
                ))}
                {ring1.map((p, i) => (
                    <OrbitNode key={p.id} p={p} i={i} n={Math.max(ring1.length, 1)} rx={92} ry={62} size={HUB_SIZE} speed={1.18} phase={2.1} {...nodeCommon} />
                ))}

                <div className="orbit-spark-hub" style={{ ['--pin-size' as string]: `${HUB_SIZE}px` }}>
                    {[0, 1].map(i => (
                        <span key={i} className="orbit-spark-hub-pulse" style={{ animationDelay: `${i * 1.5}s` }} />
                    ))}
                    <SparkProfileCard
                        size={HUB_SIZE}
                        seed={meAlias}
                        src={meAvatarUrl}
                        alias={meAlias}
                        loc={meCity || undefined}
                        online
                        hub
                    />
                </div>
            </div>
        </div>
    )
}
