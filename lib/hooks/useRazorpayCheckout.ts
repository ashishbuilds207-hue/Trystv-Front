'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { subscriptionApi } from '@/lib/api/auth'
import { loadRazorpayScript } from '@/lib/razorpay'
import { buildRazorpayCheckoutOptions } from '@/lib/razorpayCheckoutConfig'
import { publicConfig } from '@/lib/config'
import { useToast } from '@/lib/hooks/useToast'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { getApiErrorMessage } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/client'

interface OrderPayload {
    orderId: string
    plan: string
    amount: number
    currency: string
    keyId?: string | null
    label?: string
    mock?: boolean
}

export function useRazorpayCheckout() {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
    const toast = useToast()
    const qc = useQueryClient()
    const router = useRouter()
    const { data: me } = useAuthUser()

    const checkout = useCallback(async (plan: string) => {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) {
            toast.info('Sign in required', 'Log in to upgrade your plan')
            router.push('/login?redirect=/gold')
            return
        }

        setLoadingPlan(plan)
        try {
            const { data } = await subscriptionApi.createOrder(plan)
            const payload = data.data as OrderPayload

            if (payload.mock) {
                await subscriptionApi.verifyPayment({
                    plan: payload.plan,
                    orderId: payload.orderId,
                    paymentId: `dev_pay_${Date.now()}`,
                })
                toast.success('Plan activated', 'Dev mock payment — add Razorpay keys for real checkout')
                await qc.invalidateQueries({ queryKey: ['me'] })
                await qc.invalidateQueries({ queryKey: ['profile', 'me'] })
                return
            }

            const keyId = payload.keyId || publicConfig.razorpayKeyId
            if (!keyId) {
                toast.error('Payments unavailable', 'Add NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local and restart frontend')
                return
            }

            const loaded = await loadRazorpayScript()
            if (!loaded || !window.Razorpay) {
                toast.error('Could not load checkout', 'Check your connection and try again')
                return
            }

            await new Promise<void>((resolve) => {
                const options = buildRazorpayCheckoutOptions({
                    keyId,
                    orderId: payload.orderId,
                    amount: payload.amount,
                    currency: payload.currency,
                    label: payload.label || payload.plan.replace(/_/g, ' '),
                    prefill: {
                        name: me?.alias ? String(me.alias) : undefined,
                        email: me?.email ? String(me.email) : undefined,
                        contact: me?.phone ? String(me.phone) : undefined,
                    },
                    onDismiss: () => resolve(),
                    handler: async (response) => {
                        try {
                            await subscriptionApi.verifyPayment({
                                plan: payload.plan,
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            })
                            toast.success('Payment successful', 'Your plan is now active')
                            await qc.invalidateQueries({ queryKey: ['me'] })
                            await qc.invalidateQueries({ queryKey: ['profile', 'me'] })
                        } catch (e) {
                            toast.error('Verification failed', getApiErrorMessage(e, 'Contact support if you were charged'))
                        } finally {
                            resolve()
                        }
                    },
                })

                const rzp = new window.Razorpay(options)

                rzp.on('payment.failed', (res) => {
                    toast.error('Payment failed', res.error?.description || 'Please try again')
                    resolve()
                })

                rzp.open()
            })
        } catch (e) {
            toast.error('Checkout failed', getApiErrorMessage(e, 'Could not start payment'))
        } finally {
            setLoadingPlan(null)
        }
    }, [toast, qc, router, me?.alias, me?.email, me?.phone])

    return {
        checkout,
        loadingPlan,
        isLoading: loadingPlan !== null,
    }
}
