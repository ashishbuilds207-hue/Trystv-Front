/**
 * Public URLs — set NEXT_PUBLIC_APP_URL; API/socket derive automatically when omitted.
 *
 * Local:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3001
 *   (API → http://localhost:5000/api, socket → http://localhost:5000)
 *
 * Live (Amplify + rewrites):
 *   NEXT_PUBLIC_APP_URL=https://main.d1qd41f5ek1xlt.amplifyapp.com
 *   (API → same host /api, socket → same host)
 *
 * Live API via EC2 IP (local dev only — HTTP):
 *   NEXT_PUBLIC_APP_URL=http://localhost:3001
 *   NEXT_PUBLIC_API_URL=http://56.228.19.19/api
 */

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '')

const isLocalApp = /localhost|127\.0\.0\.1/.test(appUrl)

const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (isLocalApp ? 'http://localhost:5000/api' : `${appUrl}/api`)

const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ||
    apiUrl.replace(/\/api$/, '')

export const publicConfig = {
    appUrl,
    apiUrl,
    socketUrl,
    apiOrigin: apiUrl.replace(/\/api$/, ''),
}
