/**
 * Server-side OneSignal REST helpers (never import from client components).
 * Targets ONE user only (external_id = TRYST user id, with subscription fallback).
 */

import { createServiceClient } from '@/lib/supabase/server'
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

    // Never broadcast to everyone — require a single recipient id
    const toUserId = String(payload.toUserId || '').trim()
    if (!toUserId) {
        return { ok: false as const, skipped: false as const, message: 'toUserId required' }
    }

    const isCall = payload.kind === 'audio_call' || payload.kind === 'video_call'
    const mode =
        payload.mode ||
        (payload.kind === 'video_call' ? 'video' : payload.kind === 'audio_call' ? 'audio' : undefined)

    const data: Record<string, string> = {
        kind: payload.kind,
        toUserId,
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

    // Prefer external_id (set by OneSignal.login). Fallback to stored subscription id.
    let subscriptionId: string | null = null
    try {
        const sb = createServiceClient()
        const { data: row } = await sb
            .from('users')
            .select('onesignal_subscription_id, onesignal_player_id')
            .eq('id', toUserId)
            .maybeSingle()
        subscriptionId = row?.onesignal_subscription_id || row?.onesignal_player_id || null
    } catch {
        /* column may be missing */
    }

    const body: Record<string, unknown> = {
        app_id: cfg.appId,
        // Official v16 targeting — only this external user
        include_aliases: {
            external_id: [toUserId],
        },
        target_channel: 'push',
        headings: { en: payload.title },
        contents: { en: payload.body },
        data,
        ...(url ? { url } : {}),
        ...(isCall
            ? { priority: 10, ttl: 90, web_push_topic: mode === 'video' ? 'tryst-video-call' : 'tryst-audio-call' }
            : { ttl: 3600 }),
    }

    // If aliases fail on older apps, also try subscription id as a second attempt
    const res = await fetch(ONESIGNAL_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${cfg.restApiKey}`,
        },
        body: JSON.stringify(body),
    })

    let json = (await res.json().catch(() => ({}))) as {
        id?: string
        errors?: unknown
        message?: string
    }

    if (!res.ok && subscriptionId) {
        const fallback = await fetch(ONESIGNAL_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Key ${cfg.restApiKey}`,
            },
            body: JSON.stringify({
                app_id: cfg.appId,
                include_subscription_ids: [subscriptionId],
                headings: { en: payload.title },
                contents: { en: payload.body },
                data,
                ...(url ? { url } : {}),
                ...(isCall ? { priority: 10, ttl: 90 } : { ttl: 3600 }),
            }),
        })
        json = (await fallback.json().catch(() => ({}))) as typeof json
        if (!fallback.ok) {
            console.error('[onesignal] send failed', fallback.status, json)
            return {
                ok: false as const,
                skipped: false as const,
                message: json.message || JSON.stringify(json.errors || json) || 'OneSignal error',
            }
        }
        return { ok: true as const, skipped: false as const, id: json.id }
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
