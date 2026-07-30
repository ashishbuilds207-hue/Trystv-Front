import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, createServiceClient } from '@/lib/supabase/server'
import { sendOneSignalPush } from '@/lib/onesignal/server'
import type { OneSignalNotifyKind } from '@/lib/onesignal/types'

const KINDS = new Set<OneSignalNotifyKind>([
    'message',
    'audio_call',
    'video_call',
    'match',
    'like',
    'generic',
])

/**
 * POST /api/onesignal/notify
 * Authenticated sender → push to recipient (external_id = TRYST user id).
 * Body: { toUserId, kind, title, body, matchId?, callId?, mode? }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const toUserId = String(body.toUserId || '')
        const kind = body.kind as OneSignalNotifyKind
        const title = String(body.title || '').slice(0, 120)
        const text = String(body.body || '').slice(0, 240)
        const matchId = body.matchId ? String(body.matchId) : undefined
        const callId = body.callId ? String(body.callId) : undefined
        const mode = body.mode === 'video' ? 'video' : body.mode === 'audio' ? 'audio' : undefined

        if (!toUserId || !KINDS.has(kind) || !title || !text) {
            return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
        }
        if (toUserId === user.id) {
            return NextResponse.json({ success: false, message: 'Cannot notify yourself' }, { status: 400 })
        }

        // If matchId provided, ensure sender belongs to that match with recipient
        if (matchId) {
            const sb = createServiceClient()
            const { data: match } = await sb.from('matches').select('user1_id, user2_id').eq('id', matchId).single()
            if (!match) {
                return NextResponse.json({ success: false, message: 'Match not found' }, { status: 404 })
            }
            const ids = [match.user1_id, match.user2_id]
            if (!ids.includes(user.id) || !ids.includes(toUserId)) {
                return NextResponse.json({ success: false, message: 'Not allowed' }, { status: 403 })
            }
        }

        const result = await sendOneSignalPush({
            toUserId,
            kind,
            title,
            body: text,
            matchId,
            callId,
            mode,
            data: { fromUserId: user.id },
        })

        return NextResponse.json({ success: result.ok || result.skipped, data: result })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Notify failed'
        console.error('[onesignal/notify]', e)
        return NextResponse.json({ success: false, message: msg }, { status: 500 })
    }
}
