/**
 * Public URLs
 *
 * LOCAL (point at EC2 IP):
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 *   NEXT_PUBLIC_API_URL=http://56.228.19.19/api
 *   NEXT_PUBLIC_SOCKET_URL=http://56.228.19.19
 *
 * LIVE Amplify — set ONLY these in Amplify Console (no API IP; uses /api proxy):
 *   NEXT_PUBLIC_APP_URL=https://main.d1qd41f5ek1xlt.amplifyapp.com
 *   BACKEND_URL=http://56.228.19.19
 *   (+ Google keys)
 */

const EC2_API = 'http://56.228.19.19'

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

const isLocalApp = /localhost|127\.0\.0\.1/.test(appUrl)

const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (isLocalApp ? `${EC2_API}/api` : `${appUrl}/api`)

const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ||
    apiUrl.replace(/\/api$/, '')

export const publicConfig = {
    appUrl,
    apiUrl,
    socketUrl,
    apiOrigin: apiUrl.replace(/\/api$/, ''),
}
