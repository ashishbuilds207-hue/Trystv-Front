'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { userApi, matchApi, messageApi } from '@/lib/api/auth'
import { useToast } from './useToast'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { useAppStore } from '@/lib/store/useAppStore'
import { withLiveOnline } from './usePresence'

export function useDiscoverProfiles() {
    return useInfiniteQuery({
        queryKey: ['discover'],
        queryFn: async ({ pageParam = 1 }) => {
            const { data } = await userApi.getDiscover(pageParam as number)
            return data.data.profiles as DiscoverProfile[]
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, _, lastPageParam) =>
            lastPage.length === 20 ? (lastPageParam as number) + 1 : undefined,
        staleTime: 2 * 60 * 1000,
    })
}

export function useSwipe() {
    const qc = useQueryClient()
    const { triggerMatchAnimation } = useAppStore()
    return useMutation({
        mutationFn: ({ targetId, direction }: { targetId: string; direction: 'like' | 'pass' | 'super' }) =>
            matchApi.swipe(targetId, direction),
        onSuccess: ({ data }, { targetId }) => {
            qc.invalidateQueries({ queryKey: ['likes'] })
            if (data.data.matched) {
                qc.invalidateQueries({ queryKey: ['matches'] })
                const discover = qc.getQueryData<{ pages: DiscoverProfile[][] }>(['discover'])
                const fromDiscover = discover?.pages?.flat().find((p) => p.id === targetId)
                const likes = qc.getQueryData<IncomingLike[]>(['likes'])
                const fromLikes = likes?.find((p) => p.id === targetId)
                const payload = data.data as { alias?: string; targetAlias?: string; avatarUrl?: string }
                triggerMatchAnimation({
                    alias: fromDiscover?.alias || fromLikes?.alias || payload.targetAlias || payload.alias || 'Someone special',
                    avatarUrl: fromDiscover?.avatarUrl || fromLikes?.avatarUrl || payload.avatarUrl || '',
                })
            }
        },
    })
}

export function useLikes() {
    const onlineIds = usePresenceStore((s) => s.onlineIds)
    const synced = usePresenceStore((s) => s.synced)

    const query = useQuery({
        queryKey: ['likes'],
        queryFn: async () => {
            const { data } = await matchApi.getLikes()
            return data.data.likes as IncomingLike[]
        },
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    })

    const data = useMemo(
        () => withLiveOnline(query.data ?? [], onlineIds, synced),
        [query.data, onlineIds, synced],
    )

    return { ...query, data }
}

export function useMatches() {
    const onlineIds = usePresenceStore((s) => s.onlineIds)
    const synced = usePresenceStore((s) => s.synced)

    const query = useQuery({
        queryKey: ['matches'],
        queryFn: async () => {
            const { data } = await matchApi.getMatches()
            return data.data.matches as Match[]
        },
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    })

    const data = useMemo(() => {
        const list = query.data ?? []
        return list.map((m) => {
            const fallback =
                !!m.lastSeen && new Date(m.lastSeen).getTime() > Date.now() - 5 * 60 * 1000
            return {
                ...m,
                isOnline: synced ? !!onlineIds[m.partnerId] : fallback,
            }
        })
    }, [query.data, onlineIds, synced])

    return { ...query, data }
}

export function useMessages(matchId: string | null) {
    return useQuery({
        queryKey: ['messages', matchId],
        queryFn: async () => {
            const { data } = await messageApi.getMessages(matchId!)
            return data.data as { messages: Message[]; convId: string; deleteTimer: string }
        },
        enabled: !!matchId,
        staleTime: 0,
        refetchInterval: false,
    })
}

export function useSendMessage() {
    const qc = useQueryClient()
    const toast = useToast()
    const currentUserId = useAppStore((s) => s.currentUserId)

    return useMutation({
        mutationFn: ({ matchId, content, type = 'text' }: { matchId: string; content: string; type?: string; tempId?: string }) =>
            messageApi.sendMessage(matchId, content, type),
        onMutate: async ({ matchId, content, tempId }) => {
            const id = tempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            await qc.cancelQueries({ queryKey: ['messages', matchId] })
            const previous = qc.getQueryData<{ messages: Message[]; convId: string; deleteTimer: string }>(['messages', matchId])

            const optimistic: Message = {
                id,
                senderId: currentUserId || 'me',
                content,
                type: 'text',
                isRead: false,
                isDeleted: false,
                expiresAt: null,
                createdAt: new Date().toISOString(),
                senderAlias: '',
                senderAvatar: '',
                deliveredAt: null,
                status: 'sending',
            }

            qc.setQueryData(['messages', matchId], (old: { messages: Message[]; convId: string; deleteTimer: string } | undefined) => ({
                messages: [...(old?.messages ?? previous?.messages ?? []), optimistic],
                convId: old?.convId ?? previous?.convId ?? '',
                deleteTimer: old?.deleteTimer ?? previous?.deleteTimer ?? 'never',
            }))

            return { previous, tempId: id, matchId }
        },
        onSuccess: (res, vars, ctx) => {
            const msg = res?.data?.data?.message as Message | undefined

            qc.setQueryData(['messages', vars.matchId], (old: { messages: Message[]; convId: string; deleteTimer: string } | undefined) => {
                if (!old) return old
                return {
                    ...old,
                    convId: (res?.data?.data as { convId?: string })?.convId || old.convId,
                    messages: old.messages.map((m) => {
                        if (m.id !== ctx?.tempId) return m
                        if (msg?.id) {
                            return {
                                ...m,
                                id: String(msg.id),
                                createdAt: msg.createdAt || m.createdAt,
                                expiresAt: msg.expiresAt ?? null,
                                isRead: !!msg.isRead,
                                deliveredAt: msg.deliveredAt ?? new Date().toISOString(),
                                status: 'sent' as const,
                            }
                        }
                        return { ...m, status: 'sent' as const, deliveredAt: new Date().toISOString() }
                    }),
                }
            })
            qc.invalidateQueries({ queryKey: ['matches'] })

            // OneSignal push to partner (suppressed on their device if this chat is open)
            const matches = qc.getQueryData<Match[]>(['matches'])
            const partnerId = matches?.find((m) => m.id === vars.matchId)?.partnerId
            if (partnerId) {
                void import('@/lib/onesignal/client').then(({ requestPushNotify }) => {
                    const me = qc.getQueryData<{ alias?: string }>(['me'])
                    void requestPushNotify({
                        toUserId: partnerId,
                        kind: 'message',
                        title: me?.alias || 'New message',
                        body: vars.content.length > 80 ? `${vars.content.slice(0, 80)}…` : vars.content,
                        matchId: vars.matchId,
                    })
                })
            }
        },
        onError: (e: { response?: { data?: { message?: string } } }, vars, ctx) => {
            if (ctx?.tempId) {
                qc.setQueryData(['messages', vars.matchId], (old: { messages: Message[]; convId: string; deleteTimer: string } | undefined) => {
                    if (!old) return old
                    return {
                        ...old,
                        messages: old.messages.map((m) =>
                            m.id === ctx.tempId ? { ...m, status: 'failed' as const } : m,
                        ),
                    }
                })
            }
            toast.error('Message failed', e.response?.data?.message || 'Please try again.')
        },
    })
}

export function useUserProfile(id?: string) {
    return useQuery({
        queryKey: ['profile', id || 'me'],
        queryFn: async () => {
            const { data } = await userApi.getProfile(id)
            return data.data.user as DiscoverProfile
        },
        staleTime: 5 * 60 * 1000,
        enabled: id !== undefined ? !!id : true,
    })
}

export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await userApi.getNotifications()
            return data.data.notifications as AppNotification[]
        },
        // Realtime invalidates this; light poll only as backup
        staleTime: 60 * 1000,
        refetchInterval: 120 * 1000,
    })
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DiscoverProfile {
    id: string
    alias: string
    age: number
    city: string
    country: string
    bio: string
    desireTags: string[]
    relationshipStatus: string
    profession: string
    photoUrls: string[]
    avatarUrl: string
    isVerified: boolean
    isOnline: boolean
    lastSeen: string
    matchScore: number
    gender: string
    desireArchetype?: string
    isGold?: boolean
    isObsidian?: boolean
    seeking?: string
    agePrefMin?: number
    agePrefMax?: number
    maxDistanceKm?: number
    activeDisguiseSkin?: string
    disguiseModeEnabled?: boolean
    isGhostMode?: boolean
    credits?: number
    heightCm?: number
    build?: string
    orientation?: string
    latitude?: number | null
    longitude?: number | null
    hasLocation?: boolean
    email?: string
    phone?: string
    profileComplete?: boolean
}

export interface IncomingLike {
    id: string
    alias: string
    avatarUrl: string
    photoUrls: string[]
    age: number
    city: string
    country: string
    bio: string
    isVerified: boolean
    desireTags: string[]
    desireArchetype: string
    isSuper: boolean
    likedAt: string
    distanceKm: number | null
    isOnline: boolean
}

export interface Match {
    id: string
    isSpark: boolean
    createdAt: string
    partnerId: string
    alias: string
    avatarUrl: string
    photoUrls: string[]
    age: number
    city: string
    country?: string | null
    bio?: string | null
    profession?: string | null
    desireArchetype?: string | null
    gender?: string | null
    orientation?: string | null
    build?: string | null
    profileCompletion?: number | null
    isVerified: boolean
    desireTags: string[]
    lastSeen: string
    convId: string
    deleteTimer: string
    lastMessage: string | null
    lastMessageAt: string | null
    unreadCount: number
    isOnline?: boolean
}

export interface Message {
    id: string
    senderId: string
    content: string
    type: string
    isRead: boolean
    isDeleted: boolean
    expiresAt: string | null
    createdAt: string
    senderAlias: string
    senderAvatar: string
    deliveredAt?: string | null
    /** Client-only: optimistic send pipeline */
    status?: 'sending' | 'sent' | 'failed'
}

export interface AppNotification {
    id: string
    type: string
    title: string
    body: string
    data: Record<string, string>
    isRead: boolean
    createdAt: string
}
