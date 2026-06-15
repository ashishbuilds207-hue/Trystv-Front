'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Globe as GlobeIcon } from 'lucide-react'
import type { PulseCity } from '@/lib/hooks/useFeatures'
import type { GlobeMethods } from 'react-globe.gl'
import { cityCoords, getCoords } from '@/lib/pulseCities'

const GlobeGL = dynamic(() => import('react-globe.gl'), { ssr: false })

const EARTH_MAP = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png'

type GlobePoint = PulseCity & { lat: number; lng: number }

interface Globe3DProps {
    cities: PulseCity[]
    totalActive: number
    selectedCity?: string | null
    onCitySelect?: (city: string) => void
    userCity?: string
}

export default function Globe3D({
    cities, totalActive, selectedCity, onCitySelect, userCity,
}: Globe3DProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const globeRef = useRef<GlobeMethods | undefined>(undefined)
    const [size, setSize] = useState({ w: 360, h: 380 })
    const [ready, setReady] = useState(false)

    const points = useMemo<GlobePoint[]>(() =>
        cities.map(c => {
            const { lat, lng } = getCoords(c)
            return { ...c, lat, lng }
        }),
    [cities])

    const stars = useMemo(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            size: (i % 3) + 1,
            delay: `${(i % 12) * 0.4}s`,
        })),
    [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setSize({ w: el.clientWidth, h: 380 })
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const initGlobe = useCallback(() => {
        const globe = globeRef.current
        if (!globe) return

        const controls = globe.controls()
        controls.enableZoom = true
        controls.enablePan = false
        controls.minDistance = 180
        controls.maxDistance = 420
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.55

        const start = userCity ? cityCoords(userCity, cities) : null
        if (start) {
            globe.pointOfView({ lat: start.lat, lng: start.lng, altitude: 2.1 }, 0)
        } else {
            globe.pointOfView({ lat: 22, lng: 20, altitude: 2.3 }, 0)
        }
        setReady(true)
    }, [userCity, cities])

    useEffect(() => {
        if (!ready || !selectedCity) return
        const globe = globeRef.current
        const coords = cityCoords(selectedCity, cities)
        if (!globe || !coords) return

        globe.controls().autoRotate = false
        globe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.65 }, 1400)
        const t = setTimeout(() => {
            globe.controls().autoRotate = true
        }, 2600)
        return () => clearTimeout(t)
    }, [selectedCity, cities, ready])

    return (
        <div className="mx-4">
            <div
                ref={containerRef}
                className="globe-stage relative overflow-hidden touch-none select-none border border-tryst-border/50 shadow-[0_0_60px_rgba(192,57,43,0.12)]"
                style={{ height: 380, cursor: 'grab' }}
            >
                {/* starfield overlay */}
                <div className="globe-stars absolute inset-0 pointer-events-none z-[2]">
                    {stars.map(s => (
                        <div
                            key={s.id}
                            className="absolute rounded-full bg-white"
                            style={{
                                left: s.left,
                                top: s.top,
                                width: s.size,
                                height: s.size,
                                animation: `star-twinkle ${3 + (s.id % 4)}s ease-in-out ${s.delay} infinite`,
                            }}
                        />
                    ))}
                </div>

                {[18, 32, 48, 64, 82].map(p => (
                    <div
                        key={p}
                        className="globe-grid-line absolute z-[2] pointer-events-none"
                        style={{ top: `${p}%` }}
                    />
                ))}

                <GlobeGL
                    ref={globeRef}
                    width={size.w}
                    height={size.h}
                    globeImageUrl={EARTH_MAP}
                    bumpImageUrl={EARTH_BUMP}
                    backgroundColor="rgba(6,16,24,0)"
                    showAtmosphere
                    atmosphereColor="rgba(70,140,220,0.55)"
                    atmosphereAltitude={0.2}
                    onGlobeReady={initGlobe}
                    pointsData={points}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor={(d: object) => {
                        const p = d as GlobePoint
                        return selectedCity === p.city ? '#FFD54F' : '#FF3B30'
                    }}
                    pointAltitude={0.045}
                    pointRadius={(d: object) => {
                        const p = d as GlobePoint
                        return Math.min(0.65 + p.count / 450, 1.35)
                    }}
                    pointLabel={(d: object) => (d as GlobePoint).city}
                    labelSize={0.72}
                    labelColor={(d: object) =>
                        selectedCity === (d as GlobePoint).city
                            ? 'rgba(255,213,79,1)'
                            : 'rgba(255,255,255,0.95)'
                    }
                    labelDotRadius={0.38}
                    labelResolution={3}
                    labelsTransitionDuration={400}
                    onPointClick={(d: object) => onCitySelect?.((d as GlobePoint).city)}
                    ringsData={points}
                    ringLat="lat"
                    ringLng="lng"
                    ringColor={(d: object) => {
                        const p = d as GlobePoint
                        const color = selectedCity === p.city ? '255,213,79' : '255,59,48'
                        return (t: number) => `rgba(${color},${Math.max(0, 0.85 - t * 0.85)})`
                    }}
                    ringMaxRadius={(d: object) => ((d as GlobePoint).count > 300 ? 7 : 5.5)}
                    ringPropagationSpeed={1.8}
                    ringRepeatPeriod={1400}
                    ringAltitude={0.012}
                />

                {/* vignette */}
                <div
                    className="absolute inset-0 pointer-events-none z-[3] rounded-2xl"
                    style={{ boxShadow: 'inset 0 0 100px rgba(6,16,24,0.45)' }}
                />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-ivory-200 bg-black/55 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 pointer-events-none z-[4]">
                    <GlobeIcon className="w-3.5 h-3.5 text-gold-400 animate-spin" style={{ animationDuration: '12s' }} />
                    <span className="font-mono tracking-wide">
                        <span className="text-ivory-100">{totalActive.toLocaleString()}</span>
                        <span className="text-ivory-500"> active</span>
                    </span>
                    <span className="text-ivory-600">·</span>
                    <span className="text-ivory-500 text-[10px] uppercase tracking-widest">spinning earth</span>
                </div>

                <p className="absolute bottom-11 left-0 right-0 text-center font-mono text-[9px] tracking-[0.2em] uppercase text-ivory-600 pointer-events-none z-[4]">
                    ← drag to spin the world →
                </p>
            </div>
        </div>
    )
}
