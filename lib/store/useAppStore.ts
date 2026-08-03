import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
    // Auth
    isAuthenticated: boolean
    currentUserId: string | null
    accessToken: string | null

    // UI
    isGhostMode: boolean
    isPanicMode: boolean
    activeTab: 'tonight' | 'orbits' | 'pulse' | 'chat' | 'you'
    isNightMode: boolean
    orbitAvatarMode: boolean
    orbitGuideOpen: boolean
    disguiseModeEnabled: boolean
    activeDisguiseSkin: string
    hasSeenDisguiseIntro: boolean
    hasSeenDisguiseActiveCoach: boolean
    hasSeenGhostIntro: boolean
    ghostIntroOpen: boolean
    showMatchAnimation: boolean
    matchedProfile: { alias: string; avatarUrl: string } | null

    // Actions
    setAuthenticated: (v: boolean) => void
    setCurrentUser: (id: string, token: string) => void
    setGhostMode: (on: boolean) => void
    toggleGhostMode: () => void
    openGhostIntro: () => void
    closeGhostIntro: () => void
    markGhostIntroSeen: () => void
    toggleNightMode: () => void
    toggleOrbitAvatarMode: () => void
    setOrbitGuideOpen: (open: boolean) => void
    setDisguise: (enabled: boolean, skin?: string) => void
    markDisguiseIntroSeen: () => void
    markDisguiseActiveCoachSeen: () => void
    triggerPanicMode: () => void
    setActiveTab: (tab: AppState['activeTab']) => void
    triggerMatchAnimation: (profile: { alias: string; avatarUrl: string }) => void
    dismissMatchAnimation: () => void
    signOut: () => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            currentUserId: null,
            accessToken: null,

            isGhostMode: false,
            isPanicMode: false,
            activeTab: 'tonight',
            isNightMode: true,
            orbitAvatarMode: false,
            orbitGuideOpen: false,
            disguiseModeEnabled: false,
            activeDisguiseSkin: 'newspaper',
            hasSeenDisguiseIntro: false,
            hasSeenDisguiseActiveCoach: false,
            hasSeenGhostIntro: false,
            ghostIntroOpen: false,
            showMatchAnimation: false,
            matchedProfile: null,

            setAuthenticated: (v) => set({ isAuthenticated: v }),

            setCurrentUser: (id, token) => set({
                isAuthenticated: true,
                currentUserId: id,
                accessToken: token,
            }),

            setGhostMode: (on) => set({ isGhostMode: on }),

            toggleGhostMode: () => set((s) => ({ isGhostMode: !s.isGhostMode })),

            openGhostIntro: () => set({ ghostIntroOpen: true }),

            closeGhostIntro: () => set({ ghostIntroOpen: false }),

            markGhostIntroSeen: () => set({ hasSeenGhostIntro: true }),

            toggleNightMode: () => set((s) => ({ isNightMode: !s.isNightMode })),

            toggleOrbitAvatarMode: () => set((s) => ({ orbitAvatarMode: !s.orbitAvatarMode })),

            setOrbitGuideOpen: (open) => set({ orbitGuideOpen: open }),

            setDisguise: (enabled, skin) => set((s) => ({
                disguiseModeEnabled: enabled,
                activeDisguiseSkin: skin ?? s.activeDisguiseSkin,
            })),

            markDisguiseIntroSeen: () => set({ hasSeenDisguiseIntro: true }),

            markDisguiseActiveCoachSeen: () => set({ hasSeenDisguiseActiveCoach: true }),

            triggerPanicMode: () => {
                set({ isPanicMode: true })
                setTimeout(() => set({ isPanicMode: false }), 3000)
            },

            setActiveTab: (tab) => set({ activeTab: tab }),

            triggerMatchAnimation: (profile) => set({ showMatchAnimation: true, matchedProfile: profile }),

            dismissMatchAnimation: () => set({ showMatchAnimation: false, matchedProfile: null }),

            signOut: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('tryst_token')
                    localStorage.removeItem('tryst_refresh')
                }
                set({
                    isAuthenticated: false,
                    currentUserId: null,
                    accessToken: null,
                    isGhostMode: false,
                    ghostIntroOpen: false,
                    disguiseModeEnabled: false,
                })
            },
        }),
        {
            name: 'tryst-store',
            partialize: (s) => ({
                isAuthenticated: s.isAuthenticated,
                currentUserId: s.currentUserId,
                isGhostMode: s.isGhostMode,
                isNightMode: s.isNightMode,
                orbitAvatarMode: s.orbitAvatarMode,
                orbitGuideOpen: s.orbitGuideOpen,
                disguiseModeEnabled: s.disguiseModeEnabled,
                activeDisguiseSkin: s.activeDisguiseSkin,
                hasSeenDisguiseIntro: s.hasSeenDisguiseIntro,
                hasSeenDisguiseActiveCoach: s.hasSeenDisguiseActiveCoach,
                hasSeenGhostIntro: s.hasSeenGhostIntro,
            }),
        }
    )
)
