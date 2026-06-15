import type { PulseCity } from '@/lib/hooks/useFeatures'

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    Mumbai: { lat: 19.076, lng: 72.877 },
    Delhi: { lat: 28.613, lng: 77.209 },
    Bengaluru: { lat: 12.971, lng: 77.594 },
    Bangalore: { lat: 12.971, lng: 77.594 },
    Dubai: { lat: 25.204, lng: 55.271 },
    Singapore: { lat: 1.352, lng: 103.819 },
    London: { lat: 51.507, lng: -0.128 },
    'New York': { lat: 40.713, lng: -74.006 },
    Paris: { lat: 48.856, lng: 2.352 },
    Tokyo: { lat: 35.676, lng: 139.650 },
    Berlin: { lat: 52.520, lng: 13.405 },
    Sydney: { lat: -33.868, lng: 151.209 },
    'São Paulo': { lat: -23.550, lng: -46.633 },
    Toronto: { lat: 43.653, lng: -79.383 },
    Kolkata: { lat: 22.573, lng: 88.364 },
    Hyderabad: { lat: 17.385, lng: 78.487 },
    Chennai: { lat: 13.083, lng: 80.270 },
    Pune: { lat: 18.520, lng: 73.857 },
}

export function getCoords(city: PulseCity) {
    return CITY_COORDS[city.city] || { lat: city.lat, lng: city.lon }
}

export function cityCoords(name: string, cities: PulseCity[]) {
    if (CITY_COORDS[name]) return CITY_COORDS[name]
    const c = cities.find(x => x.city === name)
    return c ? getCoords(c) : null
}
