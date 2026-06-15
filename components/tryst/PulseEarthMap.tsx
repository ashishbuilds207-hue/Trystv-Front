'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import type { PulseCity } from '@/lib/hooks/useFeatures'
import { CITY_COORDS, getCoords } from '@/lib/pulseCities'
import Globe3D from './Globe3D'

export { CITY_COORDS } from '@/lib/pulseCities'

function LocationSearch({
    cities,
    selectedCity,
    onSelect,
    useGeocoder,
    compact,
    forceOpen,
    onForceOpenChange,
}: {
    cities: PulseCity[]
    selectedCity?: string | null
    onSelect: (city: string, coords?: { lat: number; lng: number }) => void
    useGeocoder?: boolean
    compact?: boolean
    forceOpen?: boolean
    onForceOpenChange?: (open: boolean) => void
}) {
    const [open, setOpen] = useState(compact ? false : true)
    const [query, setQuery] = useState('')
    const [geocoding, setGeocoding] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const allCities = useMemo(() => {
        const fromPulse = cities.map(c => ({ name: c.city, count: c.count, coords: getCoords(c) }))
        const known = Object.keys(CITY_COORDS)
            .filter(name => !cities.some(c => c.city === name))
            .map(name => ({ name, count: 0, coords: CITY_COORDS[name] }))
        return [...fromPulse, ...known].sort((a, b) => b.count - a.count)
    }, [cities])

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return allCities.slice(0, 8)
        return allCities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
    }, [query, allCities])

    const pick = (name: string, coords: { lat: number; lng: number }) => {
        onSelect(name, coords)
        setQuery('')
        if (compact) { setOpen(false); onForceOpenChange?.(false) }
    }

    const closeSearch = () => {
        setOpen(false)
        setQuery('')
        onForceOpenChange?.(false)
    }

    const geocodeSearch = () => {
        const q = query.trim()
        if (!q || !useGeocoder || !window.google?.maps) return
        setGeocoding(true)
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ address: q }, (res, status) => {
            setGeocoding(false)
            if (status !== 'OK' || !res?.[0]) return
            const loc = res[0].geometry.location
            const locality = res[0].address_components?.find(c =>
                c.types.includes('locality') || c.types.includes('administrative_area_level_1')
            )?.long_name
            pick(locality || res[0].formatted_address.split(',')[0], { lat: loc.lat(), lng: loc.lng() })
        })
    }

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    useEffect(() => {
        if (forceOpen && compact) setOpen(true)
    }, [forceOpen, compact])

    if (compact && !open) {
        return (
            <button
                onClick={() => { setOpen(true); onForceOpenChange?.(true) }}
                className="map-ctrl-btn w-10 h-10"
                aria-label="Search location"
            >
                <Search className="w-4 h-4" />
            </button>
        )
    }

    return (
        <div className={`${compact ? 'absolute top-3 left-3 right-14 z-20' : 'mx-4 mb-3'} animate-fade-in`}>
            <div className="relative">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
                    <Search className="w-4 h-4 text-gold-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (results[0]) pick(results[0].name, results[0].coords)
                                else geocodeSearch()
                            }
                            if (e.key === 'Escape') closeSearch()
                        }}
                        placeholder="Search city or place…"
                        className="flex-1 bg-transparent text-sm text-ivory-100 placeholder:text-ivory-600 outline-none min-w-0"
                    />
                    {geocoding && <Loader2 className="w-4 h-4 text-crimson animate-spin flex-shrink-0" />}
                    {compact && (
                        <button onClick={closeSearch}
                            className="text-ivory-500 hover:text-ivory-200 p-1">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {(query || open) && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 max-h-52 overflow-y-auto">
                        {results.map(r => (
                            <button
                                key={r.name}
                                onClick={() => pick(r.name, r.coords)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                                    selectedCity === r.name ? 'bg-gold/10 text-gold-300' : 'text-ivory-200'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-crimson-400" />
                                    {r.name}
                                </span>
                                {r.count > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/20 text-crimson-300">
                                        {r.count} active
                                    </span>
                                )}
                            </button>
                        ))}
                        {useGeocoder && query.trim() && !results.some(r => r.name.toLowerCase() === query.trim().toLowerCase()) && (
                            <button
                                onClick={geocodeSearch}
                                className="w-full px-4 py-2.5 text-left text-sm text-gold-400 hover:bg-white/5 border-t border-white/5"
                            >
                                Search &ldquo;{query}&rdquo; on map →
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function CityChips({ cities, selectedCity, onCitySelect }: {
    cities: PulseCity[]
    selectedCity?: string | null
    onCitySelect?: (city: string) => void
}) {
    return (
        <div className="mx-4 mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {cities.slice(0, 12).map(c => (
                <button key={c.city} onClick={() => onCitySelect?.(c.city)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        selectedCity === c.city
                            ? 'bg-gold/20 border-gold/50 text-gold-300 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                            : 'bg-tryst-card border-tryst-border text-ivory-400 hover:border-crimson/40 hover:text-ivory-200'
                    }`}>
                    <MapPin className="w-3 h-3" />
                    {c.city}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedCity === c.city ? 'bg-gold/30 text-gold-200' : 'bg-crimson/20 text-crimson-300'
                    }`}>{c.count}</span>
                </button>
            ))}
        </div>
    )
}

interface Props {
    cities: PulseCity[]
    totalActive: number
    userCity?: string
    onCitySelect?: (city: string | null) => void
    selectedCity?: string | null
    searchOpen?: boolean
    onSearchOpenChange?: (open: boolean) => void
}

export default function PulseEarthMap({
    cities, totalActive, userCity, onCitySelect, selectedCity, searchOpen, onSearchOpenChange,
}: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    const handleLocationPick = useCallback((city: string) => {
        onCitySelect?.(city)
        onSearchOpenChange?.(false)
    }, [onCitySelect, onSearchOpenChange])

    const handleCitySelect = useCallback((city: string | null) => {
        onCitySelect?.(city)
    }, [onCitySelect])

    const searchBlock = searchOpen ? (
        apiKey ? (
            <APIProvider apiKey={apiKey}>
                <LocationSearch
                    cities={cities}
                    selectedCity={selectedCity}
                    useGeocoder
                    onSelect={handleLocationPick}
                />
            </APIProvider>
        ) : (
            <LocationSearch
                cities={cities}
                selectedCity={selectedCity}
                onSelect={handleLocationPick}
            />
        )
    ) : null

    return (
        <>
            {searchBlock}
            <Globe3D
                cities={cities}
                totalActive={totalActive}
                selectedCity={selectedCity}
                onCitySelect={(c) => handleCitySelect(c)}
                userCity={userCity}
            />
            <CityChips cities={cities} selectedCity={selectedCity} onCitySelect={(c) => handleCitySelect(c)} />
        </>
    )
}
