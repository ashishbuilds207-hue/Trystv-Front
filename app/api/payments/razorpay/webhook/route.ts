import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Razorpay → Next.js webhook → Supabase
 * Configure in Razorpay Dashboard: payment.captured
 */
export async function POST(req: NextRequest) {
    try {
        const raw = await req.text()
        const signature = req.headers.get('x-razorpay-signature') || ''
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET

        if (secret) {
            const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
            if (expected !== signature) {
                return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 400 })
            }
        }

        const event = JSON.parse(raw) as {
            event?: string
            payload?: {
                payment?: {
                    entity?: {
                        order_id?: string
                        id?: string
                        notes?: { plan?: string; userId?: string }
                    }
                }
            }
        }

        if (event.event !== 'payment.captured') {
            return NextResponse.json({ success: true, ignored: true })
        }

        const payment = event.payload?.payment?.entity
        const userId = payment?.notes?.userId
        const plan = payment?.notes?.plan
        if (!userId || !plan) {
            return NextResponse.json({ success: true, skipped: true, reason: 'missing notes' })
        }

        const admin = createServiceClient()
        const { error } = await admin.rpc('activate_plan', {
            p_user_id: userId,
            p_plan: plan,
            p_order_id: payment?.order_id || null,
            p_payment_id: payment?.id || null,
        })
        if (error) {
            console.error('[webhook] activate_plan', error)
            return NextResponse.json({ success: false, message: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, activated: true })
    } catch (e: unknown) {
        console.error('[razorpay/webhook]', e)
        return NextResponse.json({
            success: false,
            message: e instanceof Error ? e.message : 'Webhook error',
        }, { status: 500 })
    }
}
