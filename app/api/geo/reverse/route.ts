import { NextResponse } from 'next/server'
import { reverseGeocodeCity } from '@/lib/geo/googleMaps'

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { latitude?: number; longitude?: number }
        const lat = Number(body.latitude)
        const lng = Number(body.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return NextResponse.json({ success: false, message: 'latitude and longitude required' }, { status: 400 })
        }
        const place = await reverseGeocodeCity(lat, lng)
        return NextResponse.json({
            success: true,
            data: {
                /** Sector / area name for the location field */
                label: place.label,
                area: place.area,
                city: place.city,
                country: place.country,
                formattedAddress: place.formattedAddress,
                latitude: lat,
                longitude: lng,
            },
        })
    } catch (e: unknown) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Geocode failed' },
            { status: 500 },
        )
    }
}
