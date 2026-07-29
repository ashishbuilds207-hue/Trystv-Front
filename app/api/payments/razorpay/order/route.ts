import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { getRequestUser } from '@/lib/supabase/server'

const PLANS: Record<string, { price: number; label: string }> = {
    gold_monthly: { price: 999, label: 'TRYST Gold Monthly' },
    gold_annual: { price: 3999, label: 'TRYST Gold Annual' },
    obsidian: { price: 4999, label: 'TRYST Obsidian' },
    credits_50: { price: 499, label: '50 Message Credits' },
    credits_150: { price: 1299, label: '150 Message Credits' },
    boost: { price: 199, label: 'Profile Boost' },
    incognito: { price: 299, label: 'Incognito Mode (7 days)' },
}

export async function POST(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const { plan } = await req.json()
        if (!PLANS[plan]) {
            return NextResponse.json({ success: false, message: 'Invalid plan' }, { status: 400 })
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
        const keySecret = process.env.RAZORPAY_KEY_SECRET

        if (!keyId || !keySecret) {
            return NextResponse.json({
                success: true,
                data: {
                    orderId: `dev_order_${Date.now()}`,
                    plan,
                    amount: PLANS[plan].price,
                    currency: 'INR',
                    keyId: null,
                    mock: true,
                    label: PLANS[plan].label,
                },
            })
        }

        const rp = new Razorpay({ key_id: keyId, key_secret: keySecret })
        const order = await rp.orders.create({
            amount: PLANS[plan].price * 100,
            currency: 'INR',
            receipt: `tryst_${Date.now()}`.slice(0, 40),
            notes: { plan, userId: user.id },
        })

        return NextResponse.json({
            success: true,
            data: {
                orderId: order.id,
                plan,
                amount: PLANS[plan].price,
                currency: 'INR',
                keyId,
                label: PLANS[plan].label,
            },
        })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Payment gateway error'
        console.error('[razorpay/order]', e)
        return NextResponse.json({ success: false, message: msg }, { status: 500 })
    }
}
