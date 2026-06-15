'use client'

import Image from 'next/image'

const FALLBACK = 'https://randomuser.me/api/portraits/women/44.jpg'

export function avatarUrl(seed: string, url?: string | null) {
    if (url) return url
    const n = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0) % 70
    return `https://randomuser.me/api/portraits/${n % 2 ? 'women' : 'men'}/${n}.jpg`
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
