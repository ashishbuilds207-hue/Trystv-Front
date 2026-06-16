/** @type {import('next').NextConfig} */

const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
const isLocalApp = /localhost|127\.0\.0\.1/.test(appUrl)
const backendUrl = (process.env.BACKEND_URL || 'http://56.228.19.19').replace(/\/$/, '')

const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'randomuser.me',
                pathname: '/api/portraits/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
            },
            {
                protocol: 'http',
                hostname: '56.228.19.19',
                pathname: '/uploads/**',
            },
        ],
    },
    async redirects() {
        return [
            { source: '/favicon.ico', destination: '/favicon.svg', permanent: false },
            { source: '/icon.svg', destination: '/favicon.svg', permanent: false },
            { source: '/apple-icon.svg', destination: '/apple-touch-icon.svg', permanent: false },
        ]
    },
    // Live Amplify: proxy /api → EC2 (avoids HTTPS→HTTP mixed content in browser)
    async rewrites() {
        if (isLocalApp || process.env.NEXT_PUBLIC_API_URL) return []
        return [
            { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
            { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
            { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
        ]
    },
};

export default nextConfig;
