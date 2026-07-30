'use client'

import type { OneSignalNotifyKind } from './types'

/**
 * Fire-and-forget client helper → POST /api/onesignal/notify
 * Used after send message / start call.
 */
export async function requestPushNotify(input: {
    toUserId: string
    kind: OneSignalNotifyKind
    title: string
    body: string
    matchId?: string
    callId?: string
    mode?: 'audio' | 'video'
}) {
    try {
        await fetch('/api/onesignal/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(input),
        })
    } catch {
        /* non-blocking */
    }
}

export async function registerOneSignalIds(input: {
    playerId?: string | null
    subscriptionId?: string | null
}) {
    try {
        await fetch('/api/onesignal/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(input),
        })
    } catch {
        /* non-blocking */
    }
}
