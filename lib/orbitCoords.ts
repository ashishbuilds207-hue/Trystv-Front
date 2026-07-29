import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import { CITY_COORDS } from '@/lib/pulseCities'

function hashStr(s: string) {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return Math.abs(h)
}

export function resolveCoords(
    profile: Pick<OrbitProfile, 'id' | 'alias' | 'city' | 'latitude' | 'longitude'>,
    fallback?: { lat: number; lng: number },
): { lat: number; lng: number } {
    if (profile.latitude != null && profile.longitude != null) {
        return { lat: Number(profile.latitude), lng: Number(profile.longitude) }
    }
    const cityKey = profile.city?.trim()
    if (cityKey && CITY_COORDS[cityKey]) return CITY_COORDS[cityKey]
    if (cityKey) {
        const match = Object.entries(CITY_COORDS).find(([k]) =>
            k.toLowerCase() === cityKey.toLowerCase(),
        )
        if (match) return match[1]
    }
    const h = hashStr(profile.id + profile.alias)
    const base = fallback ?? { lat: 20, lng: 0 }
    return {
        lat: base.lat + ((h % 100) / 100 - 0.5) * 8,
        lng: base.lng + (((h >> 8) % 100) / 100 - 0.5) * 16,
    }
}

export type OrbitGlobeMarker = {
    id: string
    lat: number
    lng: number
    isMe: boolean
    profile: OrbitProfile | null
    alias: string
    label: string
    avatarUrl?: string | null
    photoUrl?: string | null
    isOnline: boolean
    matchScore: number
    profileCompletion: number
    avatarMode: boolean
}

export type OrbitGlobeArc = {
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    online: boolean
}
