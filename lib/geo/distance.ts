/** Great-circle distance in km (WGS84). Used for Nearby / Within X km filters. */
export function haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const toRad = (d: number) => (d * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Map UI “Looking for” → gender values stored on profiles */
export function gendersForSeeking(seeking: string | null | undefined): string[] | null {
    const s = (seeking || 'Everyone').trim().toLowerCase()
    if (!s || s === 'everyone') return null
    if (s === 'women' || s === 'woman' || s === 'female') return ['female', 'woman', 'women', 'f']
    if (s === 'men' || s === 'man' || s === 'male') return ['male', 'man', 'men', 'm']
    if (s.includes('non')) return ['non-binary', 'nonbinary', 'non_binary', 'nb', 'other']
    return null
}

export function matchesSeeking(
    profileGender: string | null | undefined,
    seeking: string | null | undefined,
): boolean {
    const allowed = gendersForSeeking(seeking)
    if (!allowed) return true
    const g = (profileGender || '').trim().toLowerCase()
    if (!g) return false
    return allowed.includes(g)
}

export function matchesAge(
    age: number | null | undefined,
    min: number | null | undefined,
    max: number | null | undefined,
): boolean {
    if (age == null) return true
    const lo = min ?? 18
    const hi = max ?? 99
    return age >= Math.min(lo, hi) && age <= Math.max(lo, hi)
}

/** Stored in `max_distance_km` — city/country/worldwide use sentinel values */
export type OrbitRangeMode = 'nearby' | 'city' | 'country' | 'worldwide'

export const ORBIT_RANGE_KM: Record<OrbitRangeMode, number> = {
    nearby: 25,
    city: 90,
    country: 250,
    worldwide: 5000,
}

export function orbitRangeModeFromKm(maxDistanceKm: number | null | undefined): OrbitRangeMode {
    const km = maxDistanceKm ?? 25
    // Legacy: UI used >= 100 as worldwide
    if (km >= 1000 || km === 100) return 'worldwide'
    if (km >= 200) return 'country'
    if (km >= 85) return 'city'
    return 'nearby'
}

export function isWorldwide(maxDistanceKm: number | null | undefined): boolean {
    return orbitRangeModeFromKm(maxDistanceKm) === 'worldwide'
}

export function isCountryRange(maxDistanceKm: number | null | undefined): boolean {
    return orbitRangeModeFromKm(maxDistanceKm) === 'country'
}

export function isCityRange(maxDistanceKm: number | null | undefined): boolean {
    return orbitRangeModeFromKm(maxDistanceKm) === 'city'
}

function normPlace(s: string | null | undefined): string {
    return (s || '').trim().toLowerCase()
}

/** Whether a profile passes the orbit range filter */
export function matchesOrbitRange(opts: {
    maxKm: number
    hasMeLoc: boolean
    distanceKm: number | null
    myCity?: string | null
    myCountry?: string | null
    theirCity?: string | null
    theirCountry?: string | null
}): boolean {
    const mode = orbitRangeModeFromKm(opts.maxKm)
    if (mode === 'worldwide') return true

    if (mode === 'country') {
        const mine = normPlace(opts.myCountry)
        const theirs = normPlace(opts.theirCountry)
        if (mine && theirs) return mine === theirs
        if (opts.hasMeLoc && opts.distanceKm != null) return opts.distanceKm <= 2500
        return true
    }

    if (mode === 'city') {
        const mine = normPlace(opts.myCity)
        const theirs = normPlace(opts.theirCity)
        if (mine && theirs && mine === theirs) return true
        if (opts.hasMeLoc && opts.distanceKm != null) return opts.distanceKm <= 50
        return false
    }

    // nearby
    if (!opts.hasMeLoc) return true
    if (opts.distanceKm == null) return false
    const cap = opts.maxKm >= 85 ? 25 : Math.min(Math.max(opts.maxKm, 5), 80)
    return opts.distanceKm <= cap
}

export function orbitRangeLabel(maxDistanceKm: number | null | undefined): string {
    const mode = orbitRangeModeFromKm(maxDistanceKm)
    if (mode === 'worldwide') return 'Worldwide'
    if (mode === 'country') return 'Country'
    if (mode === 'city') return 'City'
    const km = maxDistanceKm ?? 25
    return km < 40 ? `${km} km` : 'Nearby'
}

export function orbitRingForDistance(distanceKm: number | null, maxKm: number): 1 | 2 | 3 {
    if (distanceKm == null || !Number.isFinite(distanceKm)) return 3
    const mode = orbitRangeModeFromKm(maxKm)
    const cap =
        mode === 'worldwide' ? 5000 :
        mode === 'country' ? 2500 :
        mode === 'city' ? 50 :
        Math.max(Math.min(maxKm >= 85 ? 25 : maxKm, 80), 5)
    if (distanceKm <= cap / 3) return 1
    if (distanceKm <= (cap * 2) / 3) return 2
    return 3
}

export function roundDistanceKm(km: number): number {
    if (km < 1) return Math.round(km * 10) / 10
    return Math.round(km)
}
