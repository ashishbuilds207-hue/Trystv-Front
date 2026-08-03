'use client'

import { useCallback } from 'react'
import { userApi } from '@/lib/api/auth'
import { useAppStore } from '@/lib/store/useAppStore'

/** Shared Ghost Mode toggle: first enable shows intro; always syncs to profile. */
export function useGhostMode() {
    const isGhostMode = useAppStore((s) => s.isGhostMode)
    const hasSeenGhostIntro = useAppStore((s) => s.hasSeenGhostIntro)
    const setGhostMode = useAppStore((s) => s.setGhostMode)
    const openGhostIntro = useAppStore((s) => s.openGhostIntro)
    const closeGhostIntro = useAppStore((s) => s.closeGhostIntro)
    const ghostIntroOpen = useAppStore((s) => s.ghostIntroOpen)

    const applyGhost = useCallback(async (on: boolean) => {
        setGhostMode(on)
        await userApi.updateProfile({ isGhostMode: on }).catch(() => {})
    }, [setGhostMode])

    const requestToggle = useCallback(() => {
        if (isGhostMode) {
            void applyGhost(false)
            return
        }
        if (!hasSeenGhostIntro) {
            openGhostIntro()
            return
        }
        void applyGhost(true)
    }, [isGhostMode, hasSeenGhostIntro, applyGhost, openGhostIntro])

    const confirmEnableFromIntro = useCallback(async () => {
        await applyGhost(true)
        closeGhostIntro()
    }, [applyGhost, closeGhostIntro])

    return {
        isGhostMode,
        ghostIntroOpen,
        requestToggle,
        confirmEnableFromIntro,
        closeGhostIntro,
    }
}
