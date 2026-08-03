'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from './useToast'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { useEffect, useState } from 'react'

export function useAuthUser() {
    const { isAuthenticated, setAuthenticated, setCurrentUser } = useAppStore()
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                setAuthenticated(true)
                setCurrentUser(data.session.user.id, data.session.access_token)
                localStorage.setItem('tryst_token', 'supabase')
            }
            setReady(true)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setAuthenticated(true)
                setCurrentUser(session.user.id, session.access_token)
                localStorage.setItem('tryst_token', 'supabase')
            } else {
                setAuthenticated(false)
                localStorage.removeItem('tryst_token')
            }
        })
        return () => subscription.unsubscribe()
    }, [setAuthenticated, setCurrentUser])

    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const { data } = await authApi.getMe()
            return data.data.user
        },
        enabled: ready && isAuthenticated,
        staleTime: 5 * 60 * 1000,
    })
}

export function useSendOtp() {
    const toast = useToast()
    return useMutation({
        mutationFn: (
            input:
                | string
                | { email?: string; phone?: string; purpose?: 'login' | 'register' },
        ) => {
            if (typeof input === 'string') return authApi.sendOtp(input, 'login')
            return authApi.sendOtp({
                email: input.email,
                phone: input.phone,
                purpose: input.purpose || 'login',
            })
        },
        onSuccess: (res) => {
            const payload = res.data?.data as {
                emailSent?: boolean
                smsSent?: boolean
                otp?: string
            } | undefined
            if (payload?.otp && !payload.emailSent && !payload.smsSent) {
                toast.success('Code ready', 'Use the code shown on screen.')
            } else if (payload?.emailSent && payload?.smsSent) {
                toast.success('Code sent', 'Check your email and phone.')
            } else if (payload?.smsSent) {
                toast.success('Code sent', 'Check your phone for the SMS.')
            } else if (payload?.emailSent) {
                toast.success('Code sent', 'Check your inbox for the 6-digit code.')
            } else {
                toast.success('Code sent', 'Check email or phone for your TRYST code.')
            }
        },
        onError: (e: unknown) => {
            const msg = getApiErrorMessage(e, 'Try again shortly.')
            // Register page shows its own banner for CONTACT_EXISTS
            if (/already exists|try a new email|try login/i.test(msg)) return
            toast.error('Could not send code', formatOtpSendError(msg))
        },
    })
}

export function useSendMagicLink() {
    const toast = useToast()
    return useMutation({
        mutationFn: ({ email, next }: { email: string; next?: 'login' | 'register' }) =>
            authApi.sendMagicLink(email, next || 'login'),
        onSuccess: () => toast.success('Link sent', 'Open the Sign in link in your email.'),
        onError: (e: unknown) => {
            toast.error('Email failed', formatOtpSendError(getApiErrorMessage(e, 'Could not send link.')))
        },
    })
}

export function useVerifyOtp() {
    const toast = useToast()
    const { setAuthenticated } = useAppStore()
    return useMutation({
        mutationFn: (input: { email?: string; phone?: string; otp: string }) =>
            authApi.verifyOtp(input),
        onSuccess: (res) => {
            if (!res.data.data.isNew) {
                setAuthenticated(true)
                localStorage.setItem('tryst_token', 'supabase')
            }
        },
        onError: (e: unknown) => {
            toast.error('Invalid code', getApiErrorMessage(e, 'Check the code and try again.'))
        },
    })
}

export function useRegister() {
    const toast = useToast()
    const { setAuthenticated } = useAppStore()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Parameters<typeof authApi.register>[0]) => authApi.register(data),
        onSuccess: ({ data }) => {
            localStorage.setItem('tryst_token', data.data.accessToken || 'supabase')
            localStorage.setItem('tryst_refresh', data.data.refreshToken || 'supabase')
            setAuthenticated(true)
            qc.setQueryData(['me'], data.data.user)
            if (data.data.resumed) {
                toast.success(
                    'Welcome back!',
                    data.data.freshStart
                        ? `${data.data.user?.alias} — profile updated`
                        : `Good to see you again, ${data.data.user?.alias}`,
                )
            } else {
                toast.success('Welcome to TRYST!', `You're in as ${data.data.user?.alias}.`)
            }
        },
        onError: (e: unknown) =>
            toast.error('Registration failed', getApiErrorMessage(e, 'Please try again')),
    })
}

export function useGoogleLogin() {
    const toast = useToast()
    return useMutation({
        mutationFn: async () => {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=login`,
                },
            })
            if (error) throw error
        },
        onError: () => toast.error('Google login failed', 'Please try again.'),
    })
}

export function useSignOut() {
    const { setAuthenticated, signOut } = useAppStore()
    const qc = useQueryClient()
    const router = useRouter()
    const toast = useToast()
    return async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        signOut()
        setAuthenticated(false)
        qc.clear()
        toast.info('Signed out', 'Your session has ended discreetly.')
        router.push('/login')
    }
}

export type { OtpDeliveryMode }
