import { NextResponse } from 'next/server'
import { suggestPlaces } from '@/lib/geo/googleMaps'

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            query?: string
            country?: string | null
            latitude?: number | null
            longitude?: number | null
        }
        const query = (body.query || '').trim()
        if (query.length < 2) {
            return NextResponse.json({ success: true, data: { suggestions: [] } })
        }
        const suggestions = await suggestPlaces({
            query,
            country: body.country,
            latitude: body.latitude,
            longitude: body.longitude,
            limit: 6,
        })
        return NextResponse.json({ success: true, data: { suggestions } })
    } catch (e: unknown) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Suggest failed' },
            { status: 500 },
        )
    }
}
