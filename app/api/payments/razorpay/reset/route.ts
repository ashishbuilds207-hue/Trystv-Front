import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getRequestUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const admin = createServiceClient()
        await admin.from('subscriptions').delete().eq('user_id', user.id)
        await admin.from('users').update({
            is_gold: false,
            is_obsidian: false,
            credits: 10,
        }).eq('id', user.id)

        return NextResponse.json({ success: true, data: { reset: true } })
    } catch (e: unknown) {
        return NextResponse.json({
            success: false,
            message: e instanceof Error ? e.message : 'Reset failed',
        }, { status: 500 })
    }
}
