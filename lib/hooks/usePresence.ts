'use client'

import { useCallback } from 'react'
import { usePresenceStore } from '@/lib/store/usePresenceStore'

/** Live online check from the presence socket (falls back until first sync). */
export function useIsOnline(userId: string | null | undefined, fallback = false): boolean {
    return usePresenceStore((s) => {
        if (!userId) return fallback
        if (!s.synced) return fallback
        return !!s.onlineIds[userId]
    })
}

export function usePresenceOnlineMap() {
    const onlineIds = usePresenceStore((s) => s.onlineIds)
    const synced = usePresenceStore((s) => s.synced)

    const isOnline = useCallback(
        (userId: string, fallback = false) => {
            if (!synced) return fallback
            return !!onlineIds[userId]
        },
        [onlineIds, synced],
    )

    return { onlineIds, synced, isOnline }
}

/** Overlay socket presence onto profiles that have `isOnline` / `online`. */
export function withLiveOnline<T extends { id: string; isOnline?: boolean; online?: boolean }>(
    items: T[],
    onlineIds: Record<string, true>,
    synced: boolean,
): T[] {
    if (!synced) return items
    return items.map((item) => {
        const live = !!onlineIds[item.id]
        if (item.isOnline !== undefined) return { ...item, isOnline: live }
        if (item.online !== undefined) return { ...item, online: live }
        return { ...item, isOnline: live }
    })
}
