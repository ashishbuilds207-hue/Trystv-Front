/** @type {import('next').NextConfig} */
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
        ],
    },
    async redirects() {
        return [
            { source: '/favicon.ico', destination: '/favicon.svg', permanent: false },
            { source: '/icon.svg', destination: '/favicon.svg', permanent: false },
            { source: '/apple-icon.svg', destination: '/apple-touch-icon.svg', permanent: false },
        ]
    },
};

export default nextConfig;
