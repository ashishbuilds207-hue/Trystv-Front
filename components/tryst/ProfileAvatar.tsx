'use client'

import Image from 'next/image'
import { publicConfig } from '@/lib/config'

// Single shared placeholder shown for any profile without an uploaded photo.
export const DEFAULT_AVATAR =
    'data:image/svg+xml,' +
    encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
        "<rect width='100' height='100' fill='#c9ccce'/>" +
        "<circle cx='50' cy='40' r='17' fill='#ffffff'/>" +
        "<path d='M50 62c-16 0-27 12-29 28a2 2 0 0 0 2 2h54a2 2 0 0 0 2-2c-2-16-13-28-29-28z' fill='#ffffff'/>" +
        '</svg>'
    )

function resolveUrl(url: string) {
    if (url.startsWith('data:')) return url
    // Same-origin/proxy mode: rewrite any absolute uploads URL to a relative path
    // so it is served through the current origin (works behind a tunnel).
    if (publicConfig.apiOrigin === '' && url.includes('/uploads/')) {
        return url.slice(url.indexOf('/uploads/'))
    }
    if (url.startsWith('http')) return url
    return `${publicConfig.apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`
}

export function avatarUrl(_seed: string, url?: string | null) {
    return url ? resolveUrl(url) : DEFAULT_AVATAR
}

export default function ProfileAvatar({
    seed, src, size = 48, className = '', blur = false,
}: { seed: string; src?: string | null; size?: number; className?: string; blur?: boolean }) {
    const url = avatarUrl(seed, src)
    return (
        <div className={`relative overflow-hidden rounded-full ${className}`} style={{ width: size, height: size }}>
            <Image
                src={url}
                alt={seed}
                width={size}
                height={size}
                className={`object-cover w-full h-full ${blur ? 'blur-md scale-110' : ''}`}
                unoptimized
            />
        </div>
    )
}
