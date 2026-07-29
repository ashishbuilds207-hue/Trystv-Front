'use client'

import dynamic from 'next/dynamic'
import type { OrbitStreetMapProps } from './OrbitOsmMap'

const OrbitGoogleMap = dynamic(() => import('./OrbitGoogleMap'), { ssr: false })
const OrbitOsmMap = dynamic(() => import('./OrbitOsmMap'), { ssr: false })

function hasGoogleKey() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    return !!key && key !== 'your_google_maps_key'
}

export default function OrbitStreetMap(props: OrbitStreetMapProps) {
    if (hasGoogleKey()) {
        return <OrbitGoogleMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} {...props} />
    }
    return <OrbitOsmMap {...props} />
}

export type { OrbitStreetMapProps }
