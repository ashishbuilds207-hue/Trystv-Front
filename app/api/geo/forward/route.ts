import { NextResponse } from 'next/server'
import { forwardGeocodeCity } from '@/lib/geo/googleMaps'

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { city?: string; query?: string }
        const query = (body.city || body.query || '').trim()
        if (!query) {
            return NextResponse.json({ success: false, message: 'city required' }, { status: 400 })
        }
        const place = await forwardGeocodeCity(query)
        return NextResponse.json({ success: true, data: place })
    } catch (e: unknown) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Geocode failed' },
            { status: 500 },
        )
    }
}
