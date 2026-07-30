'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store/useAppStore'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { ONESIGNAL_APP_ID } from '@/lib/onesignal/config'
import { shouldSuppressChatNotification } from '@/lib/onesignal/activeChat'
import { registerOneSignalIds } from '@/lib/onesignal/client'

type OneSignalNS = {
    init: (opts: Record<string, unknown>) => Promise<void>
    login: (externalId: string) => Promise<void>
    Notifications: {
        permission: boolean
        requestPermission: () => Promise<unknown>
        addEventListener: (event: string, cb: (event: unknown) => void) => void
    }
    Slidedown: { promptPush: () => Promise<void> }
    User: {
        onesignalId?: string
        PushSubscription: {
            id?: string | null
            addEventListener: (event: string, cb: (change: { current?: { id?: string | null } }) => void) => void
        }
    }
}

declare global {
    interface Window {
        OneSignalDeferred?: Array<(OneSignal: OneSignalNS) => void | Promise<void>>
        OneSignal?: OneSignalNS
    }
}

/**
 * OneSignal v16 via CDN (OneSignalDeferred) — matches official snippet.
 * After login, external_id = TRYST user id so push targets only that person.
 */
export default function OneSignalProvider() {
    const isAuthenticated = useAppStore((s) => s.isAuthenticated)
    const currentUserId = useAppStore((s) => s.currentUserId)
    const { data: me } = useAuthUser()
    const userId = currentUserId || me?.id || null
    const readyRef = useRef(false)
    const promptedRef = useRef(false)

    useEffect(() => {
        if (!isAuthenticated || !userId || typeof window === 'undefined') return

        window.OneSignalDeferred = window.OneSignalDeferred || []

        window.OneSignalDeferred.push(async (OneSignal) => {
            try {
                if (!readyRef.current) {
                    await OneSignal.init({
                        appId: ONESIGNAL_APP_ID,
                        allowLocalhostAsSecureOrigin: true,
                        serviceWorkerPath: 'OneSignalSDKWorker.js',
                        serviceWorkerParam: { scope: '/' },
                        welcomeNotification: { disable: true },
                    })
                    readyRef.current = true

                    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                        try {
                            const raw = (event as { notification?: { additionalData?: Record<string, string> } })
                                ?.notification?.additionalData
                            const matchId = raw?.matchId || raw?.match_id
                            if (shouldSuppressChatNotification(matchId)) {
                                ;(event as { preventDefault?: () => void }).preventDefault?.()
                            }
                        } catch {
                            /* ignore */
                        }
                    })

                    OneSignal.Notifications.addEventListener('click', (event) => {
                        try {
                            const data = (event as { notification?: { additionalData?: Record<string, string> } })
                                ?.notification?.additionalData
                            const matchId = data?.matchId || data?.match_id
                            if (!matchId) return
                            const kind = data?.kind || ''
                            const mode =
                                data?.mode === 'video' || kind === 'video_call'
                                    ? 'video'
                                    : data?.mode === 'audio' || kind === 'audio_call'
                                        ? 'audio'
                                        : null
                            window.location.href = mode
                                ? `/chat?match=${matchId}&call=${mode}`
                                : `/chat?match=${matchId}`
                        } catch {
                            /* ignore */
                        }
                    })

                    OneSignal.User.PushSubscription.addEventListener('change', (change) => {
                        const next = change.current?.id || null
                        const oid = OneSignal.User.onesignalId || next
                        void registerOneSignalIds({ playerId: oid, subscriptionId: next })
                    })
                }

                // Bind this browser to ONLY this TRYST user
                await OneSignal.login(userId)

                if (!promptedRef.current) {
                    promptedRef.current = true
                    if (!OneSignal.Notifications.permission) {
                        try {
                            await OneSignal.Slidedown.promptPush()
                        } catch {
                            try {
                                await OneSignal.Notifications.requestPermission()
                            } catch {
                                /* dismissed */
                            }
                        }
                    }
                }

                const subId = OneSignal.User.PushSubscription.id || null
                const onesignalId = OneSignal.User.onesignalId || subId
                if (onesignalId || subId) {
                    await registerOneSignalIds({
                        playerId: onesignalId,
                        subscriptionId: subId,
                    })
                }
            } catch (err) {
                console.warn('[OneSignal] init failed', err)
            }
        })
    }, [isAuthenticated, userId])

    return null
}
