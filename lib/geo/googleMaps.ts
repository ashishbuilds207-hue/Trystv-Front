/**
 * Google Maps helpers (Geocoding + optional Distance Matrix).
 * Falls back to OpenStreetMap Nominatim when Google Geocoding is not enabled.
 */

function mapsKey() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    if (!key || key === 'your_google_maps_key' || key === 'your_google_maps_api_key') return null
    return key
}

type AddressComponent = { long_name: string; types: string[] }

export type ReversePlace = {
    /** Sector / neighbourhood / suburb (most specific) */
    area: string | null
    /** Broader city */
    city: string | null
    country: string | null
    /** Ready-to-show label for the location field (no coords, no country) */
    label: string | null
    formattedAddress: string | null
}

function buildLabel(area: string | null, city: string | null): string | null {
    if (area && city && area.toLowerCase() !== city.toLowerCase()) return `${area}, ${city}`
    return area || city || null
}

function pickFromGoogleComps(comps: AddressComponent[]) {
    const find = (...types: string[]) =>
        comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name || null

    const area =
        find('neighborhood', 'neighbourhood') ||
        find('sublocality_level_1', 'sublocality') ||
        find('sublocality_level_2') ||
        find('premise') ||
        null

    const city =
        find('locality') ||
        find('administrative_area_level_3') ||
        find('administrative_area_level_2') ||
        find('postal_town') ||
        null

    const country = find('country')
    return { area, city, country }
}

function pickCityCountry(comps: AddressComponent[]) {
    const find = (...types: string[]) =>
        comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name || null
    const city =
        find('locality') ||
        find('administrative_area_level_2') ||
        find('administrative_area_level_1') ||
        find('sublocality', 'sublocality_level_1')
    const country = find('country')
    return { city, country }
}

export async function reverseGeocodeCity(lat: number, lng: number): Promise<ReversePlace> {
    const google = await reverseGeocodeGoogle(lat, lng)
    if (google.label) return google

    const osm = await reverseGeocodeNominatim(lat, lng)
    if (osm.label) return osm

    return google.formattedAddress ? google : osm
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<ReversePlace> {
    const key = mapsKey()
    if (!key) return { area: null, city: null, country: null, label: null, formattedAddress: null }

    try {
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
        url.searchParams.set('latlng', `${lat},${lng}`)
        url.searchParams.set('key', key)
        const res = await fetch(url.toString())
        const json = (await res.json()) as {
            status?: string
            error_message?: string
            results?: Array<{
                formatted_address?: string
                address_components?: AddressComponent[]
            }>
        }
        if (json.status !== 'OK' || !json.results?.length) {
            console.warn('[geocode google]', json.status, json.error_message)
            return { area: null, city: null, country: null, label: null, formattedAddress: null }
        }

        let best = json.results[0]
        for (const r of json.results) {
            const comps = r.address_components || []
            if (
                comps.some((c) =>
                    c.types.some((t) =>
                        ['neighborhood', 'sublocality', 'sublocality_level_1', 'sublocality_level_2'].includes(t),
                    ),
                )
            ) {
                best = r
                break
            }
        }

        const place = pickFromGoogleComps(best.address_components || [])
        const formatted = best.formatted_address || null
        const label = buildLabel(place.area, place.city)
        return {
            area: place.area,
            city: place.city,
            country: place.country,
            label: label || (formatted ? formatted.split(',').slice(0, 2).join(',').trim() : null),
            formattedAddress: formatted,
        }
    } catch (e) {
        console.warn('[geocode google]', e)
        return { area: null, city: null, country: null, label: null, formattedAddress: null }
    }
}

/** Free fallback — high zoom for sector / neighbourhood names */
async function reverseGeocodeNominatim(lat: number, lng: number): Promise<ReversePlace> {
    try {
        const url = new URL('https://nominatim.openstreetmap.org/reverse')
        url.searchParams.set('lat', String(lat))
        url.searchParams.set('lon', String(lng))
        url.searchParams.set('format', 'json')
        url.searchParams.set('zoom', '18')
        url.searchParams.set('addressdetails', '1')
        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'TRYST-App/1.0 (local-dev)',
                Accept: 'application/json',
            },
            next: { revalidate: 0 },
        })
        const json = (await res.json()) as {
            display_name?: string
            address?: {
                neighbourhood?: string
                neighborhood?: string
                suburb?: string
                quarter?: string
                residential?: string
                city_district?: string
                borough?: string
                city?: string
                town?: string
                village?: string
                municipality?: string
                county?: string
                state_district?: string
                state?: string
                country?: string
            }
        }
        const a = json.address || {}
        const area =
            a.neighbourhood ||
            a.neighborhood ||
            a.suburb ||
            a.quarter ||
            a.residential ||
            a.city_district ||
            a.borough ||
            null
        const city =
            a.city ||
            a.town ||
            a.village ||
            a.municipality ||
            a.state_district ||
            a.county ||
            null
        return {
            area,
            city,
            country: a.country || null,
            label: buildLabel(area, city),
            formattedAddress: json.display_name || null,
        }
    } catch (e) {
        console.warn('[geocode nominatim]', e)
        return { area: null, city: null, country: null, label: null, formattedAddress: null }
    }
}

export type PlaceSuggestion = {
    label: string
    city: string | null
    country: string | null
    latitude: number
    longitude: number
}

const COUNTRY_CODES: Record<string, string> = {
    india: 'in',
    'united states': 'us',
    usa: 'us',
    'united kingdom': 'gb',
    uk: 'gb',
    canada: 'ca',
    australia: 'au',
    uae: 'ae',
    'united arab emirates': 'ae',
    singapore: 'sg',
    germany: 'de',
    france: 'fr',
    pakistan: 'pk',
    bangladesh: 'bd',
    nepal: 'np',
    'sri lanka': 'lk',
}

/** Typeahead place suggestions, biased to user's country / nearby coords. */
export async function suggestPlaces(opts: {
    query: string
    country?: string | null
    latitude?: number | null
    longitude?: number | null
    limit?: number
}): Promise<PlaceSuggestion[]> {
    const q = opts.query.trim()
    if (q.length < 2) return []

    const limit = Math.min(opts.limit ?? 6, 8)
    const countryCode = opts.country
        ? COUNTRY_CODES[opts.country.trim().toLowerCase()] || null
        : null

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', q)
        url.searchParams.set('format', 'json')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('limit', String(limit))
        if (countryCode) url.searchParams.set('countrycodes', countryCode)
        // Prefer places near the user when we have GPS
        if (
            opts.latitude != null &&
            opts.longitude != null &&
            Number.isFinite(opts.latitude) &&
            Number.isFinite(opts.longitude)
        ) {
            const d = 0.8
            url.searchParams.set(
                'viewbox',
                `${opts.longitude - d},${opts.latitude + d},${opts.longitude + d},${opts.latitude - d}`,
            )
            url.searchParams.set('bounded', '0')
        }

        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'TRYST-App/1.0 (local-dev)',
                Accept: 'application/json',
            },
        })
        const json = (await res.json()) as Array<{
            lat?: string
            lon?: string
            display_name?: string
            address?: {
                neighbourhood?: string
                suburb?: string
                city_district?: string
                city?: string
                town?: string
                village?: string
                state?: string
                country?: string
            }
        }>

        const out: PlaceSuggestion[] = []
        const seen = new Set<string>()
        for (const row of json || []) {
            const lat = row.lat ? Number(row.lat) : NaN
            const lon = row.lon ? Number(row.lon) : NaN
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
            const a = row.address || {}
            const area = a.neighbourhood || a.suburb || a.city_district || null
            const city = a.city || a.town || a.village || null
            const label =
                area && city && area.toLowerCase() !== city.toLowerCase()
                    ? `${area}, ${city}`
                    : area ||
                      city ||
                      (row.display_name
                          ? row.display_name.split(',').slice(0, 2).join(',').trim()
                          : null)
            if (!label) continue
            const key = label.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            out.push({
                label,
                city: city || label,
                country: a.country || opts.country || null,
                latitude: lat,
                longitude: lon,
            })
        }
        return out
    } catch (e) {
        console.warn('[suggest places]', e)
        return []
    }
}

/** City/place name → coordinates (fallback when GPS is denied). */
export async function forwardGeocodeCity(query: string): Promise<{
    city: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
}> {
    const key = mapsKey()
    const q = query.trim()
    if (!q) return { city: null, country: null, latitude: null, longitude: null }

    if (key) {
        try {
            const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
            url.searchParams.set('address', q)
            url.searchParams.set('key', key)
            const res = await fetch(url.toString())
            const json = (await res.json()) as {
                status?: string
                results?: Array<{
                    address_components?: AddressComponent[]
                    geometry?: { location?: { lat: number; lng: number } }
                }>
            }
            if (json.status === 'OK' && json.results?.[0]) {
                const top = json.results[0]
                const place = pickCityCountry(top.address_components || [])
                return {
                    city: place.city || q,
                    country: place.country,
                    latitude: top.geometry?.location?.lat ?? null,
                    longitude: top.geometry?.location?.lng ?? null,
                }
            }
        } catch {
            /* fall through to Nominatim */
        }
    }

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', q)
        url.searchParams.set('format', 'json')
        url.searchParams.set('limit', '1')
        url.searchParams.set('addressdetails', '1')
        const res = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'TRYST-App/1.0 (local-dev)',
                Accept: 'application/json',
            },
        })
        const json = (await res.json()) as Array<{
            lat?: string
            lon?: string
            display_name?: string
            address?: {
                city?: string
                town?: string
                village?: string
                country?: string
            }
        }>
        const top = json?.[0]
        if (!top) return { city: q, country: null, latitude: null, longitude: null }
        const a = top.address || {}
        return {
            city: a.city || a.town || a.village || q,
            country: a.country || null,
            latitude: top.lat ? Number(top.lat) : null,
            longitude: top.lon ? Number(top.lon) : null,
        }
    } catch {
        return { city: q, country: null, latitude: null, longitude: null }
    }
}

/**
 * Driving/walking distance via Distance Matrix (falls back to null on error).
 * Prefer haversine for bulk orbit filtering; use this when you need road distance for a few pairs.
 */
export async function googleDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
): Promise<number | null> {
    const key = mapsKey()
    if (!key) return null

    try {
        const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
        url.searchParams.set('origins', `${origin.lat},${origin.lng}`)
        url.searchParams.set('destinations', `${destination.lat},${destination.lng}`)
        url.searchParams.set('units', 'metric')
        url.searchParams.set('key', key)
        const res = await fetch(url.toString())
        const json = (await res.json()) as {
            status?: string
            rows?: Array<{
                elements?: Array<{ status?: string; distance?: { value: number } }>
            }>
        }
        const el = json.rows?.[0]?.elements?.[0]
        if (json.status !== 'OK' || el?.status !== 'OK' || el.distance?.value == null) return null
        return el.distance.value / 1000
    } catch {
        return null
    }
}
