'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orbitApi, pulseApi, engagementApi, matchApi } from '@/lib/api/auth'
import { useToast } from './useToast'
import { useAppStore } from '@/lib/store/useAppStore'

export function useOrbitFeed() {
    return useQuery({
        queryKey: ['orbit-feed'],
        queryFn: async () => {
            const { data } = await orbitApi.getFeed()
            return data.data.profiles as OrbitProfile[]
        },
        staleTime: 60 * 1000,
    })
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
    return useQuery({
        queryKey: ['pulse-people'],
        queryFn: async () => {
            const { data } = await pulseApi.getPeople()
            return data.data.people as WorldPerson[]
        },
        staleTime: 5 * 60 * 1000,
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
}

export interface CallConsent {
    myConsent: boolean
    partnerConsent: boolean
    canCall: boolean
}
