'use client'

import { useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, ColorScheme } from '@vis.gl/react-google-maps'
import type { OrbitGlobeMarker } from '@/lib/orbitCoords'
import { MAP_ZOOM_EXIT } from '@/lib/orbitGlobeCamera'
import OrbitStreetPin from './OrbitStreetPin'
import type { OrbitStreetMapProps } from './OrbitOsmMap'

interface OrbitGoogleMapProps extends OrbitStreetMapProps {
    apiKey: string
}

function MapInner({
    markers, center, zoom, meCity, theme, pulled, fx, onPull, onIgnite, onTap,
    onCameraChange, onZoomOutToGlobe,
}: Omit<OrbitGoogleMapProps, 'apiKey'>) {
    const isDark = theme !== 'light'
    const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => () => {
        if (exitTimer.current) clearTimeout(exitTimer.current)
    }, [])

    return (
        <Map
            center={center}
            zoom={zoom}
            gestureHandling="greedy"
            disableDefaultUI
            colorScheme={isDark ? ColorScheme.DARK : ColorScheme.LIGHT}
            className="orbit-map-canvas"
            style={{ width: '100%', height: '100%' }}
            mapTypeId="roadmap"
            onCameraChanged={(e) => {
                const { center: c, zoom: z } = e.detail
                onCameraChange?.(c, z)
                if (exitTimer.current) clearTimeout(exitTimer.current)
                if (z <= MAP_ZOOM_EXIT && onZoomOutToGlobe) {
                    exitTimer.current = setTimeout(() => onZoomOutToGlobe(z), 400)
                }
            }}
        >
            {markers.map(m => (
                <AdvancedMarker
                    key={m.id}
                    position={{ lat: m.lat, lng: m.lng }}
                    zIndex={m.isMe ? 200 : m.isOnline ? 120 : 40}
                >
                    <OrbitStreetPin
                        m={m}
                        meCity={meCity}
                        pulled={pulled}
                        fx={fx}
                        onPull={onPull}
                        onIgnite={onIgnite}
                        onTap={onTap}
                    />
                </AdvancedMarker>
            ))}
        </Map>
    )
}

export default function OrbitGoogleMap({ apiKey, ...rest }: OrbitGoogleMapProps) {
    return (
        <APIProvider apiKey={apiKey} libraries={['marker']}>
            <MapInner {...rest} />
        </APIProvider>
    )
}
