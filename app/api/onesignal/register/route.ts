import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/onesignal/register
 * Saves OneSignal player / subscription ids on the authenticated user.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const playerId = body.playerId != null ? String(body.playerId) : null
        const subscriptionId = body.subscriptionId != null ? String(body.subscriptionId) : null

        const patch: Record<string, string | null> = {}
        if (playerId !== undefined && body.playerId !== undefined) patch.onesignal_player_id = playerId
        if (subscriptionId !== undefined && body.subscriptionId !== undefined) {
            patch.onesignal_subscription_id = subscriptionId
        }
        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 })
        }

        const sb = createServiceClient()
        const { error } = await sb.from('users').update(patch).eq('id', user.id)
        if (error) {
            // Column may not exist yet — surface clear message
            console.error('[onesignal/register]', error.message)
            return NextResponse.json(
                {
                    success: false,
                    message: error.message.includes('onesignal')
                        ? 'Run supabase/onesignal_player_id.sql in Supabase SQL Editor'
                        : error.message,
                },
                { status: 400 },
            )
        }

        return NextResponse.json({ success: true, data: { saved: true } })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Register failed'
        console.error('[onesignal/register]', e)
        return NextResponse.json({ success: false, message: msg }, { status: 500 })
    }
}
