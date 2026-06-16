/**
 * Public URLs
 *
 * LOCAL:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 *   NEXT_PUBLIC_API_URL=http://localhost:5000/api
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
 *
 * LIVE (Amplify Console):
 *   NEXT_PUBLIC_APP_URL=https://main.d1qd41f5ek1xlt.amplifyapp.com
 *   BACKEND_URL=http://56.228.19.19
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID=... (same client — add both origins in Google Cloud)
 *
 * Google Cloud Console → OAuth client → Authorized JavaScript origins:
 *   http://localhost:3000
 *   https://main.d1qd41f5ek1xlt.amplifyapp.com
 */

const LOCAL_API = 'http://localhost:5000/api'
export const LIVE_APP_URL = 'https://main.d1qd41f5ek1xlt.amplifyapp.com'

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

const isLocalApp = /localhost|127\.0\.0\.1/.test(appUrl)

const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (isLocalApp ? LOCAL_API : `${appUrl}/api`)

const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ||
    apiUrl.replace(/\/api$/, '')

const isLocalApi = /localhost|127\.0\.0\.1/.test(apiUrl)

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export const publicConfig = {
    appUrl,
    apiUrl,
    socketUrl,
    apiOrigin: apiUrl.replace(/\/api$/, ''),
    isLocalApp,
    isLocalApi,
    googleClientId,
    liveAppUrl: LIVE_APP_URL,
}
