'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orbitApi, pulseApi, engagementApi, matchApi, echoApi } from '@/lib/api/auth'
import { useToast } from './useToast'
import { useAppStore } from '@/lib/store/useAppStore'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { withLiveOnline } from './usePresence'

export function useOrbitFeed() {
    const onlineIds = usePresenceStore((s) => s.onlineIds)
    const synced = usePresenceStore((s) => s.synced)

    const query = useQuery({
        queryKey: ['orbit-feed'],
        queryFn: async () => {
            const { data } = await orbitApi.getFeed()
            return data.data.profiles as OrbitProfile[]
        },
        staleTime: 30 * 1000,
        refetchOnMount: 'always',
    })

    const data = useMemo(
        () => withLiveOnline(query.data ?? [], onlineIds, synced),
        [query.data, onlineIds, synced],
    )

    return { ...query, data }
}

export function useOrbitPull() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (targetId: string) => orbitApi.pull(targetId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['orbit-feed'] }),
    })
}

export function useOrbitIgnite() {
    const qc = useQueryClient()
    const { triggerMatchAnimation } = useAppStore()
    return useMutation({
        mutationFn: (targetId: string) => orbitApi.ignite(targetId),
        onSuccess: ({ data }) => {
            qc.invalidateQueries({ queryKey: ['orbit-feed'] })
            qc.invalidateQueries({ queryKey: ['matches'] })
            if (data.data.matched && data.data.partner) {
                triggerMatchAnimation({
                    alias: data.data.partner.alias,
                    avatarUrl: data.data.partner.avatarUrl,
                })
            }
        },
    })
}

export function useEngagementHome() {
    return useQuery({
        queryKey: ['engagement-home'],
        queryFn: async () => {
            const { data } = await engagementApi.getHome()
            return data.data as EngagementHome
        },
        staleTime: 30 * 1000,
    })
}

export function useStreakCheckIn() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: () => engagementApi.checkInStreak(),
        onSuccess: ({ data }) => {
            qc.invalidateQueries({ queryKey: ['engagement-home'] })
            if (!data.data.alreadyCheckedIn) {
                toast.success('Streak updated', `${data.data.streak}-day Desire Streak`)
            }
        },
    })
}

export function useSaveDiary() {
    const toast = useToast()
    return useMutation({
        mutationFn: ({ prompt, answer }: { prompt: string; answer: string }) =>
            engagementApi.saveDiary(prompt, answer),
        onSuccess: () => toast.success('Saved', 'Added to your Desire Diary'),
    })
}

export function useCreateMoment() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (content: string) => engagementApi.createMoment(content),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['engagement-home'] })
            toast.success('Moment shared', 'Visible in your city for 2 hours')
        },
    })
}

export function usePulseGlobe() {
    return useQuery({
        queryKey: ['pulse-globe'],
        queryFn: async () => {
            const { data } = await pulseApi.getGlobe()
            return data.data as { cities: PulseCity[]; totalActive: number }
        },
        staleTime: 2 * 60 * 1000,
    })
}

export function usePulsePeople() {
    const onlineIds = usePresenceStore((s) => s.onlineIds)
    const synced = usePresenceStore((s) => s.synced)

    const query = useQuery({
        queryKey: ['pulse-people'],
        queryFn: async () => {
            const { data } = await pulseApi.getPeople()
            return data.data.people as WorldPerson[]
        },
        staleTime: 5 * 60 * 1000,
    })

    const data = useMemo(
        () => withLiveOnline(query.data ?? [], onlineIds, synced),
        [query.data, onlineIds, synced],
    )

    return { ...query, data }
}

export function usePulseConnect() {
    const qc = useQueryClient()
    const toast = useToast()
    const { triggerMatchAnimation } = useAppStore()

    return useMutation({
        mutationFn: (targetId: string) => pulseApi.connect(targetId),
        onSuccess: (res, targetId) => {
            const payload = res.data?.data as {
                matched?: boolean
                alreadySent?: boolean
                targetAlias?: string
            }

            qc.setQueryData(['pulse-people'], (old: WorldPerson[] | undefined) =>
                old?.map(p => (p.id === targetId ? { ...p, pulseSent: true } : p)),
            )

            const people = qc.getQueryData(['pulse-people']) as WorldPerson[] | undefined
            const person = people?.find(p => p.id === targetId)
            const name = payload?.targetAlias || person?.alias || 'them'

            if (payload?.matched) {
                triggerMatchAnimation({ alias: name, avatarUrl: person?.avatarUrl || '' })
                toast.success("It's a Spark!", `You matched with ${name}`)
            } else if (payload?.alreadySent) {
                toast.info('Already sent', `You already connected with ${name}`)
            } else {
                toast.success('Connect sent', `${name} will see your request in notifications`)
            }
        },
        onError: (e: unknown) => {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error('Could not connect', msg || 'Please try again')
        },
    })
}

export function useCallConsent(matchId: string | null) {
    return useQuery({
        queryKey: ['call-consent', matchId],
        queryFn: async () => {
            const { data } = await matchApi.getCallConsent(matchId!)
            return data.data as CallConsent
        },
        enabled: !!matchId,
    })
}

export function useSetCallConsent() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (matchId: string) => matchApi.setCallConsent(matchId),
        onSuccess: ({ data }, matchId) => {
            qc.invalidateQueries({ queryKey: ['call-consent', matchId] })
            if (data.data.canCall) toast.success('Call unlocked', 'You both agreed to voice chat')
            else toast.info('Consent sent', 'Waiting for your match to agree')
        },
    })
}

export interface OrbitProfile {
    id: string
    alias: string
    age: number
    city: string
    country: string
    bio: string
    desireTags: string[]
    profession: string
    photoUrls: string[]
    avatarUrl: string
    isVerified: boolean
    matchScore: number
    gender: string
    desireArchetype: string
    build: string
    orientation: string
    ring: number
    isOnline: boolean
    distanceKm: number | null
    latitude?: number | null
    longitude?: number | null
    profileCompletion: number
}

export interface EngagementHome {
    alias: string
    avatarUrl: string
    city: string
    points: number
    greeting: string
    streak: number
    streakLastDate: string | null
    chemistry: { score: number; alias: string; avatarUrl: string; partnerId: string } | null
    allChemistry: { score: number; alias: string; avatarUrl: string; partnerId: string }[]
    profileVisitors: { count: number; unlockCost: number; unlocked: boolean }
    anonymousPrompts: { id: string; type: string; preview: string; likeCount: number; replyCount: number; liked: boolean }[]
    dailyMediaTasks: { type: string; label: string; points: number; done: boolean }[]
    moments: { id: string; content: string; city: string; createdAt: string; alias: string; avatarUrl: string }[]
    weeklyPick: {
        id: string; alias: string; avatarUrl: string; age: number; bio: string
        desireArchetype: string; matchScore: number; city: string
    } | null
    isNight: boolean
    archetype: string
    isGold: boolean
    diaryPrompt: string
    disguiseModeEnabled?: boolean
    activeDisguiseSkin?: string
    isGhostMode?: boolean
}

export interface PulseCity {
    city: string
    lon: number
    lat: number
    count: number
}

export interface WorldPerson {
    id: string
    alias: string
    city: string
    country: string
    prompt: string
    tag: string
    online: boolean
    avatarUrl?: string
    pulseSent?: boolean
    isDemo?: boolean
}

export interface CallConsent {
    myConsent: boolean
    partnerConsent: boolean
    canCall: boolean
}

export interface EchoAuthor {
    id: string
    alias: string
    archetype: string
    avatarUrl: string
    city: string
}

export interface EchoItem {
    id: string
    type: 'VIDEO' | 'AUDIO' | 'TEXT'
    mediaUrl: string | null
    thumbUrl: string | null
    textBody: string | null
    caption: string | null
    bgTheme: string
    faceBlurred: boolean
    voiceMasked: boolean
    audience: string
    cityCluster: string
    likeCount: number
    status: string
    lifespan: string
    expiresAt: string | null
    createdAt: string
    author: EchoAuthor
    viewerReaction?: string | null
}

export interface EchoLiker {
    id: string
    alias: string
    archetype: string
    avatarUrl: string
    likedAt: string
}

export function useEchoFeed() {
    return useQuery({
        queryKey: ['echo-feed'],
        queryFn: async () => {
            const { data } = await echoApi.getFeed()
            return data.data as { echoes: EchoItem[]; nextCursor: string | null; city: string }
        },
        staleTime: 20 * 1000,
        refetchOnMount: 'always',
    })
}

export function useMyEchoes() {
    return useQuery({
        queryKey: ['echo-mine'],
        queryFn: async () => {
            const { data } = await echoApi.getMine()
            return data.data.echoes as EchoItem[]
        },
    })
}

export function useEchoLikers(echoId: string | null, enabled: boolean) {
    return useQuery({
        queryKey: ['echo-likers', echoId],
        queryFn: async () => {
            const { data } = await echoApi.getLikers(echoId!)
            return data.data.likers as EchoLiker[]
        },
        enabled: !!echoId && enabled,
    })
}

export function useCreateEcho() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (formData: FormData) => echoApi.create(formData),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['echo-feed'] })
            qc.invalidateQueries({ queryKey: ['echo-mine'] })
            toast.success('Echo posted', 'Your expression is live in your city')
        },
        onError: (e: unknown) => {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error('Could not post', msg || 'Please try again')
        },
    })
}

export function useEchoLike() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => echoApi.like(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['echo-feed'] }),
    })
}

export function useEchoDislike() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => echoApi.dislike(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['echo-feed'] }),
    })
}

export function useDeleteEcho() {
    const qc = useQueryClient()
    const toast = useToast()
    return useMutation({
        mutationFn: (id: string) => echoApi.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['echo-mine'] })
            qc.invalidateQueries({ queryKey: ['echo-feed'] })
            toast.success('Echo removed')
        },
    })
}
