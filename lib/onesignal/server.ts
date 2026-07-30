/**
 * Server-side OneSignal REST helpers (never import from client components).
 * Docs: https://documentation.onesignal.com/reference/create-notification
 */

import { getOneSignalServerConfig } from './config'
import type { OneSignalNotifyPayload } from './types'
import { callDeepLink } from './callNotify'

const ONESIGNAL_API = 'https://api.onesignal.com/notifications'

export async function sendOneSignalPush(payload: OneSignalNotifyPayload) {
    const cfg = getOneSignalServerConfig()
    if (!cfg.isConfigured) {
        return {
            ok: false as const,
            skipped: true as const,
            message: 'ONESIGNAL_REST_API_KEY missing — push skipped',
        }
    }

    const isCall = payload.kind === 'audio_call' || payload.kind === 'video_call'
    const mode = payload.mode || (payload.kind === 'video_call' ? 'video' : payload.kind === 'audio_call' ? 'audio' : undefined)

    const data: Record<string, string> = {
        kind: payload.kind,
        ...(payload.matchId ? { matchId: payload.matchId } : {}),
        ...(payload.callId ? { callId: payload.callId } : {}),
        ...(mode ? { mode } : {}),
        ...(payload.data || {}),
    }

    const url =
        payload.url ||
        (payload.matchId && mode
            ? callDeepLink(payload.matchId, mode)
            : payload.matchId
                ? `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/chat?match=${payload.matchId}`
                : undefined)

    const body: Record<string, unknown> = {
        app_id: cfg.appId,
        include_aliases: {
            external_id: [payload.toUserId],
        },
        target_channel: 'push',
        headings: { en: payload.title },
        contents: { en: payload.body },
        data,
        ...(url ? { url } : {}),
        // Calls: short-lived, high priority, distinct chrome labels
        ...(isCall
            ? {
                priority: 10,
                ttl: 90,
                chrome_web_icon: undefined,
                web_push_topic: mode === 'video' ? 'tryst-video-call' : 'tryst-audio-call',
            }
            : { ttl: 3600 }),
    }

    const res = await fetch(ONESIGNAL_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${cfg.restApiKey}`,
        },
        body: JSON.stringify(body),
    })

    const json = (await res.json().catch(() => ({}))) as {
        id?: string
        errors?: unknown
        message?: string
    }

    if (!res.ok) {
        console.error('[onesignal] send failed', res.status, json)
        return {
            ok: false as const,
            skipped: false as const,
            message: json.message || JSON.stringify(json.errors || json) || 'OneSignal error',
        }
    }

    return { ok: true as const, skipped: false as const, id: json.id }
}
