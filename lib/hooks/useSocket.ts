'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/useAppStore'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { useToast } from './useToast'
import { setActiveChatMatchId, shouldSuppressChatNotification } from '@/lib/onesignal/activeChat'

type ChatHandlers = {
    onNewMessage?: (payload: {
        matchId?: string
        conversationId?: string
        senderId?: string
        message?: Record<string, unknown>
    }) => void
    onTyping?: (info: { isTyping: boolean; userId?: string; alias?: string }) => void
}

let notifChannel: RealtimeChannel | null = null
let chatChannel: RealtimeChannel | null = null
let typingChannel: RealtimeChannel | null = null
let onlineChannel: RealtimeChannel | null = null
let activeMatchId: string | null = null
let activeConversationId: string | null = null
let chatHandlers: ChatHandlers = {}
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

const HEARTBEAT_MS = 45_000

function syncPresenceFromChannel(channel: RealtimeChannel) {
    const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>
    const ids = Object.keys(state)
    usePresenceStore.getState().setFromPresenceState(ids)
}

async function touchLastSeen(userId: string) {
    try {
        const supabase = createClient()
        await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', userId)
    } catch {
        /* ignore heartbeat failures */
    }
}

function clearHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
    }
}

async function trackOnline(userId: string) {
    if (!onlineChannel) return
    await onlineChannel.track({
        userId,
        online_at: new Date().toISOString(),
    })
    await touchLastSeen(userId)
}

async function untrackOnline() {
    if (!onlineChannel) return
    try {
        await onlineChannel.untrack()
    } catch {
        /* ignore */
    }
}

/**
 * Global realtime: notifications, matches, incoming likes, messages (badges),
 * plus presence for online/offline.
 */
export function useSocket() {
    const { isAuthenticated, isGhostMode, currentUserId } = useAppStore()
    const toast = useToast()
    const qc = useQueryClient()
    const toastRef = useRef(toast)
    toastRef.current = toast

    useEffect(() => {
        if (!isAuthenticated) {
            teardownRealtime()
            usePresenceStore.getState().reset()
            return
        }

        const supabase = createClient()
        let cancelled = false

        ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return

            if (notifChannel) {
                await supabase.removeChannel(notifChannel)
                notifChannel = null
            }

            notifChannel = supabase
                .channel(`user-feed:${user.id}`)
                // ── Notifications (toasts + bell) ──
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        const row = payload.new as {
                            type?: string
                            title?: string
                            body?: string
                            data?: Record<string, string> | string
                        }
                        let data: Record<string, string> = {}
                        if (typeof row.data === 'string') {
                            try { data = JSON.parse(row.data) } catch { data = {} }
                        } else if (row.data && typeof row.data === 'object') {
                            data = row.data
                        }
                        const matchId = data.matchId || data.match_id
                        // Don't toast message alerts while that chat is open
                        if (
                            (row.type === 'message' || row.type === 'chat') &&
                            shouldSuppressChatNotification(matchId)
                        ) {
                            qc.invalidateQueries({ queryKey: ['notifications'] })
                            return
                        }
                        if (row.type === 'spark' || row.type === 'match') {
                            toastRef.current.success(row.title || "It's a Spark!", row.body || '')
                            qc.invalidateQueries({ queryKey: ['matches'] })
                            qc.invalidateQueries({ queryKey: ['likes'] })
                        } else if (row.type === 'echo_like' || row.type === 'echo_react') {
                            toastRef.current.success(row.title || 'Echo activity', row.body || '')
                            qc.invalidateQueries({ queryKey: ['echo-mine'] })
                            qc.invalidateQueries({ queryKey: ['echo-feed'] })
                        } else if (row.type === 'like' || row.type === 'pull' || row.type === 'ignite') {
                            toastRef.current.info(row.title || 'New like', row.body || '')
                            qc.invalidateQueries({ queryKey: ['likes'] })
                        } else {
                            toastRef.current.info(row.title || 'Notification', row.body || '')
                        }
                        qc.invalidateQueries({ queryKey: ['notifications'] })
                    },
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    () => {
                        qc.invalidateQueries({ queryKey: ['notifications'] })
                    },
                )
                // ── New matches ──
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'matches' },
                    () => {
                        qc.invalidateQueries({ queryKey: ['matches'] })
                        qc.invalidateQueries({ queryKey: ['likes'] })
                        qc.invalidateQueries({ queryKey: ['orbit-feed'] })
                    },
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'matches' },
                    () => {
                        qc.invalidateQueries({ queryKey: ['matches'] })
                        qc.invalidateQueries({ queryKey: ['call-consent'] })
                    },
                )
                // ── Incoming likes / swipes ──
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'swipes', filter: `swiped_id=eq.${user.id}` },
                    () => {
                        qc.invalidateQueries({ queryKey: ['likes'] })
                        qc.invalidateQueries({ queryKey: ['notifications'] })
                    },
                )
                // ── New messages → refresh chat list / unread badges ──
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages' },
                    (payload) => {
                        const row = payload.new as { conversation_id?: string; sender_id?: string }
                        qc.invalidateQueries({ queryKey: ['matches'] })
                        if (
                            activeConversationId &&
                            row.conversation_id === activeConversationId
                        ) {
                            chatHandlers.onNewMessage?.({
                                matchId: activeMatchId || undefined,
                                conversationId: row.conversation_id,
                            })
                        }
                    },
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'messages' },
                    () => {
                        qc.invalidateQueries({ queryKey: ['matches'] })
                        if (activeMatchId) {
                            qc.invalidateQueries({ queryKey: ['messages', activeMatchId] })
                        }
                    },
                )
                .subscribe()

            // ── Presence (online / offline) ──
            if (onlineChannel) {
                await supabase.removeChannel(onlineChannel)
                onlineChannel = null
            }

            onlineChannel = supabase.channel('tryst-online', {
                config: { presence: { key: user.id } },
            })

            onlineChannel
                .on('presence', { event: 'sync' }, () => {
                    if (onlineChannel) syncPresenceFromChannel(onlineChannel)
                })
                .on('presence', { event: 'join' }, () => {
                    if (onlineChannel) syncPresenceFromChannel(onlineChannel)
                })
                .on('presence', { event: 'leave' }, () => {
                    if (onlineChannel) syncPresenceFromChannel(onlineChannel)
                })
                .subscribe(async (status) => {
                    if (cancelled) return
                    if (status === 'SUBSCRIBED') {
                        usePresenceStore.getState().setConnected(true)
                        const ghost = useAppStore.getState().isGhostMode
                        if (!ghost) {
                            await trackOnline(user.id)
                        }
                        clearHeartbeat()
                        heartbeatTimer = setInterval(() => {
                            if (useAppStore.getState().isGhostMode) return
                            void touchLastSeen(user.id)
                            void trackOnline(user.id)
                        }, HEARTBEAT_MS)
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        usePresenceStore.getState().setConnected(false)
                    }
                })
        })()

        return () => {
            cancelled = true
            clearHeartbeat()
        }
    }, [isAuthenticated, qc])

    useEffect(() => {
        if (!isAuthenticated || !currentUserId || !onlineChannel) return
        if (isGhostMode) {
            void untrackOnline()
            setTimeout(() => {
                if (onlineChannel) syncPresenceFromChannel(onlineChannel)
            }, 200)
        } else {
            void trackOnline(currentUserId)
        }
    }, [isAuthenticated, isGhostMode, currentUserId])

    return null
}

/** Join a match chat: typing broadcast + optional conversation-scoped handlers. */
export function joinChat(
    matchId: string,
    handlers: ChatHandlers = {},
    conversationId?: string | null,
) {
    const supabase = createClient()
    activeMatchId = matchId
    activeConversationId = conversationId || null
    chatHandlers = handlers
    setActiveChatMatchId(matchId)

    if (chatChannel) {
        supabase.removeChannel(chatChannel)
        chatChannel = null
    }
    if (typingChannel) {
        supabase.removeChannel(typingChannel)
        typingChannel = null
    }

    // Dedicated message channel for this conversation (faster than global alone)
    const msgFilter = conversationId
        ? { event: 'INSERT' as const, schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }
        : { event: 'INSERT' as const, schema: 'public', table: 'messages' }

    chatChannel = supabase
        .channel(`chat-messages:${matchId}`)
        .on('postgres_changes', msgFilter, (payload) => {
            const row = payload.new as {
                conversation_id?: string
                sender_id?: string
                id?: string
                content?: string
                created_at?: string
                is_read?: boolean
                delivered_at?: string
                expires_at?: string
                type?: string
            }
            chatHandlers.onNewMessage?.({
                matchId,
                conversationId: row.conversation_id || conversationId || undefined,
                senderId: row.sender_id,
                message: row as Record<string, unknown>,
            })
        })
        .subscribe()

    typingChannel = supabase
        .channel(`typing:${matchId}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
            const p = payload as { isTyping?: boolean; userId?: string; alias?: string }
            const me = useAppStore.getState().currentUserId
            // Never show my own typing as "other person is typing"
            if (p?.userId && me && p.userId === me) return
            chatHandlers.onTyping?.({
                isTyping: !!p?.isTyping,
                userId: p?.userId,
                alias: p?.alias,
            })
        })
        .subscribe()
}

export function getActiveMatchId() {
    return activeMatchId
}

export function leaveChat(matchId?: string) {
    const supabase = createClient()
    if (matchId && activeMatchId && matchId !== activeMatchId) return
    if (chatChannel) {
        supabase.removeChannel(chatChannel)
        chatChannel = null
    }
    if (typingChannel) {
        supabase.removeChannel(typingChannel)
        typingChannel = null
    }
    activeMatchId = null
    activeConversationId = null
    chatHandlers = {}
    setActiveChatMatchId(null)
}

export function emitTyping(
    matchId: string,
    isTyping: boolean,
    meta?: { userId?: string; alias?: string },
) {
    if (!typingChannel || activeMatchId !== matchId) return
    const me = useAppStore.getState().currentUserId
    typingChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
            isTyping,
            matchId,
            userId: meta?.userId || me || undefined,
            alias: meta?.alias || undefined,
        },
    })
}

export function teardownRealtime() {
    const supabase = createClient()
    clearHeartbeat()
    if (notifChannel) supabase.removeChannel(notifChannel)
    if (chatChannel) supabase.removeChannel(chatChannel)
    if (typingChannel) supabase.removeChannel(typingChannel)
    if (onlineChannel) supabase.removeChannel(onlineChannel)
    notifChannel = null
    chatChannel = null
    typingChannel = null
    onlineChannel = null
    activeMatchId = null
    activeConversationId = null
    setActiveChatMatchId(null)
    usePresenceStore.getState().reset()
}

/** @deprecated Socket.IO removed — use joinChat / emitTyping */
export function getSocket() {
    return {
        emit: (event: string, payload?: unknown) => {
            if (event === 'join_chat' && typeof payload === 'string') {
                joinChat(payload)
            } else if (event === 'leave_chat') {
                leaveChat(typeof payload === 'string' ? payload : undefined)
            } else if (event === 'typing' && payload && typeof payload === 'object') {
                const p = payload as { matchId: string; isTyping: boolean }
                emitTyping(p.matchId, p.isTyping)
            }
        },
                        on: (event: string, cb: (...args: unknown[]) => void) => {
            if (event === 'new_message') {
                const prev = chatHandlers.onNewMessage
                chatHandlers.onNewMessage = (p) => {
                    prev?.(p)
                    cb(p)
                }
            } else if (event === 'partner_typing') {
                const prev = chatHandlers.onTyping
                chatHandlers.onTyping = (info) => {
                    prev?.(info)
                    cb(info)
                }
            }
        },
        off: (event: string) => {
            if (event === 'new_message') chatHandlers.onNewMessage = undefined
            if (event === 'partner_typing') chatHandlers.onTyping = undefined
        },
    }
}

export function disconnectSocket() {
    teardownRealtime()
}
