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

/** Worldwide when max distance is 100+ km in the UI */
export function isWorldwide(maxDistanceKm: number | null | undefined): boolean {
    return (maxDistanceKm ?? 50) >= 100
}

export function orbitRingForDistance(distanceKm: number | null, maxKm: number): 1 | 2 | 3 {
    if (distanceKm == null || !Number.isFinite(distanceKm)) return 3
    const cap = Math.max(maxKm, 5)
    if (distanceKm <= cap / 3) return 1
    if (distanceKm <= (cap * 2) / 3) return 2
    return 3
}

export function roundDistanceKm(km: number): number {
    if (km < 1) return Math.round(km * 10) / 10
    return Math.round(km)
}
