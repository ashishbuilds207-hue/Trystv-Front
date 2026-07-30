/**
 * Public config — Supabase + app URLs
 *
 * Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   NEXT_PUBLIC_APP_URL
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID
 */

export const LIVE_APP_URL = 'https://main.d1qd41f5ek1xlt.amplifyapp.com'

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const isLocalApp = /localhost|127\.0\.0\.1/.test(appUrl)

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''

export const publicConfig = {
    appUrl,
    isLocalApp,
    supabaseUrl,
    supabasePublishableKey,
    storageUrl: supabaseUrl ? `${supabaseUrl}/storage/v1/object/public` : '',
    googleClientId,
    googleMapsApiKey,
    razorpayKeyId,
    onesignalAppId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '804274d9-0ff1-428f-a5f7-ae89a23853c6',
    liveAppUrl: LIVE_APP_URL,
    /** @deprecated Express backend removed — kept empty for leftover imports */
    apiUrl: '',
    socketUrl: '',
    apiOrigin: '',
    isLocalApi: false,
}
