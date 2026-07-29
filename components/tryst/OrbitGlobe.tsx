'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Globe as GlobeIcon, MapPin, Map as MapIcon, Plus, Minus, Crosshair } from 'lucide-react'
import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import type { GlobeMethods } from 'react-globe.gl'
import { avatarUrl } from './ProfileAvatar'
import { resolveCoords, type OrbitGlobeArc, type OrbitGlobeMarker } from '@/lib/orbitCoords'
import { snapPinHtml } from '@/lib/orbitSnapPin'
import {
    ALT_HOME, ALT_MAX, ALT_MIN, ALT_STREET_IN, ALT_WORLD,
    altToMapZoom, globeAltToProgress, mapZoomToAlt, mapZoomToProgress,
    MAP_ZOOM_EXIT, MAP_ZOOM_MAX, MAP_ZOOM_MIN, MAP_ZOOM_STREET,
    progressLabel, TRANSITION_MS, TRANSITION_HALF, FLY_TO_CITY_MS,
} from '@/lib/orbitGlobeCamera'

const GlobeGL = dynamic(() => import('react-globe.gl'), { ssr: false })
const OrbitStreetMap = dynamic(() => import('./OrbitStreetMap'), { ssr: false })

const EARTH = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
const NIGHT = 'https://unpkg.com/three-globe/example/img/earth-night.jpg'

const FLY_MS = 1600

type ViewMode = 'globe' | 'street'
type LayerPhase =
    | 'earth-only'
    | 'map-only'
    | 'leaving-earth'
    | 'entering-map'
    | 'leaving-map'
    | 'entering-earth'

interface OrbitGlobeProps {
    profiles: OrbitProfile[]
    meAlias: string
    meAvatarUrl?: string | null
    meLat?: number | null
    meLng?: number | null
    meCity?: string | null
    meProfileCompletion?: number
    avatarMode: boolean
    pulled: Record<string, boolean>
    fx: { pid: string; type: 'pull' | 'ignite' } | null
    frozen?: boolean
    theme?: 'light' | 'dark'
    onPull: (p: OrbitProfile) => void
    onIgnite: (p: OrbitProfile) => void
    onTap: (p: OrbitProfile) => void
}

function pickPhoto(p: OrbitProfile, avatarMode: boolean) {
    if (avatarMode) return p.avatarUrl || null
    return p.photoUrls?.[0] || p.avatarUrl || null
}

export default function OrbitGlobe({
    profiles, meAlias, meAvatarUrl, meLat, meLng, meCity, meProfileCompletion = 0,
    avatarMode, pulled, fx, frozen = false, theme = 'dark', onPull, onIgnite, onTap,
}: OrbitGlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const globeRef = useRef<GlobeMethods | undefined>(undefined)
    const introDoneRef = useRef(false)
    const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const streetLockRef = useRef(false)
    const handlersRef = useRef({ onPull, onIgnite, onTap })
    handlersRef.current = { onPull, onIgnite, onTap }

    const [size, setSize] = useState({ w: 400, h: 420 })
    const [viewMode, setViewMode] = useState<ViewMode>('globe')
    const [layerPhase, setLayerPhase] = useState<LayerPhase>('earth-only')
    const [mapCenter, setMapCenter] = useState({ lat: 28.613, lng: 77.209 })
    const [mapZoom, setMapZoom] = useState(MAP_ZOOM_STREET)
    const [centeredOnMe, setCenteredOnMe] = useState(true)
    const [introActive, setIntroActive] = useState(true)
    const [mapMounted, setMapMounted] = useState(false)
    const [transition, setTransition] = useState<'idle' | 'active'>('idle')
    const [zoomProgress, setZoomProgress] = useState(0)

    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const hasGoogleMaps = !!mapsKey && mapsKey !== 'your_google_maps_key'

    const meCoords = useMemo(() => {
        if (meLat != null && meLng != null) return { lat: meLat, lng: meLng }
        return resolveCoords({ id: 'me', alias: meAlias, city: meCity || '' })
    }, [meLat, meLng, meCity, meAlias])

    useEffect(() => {
        setMapCenter(meCoords)
    }, [meCoords.lat, meCoords.lng])

    const markers = useMemo<OrbitGlobeMarker[]>(() => {
        const mePhoto = avatarUrl(meAlias, meAvatarUrl)
        const list: OrbitGlobeMarker[] = [{
            id: 'me',
            ...meCoords,
            isMe: true,
            profile: null,
            alias: meAlias,
            label: meCity || meAlias,
            avatarUrl: meAvatarUrl,
            photoUrl: mePhoto,
            isOnline: true,
            matchScore: 100,
            profileCompletion: meProfileCompletion,
            avatarMode: false,
        }]

        for (const p of profiles) {
            const coords = resolveCoords(p, meCoords)
            const mainPhoto = pickPhoto(p, avatarMode)
            list.push({
                id: p.id,
                lat: coords.lat,
                lng: coords.lng,
                isMe: false,
                profile: p,
                alias: p.alias,
                label: p.city || p.alias,
                avatarUrl: p.avatarUrl,
                photoUrl: avatarUrl(p.alias, mainPhoto),
                isOnline: p.isOnline !== false,
                matchScore: p.matchScore ?? 0,
                profileCompletion: p.profileCompletion ?? 0,
                avatarMode,
            })
        }
        return list
    }, [profiles, meCoords, meAlias, meAvatarUrl, meProfileCompletion, avatarMode, meCity])

    const heatmapLayer = useMemo(() => [{
        points: markers.map(m => ({
            lat: m.lat,
            lng: m.lng,
            weight: m.isMe ? 5 : m.isOnline ? 2 : 0.8,
        })),
    }], [markers])

    const arcs = useMemo<OrbitGlobeArc[]>(() =>
        markers.filter(m => !m.isMe).map(m => ({
            startLat: meCoords.lat,
            startLng: meCoords.lng,
            endLat: m.lat,
            endLng: m.lng,
            online: m.isOnline,
        })),
    [markers, meCoords])

    const stars = useMemo(() =>
        Array.from({ length: 48 }, (_, i) => ({
            id: i,
            left: `${(i * 41 + 7) % 100}%`,
            top: `${(i * 59 + 3) % 100}%`,
            size: (i % 3) + 1,
            delay: `${(i % 10) * 0.35}s`,
        })),
    [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setSize({ w: el.clientWidth, h: el.clientHeight || 420 })
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const setupControls = useCallback((globe: GlobeMethods) => {
        const c = globe.controls()
        c.enablePan = false
        c.enableZoom = true
        c.minDistance = 120
        c.maxDistance = 480
        c.autoRotate = !frozen
        c.autoRotateSpeed = 0.38
        c.enableDamping = true
        c.dampingFactor = 0.08
    }, [frozen])

    const enterStreetMode = useCallback((zoom = MAP_ZOOM_STREET) => {
        if (streetLockRef.current || viewMode === 'street') return
        streetLockRef.current = true
        const target = meCoords
        const z = Math.max(MAP_ZOOM_STREET, zoom)
        setTransition('active')
        setLayerPhase('leaving-earth')
        setMapMounted(true)
        setMapCenter(target)
        setMapZoom(z)
        setZoomProgress(mapZoomToProgress(z))
        const globe = globeRef.current
        if (globe) {
            globe.controls().autoRotate = false
            globe.pointOfView({ lat: target.lat, lng: target.lng, altitude: 0.92 }, FLY_TO_CITY_MS)
        }
        setTimeout(() => {
            setViewMode('street')
            setLayerPhase('entering-map')
        }, FLY_TO_CITY_MS)
        setTimeout(() => {
            setLayerPhase('map-only')
            setTransition('idle')
            streetLockRef.current = false
        }, FLY_TO_CITY_MS + TRANSITION_MS)
    }, [viewMode, meCoords])

    const exitStreetMode = useCallback((zoom = mapZoom) => {
        if (streetLockRef.current || viewMode === 'globe') return
        streetLockRef.current = true
        setTransition('active')
        setLayerPhase('leaving-map')
        setZoomProgress(Math.max(0, mapZoomToProgress(zoom) * 0.35))
        setTimeout(() => {
            setViewMode('globe')
            setLayerPhase('entering-earth')
            const globe = globeRef.current
            const alt = mapZoomToAlt(zoom) + 0.22
            if (globe) {
                globe.controls().autoRotate = false
                globe.pointOfView({ lat: mapCenter.lat, lng: mapCenter.lng, altitude: alt }, TRANSITION_HALF)
                setZoomProgress(globeAltToProgress(alt))
            }
        }, TRANSITION_HALF)
        setTimeout(() => {
            setLayerPhase('earth-only')
            setTransition('idle')
            streetLockRef.current = false
            const g = globeRef.current
            if (g && !frozen && !introActive) g.controls().autoRotate = true
        }, TRANSITION_MS)
    }, [mapCenter, mapZoom, viewMode, frozen, introActive])

    const flyToMe = useCallback((alt = ALT_HOME, ms = FLY_MS) => {
        if (viewMode === 'street') {
            setMapCenter(meCoords)
            setMapZoom(MAP_ZOOM_STREET)
            setZoomProgress(mapZoomToProgress(MAP_ZOOM_STREET))
            return
        }
        const globe = globeRef.current
        if (!globe) return
        const c = globe.controls()
        c.autoRotate = false
        globe.pointOfView({ lat: meCoords.lat, lng: meCoords.lng, altitude: alt }, ms)
        setCenteredOnMe(true)
        if (flyTimerRef.current) clearTimeout(flyTimerRef.current)
        flyTimerRef.current = setTimeout(() => {
            if (!frozen) c.autoRotate = true
        }, ms + 400)
    }, [meCoords, frozen, viewMode])

    const zoomBy = useCallback((delta: number) => {
        if (viewMode === 'street') {
            const next = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, mapZoom + (delta < 0 ? 1 : -1)))
            setMapZoom(next)
            setZoomProgress(mapZoomToProgress(next))
            if (next <= MAP_ZOOM_EXIT) exitStreetMode(next)
            return
        }
        const globe = globeRef.current
        if (!globe) return
        const pov = globe.pointOfView()
        const next = Math.max(ALT_MIN, Math.min(ALT_MAX, (pov.altitude ?? ALT_HOME) + delta))
        if (next <= ALT_STREET_IN) {
            enterStreetMode(altToMapZoom(next))
            return
        }
        globe.controls().autoRotate = false
        globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: next }, 450)
        setZoomProgress(globeAltToProgress(next))
        setCenteredOnMe(
            Math.abs((pov.lat ?? 0) - meCoords.lat) < 2 &&
            Math.abs((pov.lng ?? 0) - meCoords.lng) < 2 &&
            Math.abs(next - ALT_HOME) < 0.35,
        )
    }, [meCoords, viewMode, mapZoom, enterStreetMode, exitStreetMode])

    const playIntro = useCallback((globe: GlobeMethods) => {
        if (introDoneRef.current) return
        introDoneRef.current = true
        setIntroActive(true)
        setupControls(globe)
        globe.pointOfView({ lat: meCoords.lat, lng: meCoords.lng, altitude: ALT_WORLD }, 0)
        globe.controls().autoRotate = false
        requestAnimationFrame(() => {
            globe.pointOfView({ lat: meCoords.lat, lng: meCoords.lng, altitude: ALT_HOME }, 2200)
            setTimeout(() => {
                setIntroActive(false)
                if (!frozen) globe.controls().autoRotate = true
            }, 2400)
        })
    }, [meCoords, setupControls, frozen])

    const initGlobe = useCallback(() => {
        const attempt = (n = 0) => {
            const globe = globeRef.current
            if (globe) {
                if (!introDoneRef.current) playIntro(globe)
                return
            }
            if (n < 40) requestAnimationFrame(() => attempt(n + 1))
        }
        attempt()
    }, [playIntro])

    const centerOnMe = useCallback(() => {
        if (viewMode === 'street') {
            setMapCenter(meCoords)
            setMapZoom(MAP_ZOOM_STREET)
            setZoomProgress(mapZoomToProgress(MAP_ZOOM_STREET))
            return
        }
        flyToMe()
    }, [viewMode, flyToMe, meCoords])

    const openStreetAtMe = useCallback(() => {
        enterStreetMode(MAP_ZOOM_STREET)
    }, [enterStreetMode])

    useEffect(() => {
        const globe = globeRef.current
        if (!globe) return
        globe.controls().autoRotate = !frozen && !introActive
    }, [frozen, introActive])

    useEffect(() => () => {
        if (flyTimerRef.current) clearTimeout(flyTimerRef.current)
    }, [])

    useEffect(() => {
        const globe = globeRef.current
        if (!globe || viewMode !== 'globe' || introActive) return
        const c = globe.controls()
        const onChange = () => {
            const pov = globe.pointOfView()
            const latDiff = Math.abs((pov.lat ?? 0) - meCoords.lat)
            const lngDiff = Math.abs((pov.lng ?? 0) - meCoords.lng)
            const alt = pov.altitude ?? ALT_HOME
            setZoomProgress(globeAltToProgress(alt))
            setCenteredOnMe(latDiff < 4 && lngDiff < 4 && alt < 1.6)
            if (alt <= ALT_STREET_IN && !streetLockRef.current) {
                enterStreetMode(altToMapZoom(alt))
            }
        }
        c.addEventListener('change', onChange)
        return () => c.removeEventListener('change', onChange)
    }, [meCoords, viewMode, introActive, enterStreetMode])

    const buildPin = useCallback((d: object) => {
        const m = d as OrbitGlobeMarker
        const isPulled = m.profile ? !!pulled[m.profile.id] : false
        const isFx = m.profile && fx?.pid === m.profile.id
        const ignite = !!(isFx && fx?.type === 'ignite')
        const photo = m.avatarMode && !m.isMe ? '' : (m.photoUrl || '')

        const el = document.createElement('div')
        el.className = 'orbit-snap-pin-host'
        el.innerHTML = snapPinHtml(m, photo, { isPulled, ignite, meCity })

        if (m.profile) {
            const hold = { t: null as ReturnType<typeof setTimeout> | null, fired: false }
            const tap = { n: 0, t: null as ReturnType<typeof setTimeout> | null }
            const profile = m.profile

            el.style.cursor = 'pointer'
            el.addEventListener('pointerdown', (e) => {
                e.stopPropagation()
                hold.fired = false
                hold.t = setTimeout(() => {
                    hold.fired = true
                    handlersRef.current.onPull(profile)
                }, 600)
            })
            el.addEventListener('pointerup', () => {
                if (hold.t) clearTimeout(hold.t)
                if (!hold.fired) {
                    tap.n++
                    if (tap.t) clearTimeout(tap.t)
                    if (tap.n >= 2) {
                        tap.n = 0
                        handlersRef.current.onIgnite(profile)
                    } else {
                        tap.t = setTimeout(() => {
                            tap.n = 0
                            handlersRef.current.onTap(profile)
                        }, 250)
                    }
                }
            })
            el.addEventListener('pointerleave', () => {
                if (hold.t) clearTimeout(hold.t)
            })
        }

        return el
    }, [pulled, fx, avatarMode, meCity])

    const isDark = theme !== 'light'

    const modeLabel = progressLabel(zoomProgress)

    const isSwitching = transition === 'active'

    return (
        <div
            ref={containerRef}
            className={[
                'orbit-globe-stage',
                isDark ? '' : 'orbit-globe-stage--light',
                introActive ? 'orbit-globe-stage--intro' : '',
                `orbit-globe-stage--${layerPhase}`,
                isSwitching ? 'orbit-globe-stage--switching' : '',
            ].filter(Boolean).join(' ')}
        >
            <div className="orbit-globe-stars" aria-hidden>
                {stars.map(s => (
                    <div
                        key={s.id}
                        className="orbit-globe-star"
                        style={{
                            left: s.left,
                            top: s.top,
                            width: s.size,
                            height: s.size,
                            animationDelay: s.delay,
                        }}
                    />
                ))}
            </div>

            {isSwitching && <div className="orbit-globe-warp-flash" aria-hidden />}

            <div className="orbit-globe-canvas">
            <GlobeGL
                ref={globeRef}
                width={size.w}
                height={size.h}
                globeImageUrl={isDark ? NIGHT : EARTH}
                bumpImageUrl={BUMP}
                backgroundColor="rgba(0,0,0,0)"
                showAtmosphere
                atmosphereColor={isDark ? 'rgba(60,140,255,0.55)' : 'rgba(100,180,255,0.4)'}
                atmosphereAltitude={0.18}
                onGlobeReady={initGlobe}
                htmlElementsData={layerPhase !== 'map-only' && layerPhase !== 'entering-map' && layerPhase !== 'leaving-map' ? markers : []}
                htmlLat="lat"
                htmlLng="lng"
                htmlAltitude={0.015}
                htmlElement={buildPin}
                htmlTransitionDuration={400}
                heatmapsData={layerPhase === 'earth-only' || layerPhase === 'leaving-earth' || layerPhase === 'entering-earth' ? heatmapLayer : []}
                heatmapPoints="points"
                heatmapPointLat="lat"
                heatmapPointLng="lng"
                heatmapPointWeight="weight"
                heatmapBandwidth={2.8}
                heatmapColorSaturation={1.8}
                arcsData={layerPhase === 'earth-only' || layerPhase === 'entering-earth' ? arcs : []}
                arcStartLat="startLat"
                arcStartLng="startLng"
                arcEndLat="endLat"
                arcEndLng="endLng"
                arcColor={(d: object) => {
                    const a = d as OrbitGlobeArc
                    const rgb = a.online ? '255,120,90' : '160,160,180'
                    return (t: number) => `rgba(${rgb},${Math.max(0, 0.55 - t * 0.55)})`
                }}
                arcAltitude={0.18}
                arcStroke={0.35}
                arcDashLength={0.4}
                arcDashGap={0.25}
                arcDashAnimateTime={2800}
                ringsData={layerPhase === 'earth-only' || layerPhase === 'entering-earth' ? markers.filter(m => m.isMe) : []}
                ringLat="lat"
                ringLng="lng"
                ringColor={() => (t: number) => `rgba(255,90,70,${Math.max(0, 0.75 - t * 0.75)})`}
                ringMaxRadius={8}
                ringPropagationSpeed={1.5}
                ringRepeatPeriod={1800}
                ringAltitude={0.008}
                pointsData={[]}
            />
            </div>

            {mapMounted && (
                <div className="orbit-globe-map-layer orbit-globe-map-layer--street">
                    <OrbitStreetMap
                        markers={markers}
                        center={mapCenter}
                        zoom={mapZoom}
                        meCity={meCity}
                        theme={theme}
                        pulled={pulled}
                        fx={fx}
                        onPull={onPull}
                        onIgnite={onIgnite}
                        onTap={onTap}
                        onCameraChange={(c, z) => {
                            setMapCenter(c)
                            setMapZoom(z)
                            setZoomProgress(mapZoomToProgress(z))
                        }}
                        onZoomOutToGlobe={(z) => exitStreetMode(z)}
                    />
                </div>
            )}

            <div className="orbit-globe-vignette" />

            <div className="orbit-globe-zoom-rail" aria-hidden>
                <GlobeIcon className="orbit-globe-zoom-rail-icon orbit-globe-zoom-rail-icon--earth" />
                <div className="orbit-globe-zoom-rail-track">
                    <div
                        className="orbit-globe-zoom-rail-fill"
                        style={{ width: `${Math.round(zoomProgress * 100)}%` }}
                    />
                    <div
                        className="orbit-globe-zoom-rail-thumb"
                        style={{ left: `${Math.round(zoomProgress * 100)}%` }}
                    />
                </div>
                <MapIcon className="orbit-globe-zoom-rail-icon orbit-globe-zoom-rail-icon--map" />
                <span className="orbit-globe-zoom-rail-label">
                    {modeLabel === 'earth' ? 'Earth' : modeLabel === 'map' ? 'Road map' : 'Zooming…'}
                </span>
            </div>

            {viewMode === 'globe' && layerPhase === 'earth-only' && (
                <>
                    <div className={`orbit-globe-reticle ${centeredOnMe ? 'orbit-globe-reticle--active' : ''}`} aria-hidden>
                        <span className="orbit-globe-reticle-ring" />
                        <span className="orbit-globe-reticle-dot" />
                    </div>
                    <div className="orbit-globe-me-beacon" aria-hidden />
                </>
            )}

            <div className="orbit-globe-zoom">
                <button type="button" onClick={() => zoomBy(-0.28)} title="Zoom in" aria-label="Zoom in">
                    <Plus className="w-4 h-4" />
                </button>
                <button type="button" onClick={centerOnMe} title="Center on you" aria-label="Center on your location">
                    <Crosshair className={`w-4 h-4 ${centeredOnMe ? 'text-gold-400' : ''}`} />
                </button>
                <button type="button" onClick={() => zoomBy(0.28)} title="Zoom out" aria-label="Zoom out">
                    <Minus className="w-4 h-4" />
                </button>
            </div>

            <div className="orbit-globe-hud">
                {viewMode === 'street' ? (
                    <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                    <GlobeIcon className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '14s' }} />
                )}
                <span>{viewMode === 'street' ? (hasGoogleMaps ? 'Google road map' : 'Road map') : `${profiles.length} nearby`}</span>
                <span className="opacity-40">·</span>
                <MapPin className="w-3 h-3 text-gold-400" />
                <span className="truncate max-w-[100px]">{meCity || 'Earth'}</span>
                <div className="orbit-globe-view-toggle">
                    <button
                        type="button"
                        className={viewMode === 'globe' ? 'is-active' : ''}
                        onClick={() => viewMode === 'street' ? exitStreetMode() : undefined}
                        title="3D Earth"
                    >
                        <GlobeIcon className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        className={viewMode === 'street' ? 'is-active' : ''}
                        onClick={openStreetAtMe}
                        title="Road map — zoom in or tap"
                    >
                        <MapIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <p className="orbit-globe-drag-hint">
                {isSwitching
                    ? 'Switching view…'
                    : viewMode === 'street'
                        ? 'Road map · zoom out → Earth · tap pin → profile'
                        : 'Zoom in → road map · scroll or +/− · tap pin'}
            </p>
        </div>
    )
}
