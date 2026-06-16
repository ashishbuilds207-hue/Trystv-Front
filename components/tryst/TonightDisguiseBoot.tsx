'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store/useAppStore'
import { userApi } from '@/lib/api/auth'

/** On /tonight, enable disguise by default until user triple-taps masthead this session. */
export function TonightDisguiseBoot() {
    const pathname = usePathname()
    const { disguiseModeEnabled, setDisguise } = useAppStore()

    useEffect(() => {
        if (pathname !== '/tonight') return
        const revealed = sessionStorage.getItem('tonight_revealed') === '1'
        if (!revealed && !disguiseModeEnabled) {
            setDisguise(true, 'newspaper')
            userApi.updateProfile({ disguiseModeEnabled: true, activeDisguiseSkin: 'newspaper' }).catch(() => {})
        }
    }, [pathname, disguiseModeEnabled, setDisguise])

    return null
}

export function markTonightRevealed() {
    sessionStorage.setItem('tonight_revealed', '1')
}
