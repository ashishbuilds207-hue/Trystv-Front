'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store/useAppStore'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { userApi } from '@/lib/api/auth'
import { SKIN_COMPONENTS, type DisguiseSkinId } from './disguise/skins'
import DisguiseSkinDock from './disguise/DisguiseSkinDock'
import DisguiseActiveCoach from './disguise/DisguiseActiveCoach'
import { scrollAppToTop, scrollDisguiseContentToTop } from '@/lib/scroll'
import { markTonightRevealed } from '@/components/tryst/TonightDisguiseBoot'

export default function DisguiseOverlay() {
    const { disguiseModeEnabled, activeDisguiseSkin, setDisguise } = useAppStore()
    const { data: me } = useAuthUser()
    const viewportRef = useRef<HTMLDivElement>(null)

    const exitDisguise = useCallback(async () => {
        markTonightRevealed()
        setDisguise(false)
        try {
            await userApi.updateProfile({ disguiseModeEnabled: false })
        } catch { /* local exit still works */ }
    }, [setDisguise])

    const switchSkin = useCallback(async (skin: DisguiseSkinId) => {
        setDisguise(true, skin)
        try {
            await userApi.updateProfile({ disguiseModeEnabled: true, activeDisguiseSkin: skin })
        } catch { /* local switch still works */ }
    }, [setDisguise])

    const skinId = (activeDisguiseSkin || me?.activeDisguiseSkin || 'newspaper') as DisguiseSkinId

    useEffect(() => {
        if (!disguiseModeEnabled) return

        scrollAppToTop('auto')
        document.body.style.overflow = 'hidden'

        const scrollInside = () => scrollDisguiseContentToTop()
        requestAnimationFrame(scrollInside)
        const t = window.setTimeout(() => {
            scrollAppToTop('auto')
            scrollInside()
        }, 80)

        return () => {
            window.clearTimeout(t)
            document.body.style.overflow = ''
        }
    }, [disguiseModeEnabled, skinId])

    if (!disguiseModeEnabled) return null

    const Skin = SKIN_COMPONENTS[skinId] || SKIN_COMPONENTS.newspaper

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#060404]"
            role="dialog"
            aria-label="Disguise mode"
        >
            <div className="flex-1 min-h-0 flex justify-center w-full">
                <div className="w-full max-w-[1650px] h-full flex flex-col bg-white shadow-[0_0_80px_rgba(0,0,0,0.45)]">
                    <div ref={viewportRef} className="flex-1 min-h-0 overflow-hidden relative">
                        <Skin key={skinId} alias={me?.alias} onReveal={exitDisguise} />
                        <DisguiseActiveCoach />
                    </div>
                    <DisguiseSkinDock active={skinId} onSelect={switchSkin} />
                </div>
            </div>
        </div>
    )
}
