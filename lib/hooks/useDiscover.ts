'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { userApi, matchApi, messageApi } from '@/lib/api/auth'
import { useToast } from './useToast'

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
    return useMutation({
        mutationFn: ({ targetId, direction }: { targetId: string; direction: 'like' | 'pass' | 'super' }) =>
            matchApi.swipe(targetId, direction),
        onSuccess: ({ data }) => {
            if (data.data.matched) {
                qc.invalidateQueries({ queryKey: ['matches'] })
            }
        },
    })
}

export function useMatches() {
    return useQuery({
        queryKey: ['matches'],
        queryFn: async () => {
            const { data } = await matchApi.getMatches()
            return data.data.matches as Match[]
        },
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    })
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
        refetchInterval: 5000,
    })
}

export function useSendMessage() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: ({ matchId, content, type = 'text' }: { matchId: string; content: string; type?: string }) =>
            messageApi.sendMessage(matchId, content, type),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['messages', vars.matchId] })
            qc.invalidateQueries({ queryKey: ['matches'] })
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
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
            return data.data.notifications as Notification[]
        },
        refetchInterval: 30 * 1000,
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
    isVerified: boolean
    desireTags: string[]
    lastSeen: string
    convId: string
    deleteTimer: string
    lastMessage: string | null
    lastMessageAt: string | null
    unreadCount: number
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
}

interface Notification {
    id: string
    type: string
    title: string
    body: string
    data: Record<string, string>
    isRead: boolean
    createdAt: string
}
