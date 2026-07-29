import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient, getRequestUser } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { plan, orderId, paymentId, signature } = body as {
            plan: string
            orderId: string
            paymentId: string
            signature?: string
        }

        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET
        const isDevMock = String(orderId).startsWith('dev_order_')

        if (!isDevMock) {
            if (!keySecret || !signature) {
                return NextResponse.json({ success: false, message: 'Missing payment signature' }, { status: 400 })
            }
            const expected = crypto
                .createHmac('sha256', keySecret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')
            if (expected !== signature) {
                return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 })
            }
        }

        const admin = createServiceClient()
        const { data, error } = await admin.rpc('activate_plan', {
            p_user_id: user.id,
            p_plan: plan,
            p_order_id: orderId,
            p_payment_id: paymentId,
        })
        if (error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: data || { activated: true, plan },
            message: isDevMock ? 'Payment verified (dev mock)' : 'Payment verified',
        })
    } catch (e: unknown) {
        console.error('[razorpay/verify]', e)
        return NextResponse.json({
            success: false,
            message: e instanceof Error ? e.message : 'Verify failed',
        }, { status: 500 })
    }
}
