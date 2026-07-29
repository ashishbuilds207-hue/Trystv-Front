/** Browser GPS + Google reverse/forward geocode helpers for register / filters. */

export type DevicePlace = {
    /** What to show in the location field (sector + city, no coords) */
    city: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
    source: 'gps' | 'city' | 'none'
    error?: string
}

function getPosition(highAccuracy = true): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation not supported'))
            return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout: 12000,
            maximumAge: 60_000,
        })
    })
}

export async function detectGpsPlace(): Promise<DevicePlace> {
    try {
        const pos = await getPosition(true)
        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude
        const res = await fetch('/api/geo/reverse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
        })
        const json = await res.json()
        const label =
            (json?.data?.label as string | null) ||
            (json?.data?.area as string | null) ||
            (json?.data?.city as string | null) ||
            null
        const country = (json?.data?.country as string | null) || null
        return {
            city: label,
            country,
            latitude,
            longitude,
            source: 'gps',
            error: label ? undefined : 'Located you — type your area / sector name',
        }
    } catch (e: unknown) {
        const code = (e as GeolocationPositionError)?.code
        let error = 'Could not get GPS location'
        if (code === 1) error = 'Location permission denied — enter your city'
        else if (code === 2) error = 'Location unavailable — enter your city'
        else if (code === 3) error = 'Location timed out — enter your city'
        return {
            city: null,
            country: null,
            latitude: null,
            longitude: null,
            source: 'none',
            error,
        }
    }
}

export async function resolveCityPlace(cityQuery: string): Promise<DevicePlace> {
    const q = cityQuery.trim()
    if (!q) {
        return { city: null, country: null, latitude: null, longitude: null, source: 'none' }
    }
    try {
        const res = await fetch('/api/geo/forward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: q }),
        })
        const json = await res.json()
        return {
            city: (json?.data?.city as string) || q,
            country: (json?.data?.country as string | null) || null,
            latitude: typeof json?.data?.latitude === 'number' ? json.data.latitude : null,
            longitude: typeof json?.data?.longitude === 'number' ? json.data.longitude : null,
            source: 'city',
        }
    } catch {
        return {
            city: q,
            country: null,
            latitude: null,
            longitude: null,
            source: 'city',
            error: 'Could not resolve city coordinates',
        }
    }
}

export type LocationSuggestion = {
    label: string
    city: string | null
    country: string | null
    latitude: number
    longitude: number
}

/** Optional typeahead — suggestions biased to user's country / nearby GPS. */
export async function suggestLocationPlaces(opts: {
    query: string
    country?: string | null
    latitude?: number | null
    longitude?: number | null
}): Promise<LocationSuggestion[]> {
    const q = opts.query.trim()
    if (q.length < 2) return []
    try {
        const res = await fetch('/api/geo/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: q,
                country: opts.country || null,
                latitude: opts.latitude ?? null,
                longitude: opts.longitude ?? null,
            }),
        })
        const json = await res.json()
        return (json?.data?.suggestions as LocationSuggestion[]) || []
    } catch {
        return []
    }
}
