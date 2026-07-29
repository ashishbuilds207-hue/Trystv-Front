import { create } from 'zustand'

interface PresenceState {
    /** userId → online */
    onlineIds: Record<string, true>
    /** true after first presence sync from the socket */
    synced: boolean
    /** true while subscribed to the presence channel */
    connected: boolean
    setFromPresenceState: (ids: string[]) => void
    setConnected: (connected: boolean) => void
    reset: () => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
    onlineIds: {},
    synced: false,
    connected: false,
    setFromPresenceState: (ids) => {
        const onlineIds: Record<string, true> = {}
        for (const id of ids) {
            if (id) onlineIds[id] = true
        }
        set({ onlineIds, synced: true })
    },
    setConnected: (connected) => set({ connected }),
    reset: () => set({ onlineIds: {}, synced: false, connected: false }),
}))

export function isPresenceOnline(userId: string | null | undefined, fallback = false): boolean {
    if (!userId) return fallback
    const { onlineIds, synced } = usePresenceStore.getState()
    if (!synced) return fallback
    return !!onlineIds[userId]
}
