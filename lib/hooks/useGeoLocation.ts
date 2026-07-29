'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/lib/api/auth'
import { useAuthUser } from './useAuth'

const SESSION_KEY = 'tryst_geo_synced'

function getPosition(highAccuracy = false): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation not supported'))
            return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout: 10000,
            maximumAge: 5 * 60 * 1000,
        })
    })
}

async function reverseCity(lat: number, lng: number) {
    try {
        const res = await fetch('/api/geo/reverse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng }),
        })
        const json = await res.json()
        return {
            city: (json?.data?.city as string | null) || null,
            country: (json?.data?.country as string | null) || null,
        }
    } catch {
        return { city: null, country: null }
    }
}

async function syncLocation(pos: GeolocationPosition) {
    const latitude = pos.coords.latitude
    const longitude = pos.coords.longitude
    const place = await reverseCity(latitude, longitude)
    const patch: Record<string, unknown> = { latitude, longitude }
    if (place.city) patch.city = place.city
    if (place.country) patch.country = place.country
    await userApi.updateProfile(patch)
    return { latitude, longitude, ...place }
}

/**
 * On app open, silently capture the user's coordinates (once per session) and
 * sync them to the profile so the orbit feed can show people nearby.
 */
export function useAutoLocation() {
    const qc = useQueryClient()
    const { data: me } = useAuthUser()
    const attempted = useRef(false)

    useEffect(() => {
        if (attempted.current || !me) return
        if (typeof window === 'undefined' || !navigator.geolocation) return
        if (sessionStorage.getItem(SESSION_KEY)) return
        attempted.current = true

        getPosition(false)
            .then(async (pos) => {
                sessionStorage.setItem(SESSION_KEY, '1')
                await syncLocation(pos)
                qc.invalidateQueries({ queryKey: ['me'] })
                qc.invalidateQueries({ queryKey: ['profile', 'me'] })
                qc.invalidateQueries({ queryKey: ['orbit-feed'] })
                qc.invalidateQueries({ queryKey: ['discover'] })
            })
            .catch(() => { /* permission denied or unavailable — silent */ })
    }, [me, qc])
}

/** Manual "use my location" trigger (e.g. from the Orbit filters). */
export function useUpdateLocation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async () => {
            const pos = await getPosition(true)
            return syncLocation(pos)
        },
        onSuccess: () => {
            sessionStorage.setItem(SESSION_KEY, '1')
            qc.invalidateQueries({ queryKey: ['me'] })
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            qc.invalidateQueries({ queryKey: ['orbit-feed'] })
            qc.invalidateQueries({ queryKey: ['discover'] })
        },
    })
}
