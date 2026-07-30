'use client'

import { useEffect, useRef } from 'react'
import OneSignal from 'react-onesignal'
import { useAppStore } from '@/lib/store/useAppStore'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { ONESIGNAL_APP_ID } from '@/lib/onesignal/config'
import { shouldSuppressChatNotification } from '@/lib/onesignal/activeChat'
import { registerOneSignalIds } from '@/lib/onesignal/client'

/**
 * Initializes OneSignal once after login, asks for notification permission,
 * links external_id = TRYST user id, and suppresses push when that chat is open.
 */
export default function OneSignalProvider() {
    const isAuthenticated = useAppStore((s) => s.isAuthenticated)
    const currentUserId = useAppStore((s) => s.currentUserId)
    const { data: me } = useAuthUser()
    const userId = currentUserId || me?.id || null
    const initRef = useRef(false)
    const promptedRef = useRef(false)

    useEffect(() => {
        if (!isAuthenticated || !userId || typeof window === 'undefined') return
        if (initRef.current) return
        initRef.current = true

        let cancelled = false

        ;(async () => {
            try {
                await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerPath: 'OneSignalSDKWorker.js',
                    serviceWorkerParam: { scope: '/' },
                    welcomeNotification: {
                        disable: true,
                        message: '',
                    },
                } as Parameters<typeof OneSignal.init>[0])

                if (cancelled) return

                await OneSignal.login(userId)

                // Foreground: hide push if user already has that chat open
                OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                    try {
                        const raw = (event as { notification?: { additionalData?: Record<string, string> } })
                            ?.notification?.additionalData
                        const matchId = raw?.matchId || raw?.match_id
                        if (shouldSuppressChatNotification(matchId)) {
                            event.preventDefault()
                        }
                    } catch {
                        /* ignore */
                    }
                })

                // Click → open chat (calls include mode so answer deep-link works)
                OneSignal.Notifications.addEventListener('click', (event) => {
                    try {
                        const data = (event as { notification?: { additionalData?: Record<string, string> } })
                            ?.notification?.additionalData
                        const matchId = data?.matchId || data?.match_id
                        if (!matchId || typeof window === 'undefined') return
                        const kind = data?.kind || ''
                        const mode =
                            data?.mode === 'video' || kind === 'video_call'
                                ? 'video'
                                : data?.mode === 'audio' || kind === 'audio_call'
                                    ? 'audio'
                                    : null
                        const url = mode
                            ? `/chat?match=${matchId}&call=${mode}`
                            : `/chat?match=${matchId}`
                        window.location.href = url
                    } catch {
                        /* ignore */
                    }
                })

                // Ask permission once (native prompt / slidedown)
                if (!promptedRef.current) {
                    promptedRef.current = true
                    const permission = OneSignal.Notifications.permission
                    if (!permission) {
                        try {
                            await OneSignal.Slidedown.promptPush()
                        } catch {
                            try {
                                await OneSignal.Notifications.requestPermission()
                            } catch {
                                /* user dismissed */
                            }
                        }
                    }
                }

                const subId =
                    OneSignal.User.PushSubscription.id ||
                    (OneSignal.User.PushSubscription as { token?: string }).token ||
                    null
                // Onesignal v16: OnesignalId on User
                const onesignalId =
                    (OneSignal.User as { onesignalId?: string }).onesignalId || subId || null

                if (onesignalId || subId) {
                    await registerOneSignalIds({
                        playerId: onesignalId,
                        subscriptionId: subId,
                    })
                }

                OneSignal.User.PushSubscription.addEventListener('change', async (change) => {
                    const next = change.current?.id || null
                    const oid =
                        (OneSignal.User as { onesignalId?: string }).onesignalId || next
                    await registerOneSignalIds({
                        playerId: oid,
                        subscriptionId: next,
                    })
                })
            } catch (err) {
                console.warn('[OneSignal] init failed', err)
                initRef.current = false
            }
        })()

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, userId])

    // Re-login when user switches account in same tab
    useEffect(() => {
        if (!isAuthenticated || !userId || !initRef.current) return
        void OneSignal.login(userId).catch(() => undefined)
    }, [isAuthenticated, userId])

    return null
}
