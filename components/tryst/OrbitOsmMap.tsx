'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import type { OrbitGlobeMarker } from '@/lib/orbitCoords'
import { MAP_ZOOM_EXIT } from '@/lib/orbitGlobeCamera'
import { snapPinHtml } from '@/lib/orbitSnapPin'
import { mainStreetPhoto } from './OrbitStreetPin'

import 'leaflet/dist/leaflet.css'

export interface OrbitStreetMapProps {
    markers: OrbitGlobeMarker[]
    center: { lat: number; lng: number }
    zoom: number
    meCity?: string | null
    theme: 'light' | 'dark'
    pulled: Record<string, boolean>
    fx: { pid: string; type: 'pull' | 'ignite' } | null
    onPull: (p: OrbitProfile) => void
    onIgnite: (p: OrbitProfile) => void
    onTap: (p: OrbitProfile) => void
    onCameraChange?: (center: { lat: number; lng: number }, zoom: number) => void
    onZoomOutToGlobe?: (zoom: number) => void
}

function makeIcon(m: OrbitGlobeMarker, photo: string, pulled: boolean, ignite: boolean, meCity?: string | null) {
    return L.divIcon({
        html: snapPinHtml(m, photo, { isPulled: pulled, ignite, meCity }),
        className: 'orbit-leaflet-pin-icon',
        iconSize: [m.isMe ? 88 : 76, m.isMe ? 110 : 98],
        iconAnchor: [m.isMe ? 44 : 38, m.isMe ? 100 : 90],
    })
}

function MapResize() {
    const map = useMap()
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 50)
        const t2 = setTimeout(() => map.invalidateSize(), 400)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [map])
    return null
}

function MapSync({
    center, zoom, onCameraChange, onZoomOutToGlobe,
}: Pick<OrbitStreetMapProps, 'center' | 'zoom' | 'onCameraChange' | 'onZoomOutToGlobe'>) {
    const map = useMap()

    useEffect(() => {
        map.setView([center.lat, center.lng], zoom, { animate: true, duration: 0.45 })
    }, [map, center.lat, center.lng, zoom])

    useMapEvents({
        moveend: () => {
            const c = map.getCenter()
            const z = map.getZoom()
            onCameraChange?.({ lat: c.lat, lng: c.lng }, z)
            if (z <= MAP_ZOOM_EXIT) onZoomOutToGlobe?.(z)
        },
        zoomend: () => {
            const c = map.getCenter()
            const z = map.getZoom()
            onCameraChange?.({ lat: c.lat, lng: c.lng }, z)
            if (z <= MAP_ZOOM_EXIT) onZoomOutToGlobe?.(z)
        },
    })

    return null
}

export default function OrbitOsmMap(props: OrbitStreetMapProps) {
    const {
        markers, center, zoom, meCity, theme, pulled, fx,
        onPull, onIgnite, onTap, onCameraChange, onZoomOutToGlobe,
    } = props
    const isDark = theme !== 'light'

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            className="orbit-osm-canvas"
            zoomControl={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
        >
            <TileLayer url={tileUrl} />
            <MapResize />
            <MapSync
                center={center}
                zoom={zoom}
                onCameraChange={onCameraChange}
                onZoomOutToGlobe={onZoomOutToGlobe}
            />
            {markers.map(m => {
                const photo = mainStreetPhoto(m) || ''
                const isPulled = m.profile ? !!pulled[m.profile.id] : false
                const ignite = !!(m.profile && fx?.pid === m.profile.id && fx.type === 'ignite')
                const profile = m.profile
                return (
                    <Marker
                        key={m.id}
                        position={[m.lat, m.lng]}
                        icon={makeIcon(m, photo, isPulled, ignite, meCity)}
                        zIndexOffset={m.isMe ? 1000 : m.isOnline ? 500 : 100}
                        eventHandlers={profile ? {
                            click: (e) => {
                                L.DomEvent.stopPropagation(e)
                                onTap(profile)
                            },
                            dblclick: (e) => {
                                L.DomEvent.stopPropagation(e)
                                onIgnite(profile)
                            },
                        } : undefined}
                    />
                )
            })}
        </MapContainer>
    )
}
