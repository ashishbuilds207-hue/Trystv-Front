declare global {
    interface Window {
        Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayInstance
    }
}

export interface RazorpayCheckoutOptions {
    key: string
    amount: number
    currency: string
    name: string
    description?: string
    order_id: string
    image?: string
    prefill?: { name?: string; email?: string; contact?: string }
    theme?: { color?: string; backdrop_color?: string }
    config?: {
        display?: {
            blocks?: Record<string, { name: string; instruments: { method: string }[] }>
            sequence?: string[]
            preferences?: { show_default_blocks?: boolean }
        }
    }
    retry?: { enabled: boolean; max_count: number }
    handler: (response: RazorpaySuccessResponse) => void
    modal?: { confirm_close?: boolean; ondismiss?: () => void }
}

export interface RazorpaySuccessResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
}

export interface RazorpayInstance {
    open: () => void
    on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

export function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false)
    if (window.Razorpay) return Promise.resolve(true)

    return new Promise((resolve) => {
        const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`)
        if (existing) {
            existing.addEventListener('load', () => resolve(!!window.Razorpay))
            existing.addEventListener('error', () => resolve(false))
            return
        }

        const script = document.createElement('script')
        script.src = SCRIPT_URL
        script.async = true
        script.onload = () => resolve(!!window.Razorpay)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}
