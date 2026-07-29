'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/useAppStore'

/** Syncs Zustand night-mode preference to `html[data-theme]` for site-wide CSS tokens. */
export default function ThemeSync() {
    const isNightMode = useAppStore((s) => s.isNightMode)

    useEffect(() => {
        const theme = isNightMode ? 'dark' : 'light'
        document.documentElement.dataset.theme = theme
        document.documentElement.classList.toggle('night-mode', isNightMode)
        document.body.style.colorScheme = isNightMode ? 'dark' : 'light'
    }, [isNightMode])

    return null
}
