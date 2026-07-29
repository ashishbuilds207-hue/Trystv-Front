import type { RazorpayCheckoutOptions } from '@/lib/razorpay'

export interface RazorpayCheckoutParams {
    keyId: string
    orderId: string
    amount: number
    currency: string
    label: string
    prefill?: { name?: string; email?: string; contact?: string }
    handler: RazorpayCheckoutOptions['handler']
    onDismiss?: () => void
}

/** Checkout config — forces Card, UPI (QR + apps), Netbanking, Wallets to appear when enabled on your Razorpay account. */
export function buildRazorpayCheckoutOptions(params: RazorpayCheckoutParams): RazorpayCheckoutOptions {
    return {
        key: params.keyId,
        amount: params.amount * 100,
        currency: params.currency || 'INR',
        name: 'TRYST',
        description: params.label,
        order_id: params.orderId,
        image: `${typeof window !== 'undefined' ? window.location.origin : ''}/favicon.ico`,
        prefill: params.prefill,
        theme: { color: '#C0392B', backdrop_color: '#1a1412' },
        config: {
            display: {
                blocks: {
                    card: {
                        name: 'Credit / Debit Card',
                        instruments: [{ method: 'card' }],
                    },
                    upi: {
                        name: 'UPI — Scan QR or pay with apps',
                        instruments: [{ method: 'upi' }],
                    },
                    nb: {
                        name: 'Netbanking',
                        instruments: [{ method: 'netbanking' }],
                    },
                    wallet: {
                        name: 'Wallets',
                        instruments: [{ method: 'wallet' }],
                    },
                },
                sequence: ['block.upi', 'block.card', 'block.nb', 'block.wallet'],
                preferences: {
                    show_default_blocks: true,
                },
            },
        },
        retry: { enabled: true, max_count: 3 },
        handler: params.handler,
        modal: {
            confirm_close: true,
            ondismiss: params.onDismiss,
        },
    }
}
