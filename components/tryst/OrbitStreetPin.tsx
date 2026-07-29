'use client'

import { useEffect, useRef } from 'react'
import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import type { OrbitGlobeMarker } from '@/lib/orbitCoords'
import { markerLabel } from '@/lib/orbitSnapPin'
import ProfileAvatar from './ProfileAvatar'

export function mainStreetPhoto(m: OrbitGlobeMarker) {
    if (m.isMe) return m.photoUrl || m.avatarUrl
    const p = m.profile
    if (!p) return m.photoUrl
    return p.photoUrls?.[0] || p.avatarUrl || m.photoUrl
}

interface StreetPinProps {
    m: OrbitGlobeMarker
    meCity?: string | null
    pulled: Record<string, boolean>
    fx: { pid: string; type: 'pull' | 'ignite' } | null
    onPull: (p: OrbitProfile) => void
    onIgnite: (p: OrbitProfile) => void
    onTap: (p: OrbitProfile) => void
}

export default function OrbitStreetPin({
    m, meCity, pulled, fx, onPull, onIgnite, onTap,
}: StreetPinProps) {
    const isPulled = m.profile ? !!pulled[m.profile.id] : false
    const ignite = m.profile && fx?.pid === m.profile.id && fx.type === 'ignite'
    const profile = m.profile
    const photo = mainStreetPhoto(m)
    const label = markerLabel(m, meCity)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el || !profile) return
        const hold = { t: null as ReturnType<typeof setTimeout> | null, fired: false }
        const tap = { n: 0, t: null as ReturnType<typeof setTimeout> | null }

        const down = (e: PointerEvent) => {
            e.stopPropagation()
            hold.fired = false
            hold.t = setTimeout(() => {
                hold.fired = true
                onPull(profile)
            }, 600)
        }
        const up = () => {
            if (hold.t) clearTimeout(hold.t)
            if (!hold.fired) {
                tap.n++
                if (tap.t) clearTimeout(tap.t)
                if (tap.n >= 2) {
                    tap.n = 0
                    onIgnite(profile)
                } else {
                    tap.t = setTimeout(() => {
                        tap.n = 0
                        onTap(profile)
                    }, 220)
                }
            }
        }
        const leave = () => { if (hold.t) clearTimeout(hold.t) }

        el.addEventListener('pointerdown', down)
        el.addEventListener('pointerup', up)
        el.addEventListener('pointerleave', leave)
        return () => {
            el.removeEventListener('pointerdown', down)
            el.removeEventListener('pointerup', up)
            el.removeEventListener('pointerleave', leave)
        }
    }, [profile, onPull, onIgnite, onTap])

    return (
        <div
            ref={ref}
            className={[
                'orbit-snap-pin',
                m.isMe ? 'orbit-snap-pin--me' : '',
                m.isOnline ? 'orbit-snap-pin--live' : 'orbit-snap-pin--away',
                isPulled ? 'orbit-snap-pin--pulled' : '',
                ignite ? 'orbit-snap-pin--ignite' : '',
            ].filter(Boolean).join(' ')}
        >
            {m.isMe && <div className="orbit-snap-pin-heat" />}
            <div className="orbit-snap-pin-drop">
                <div className="orbit-snap-pin-photo-wrap">
                    <ProfileAvatar
                        seed={m.alias}
                        src={photo}
                        size={m.isMe ? 54 : 46}
                        className="orbit-snap-pin-photo"
                    />
                    {m.isOnline && <span className="orbit-snap-pin-live-dot" />}
                </div>
                <div className="orbit-snap-pin-tip" />
            </div>
            <div className="orbit-snap-pin-label">{label}</div>
            {!m.isMe && (
                <div className="orbit-snap-pin-sub">
                    {m.matchScore}% · {m.isOnline ? 'live' : 'away'}
                </div>
            )}
        </div>
    )
}
