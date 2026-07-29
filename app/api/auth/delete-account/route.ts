import { NextResponse } from 'next/server'
import { createServiceClient, getRequestUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function DELETE(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const admin = createServiceClient()
        await admin.from('users').delete().eq('id', user.id)
        await admin.auth.admin.deleteUser(user.id)

        return NextResponse.json({ success: true, data: { deleted: true } })
    } catch (e: unknown) {
        return NextResponse.json({
            success: false,
            message: e instanceof Error ? e.message : 'Delete failed',
        }, { status: 500 })
    }
}
