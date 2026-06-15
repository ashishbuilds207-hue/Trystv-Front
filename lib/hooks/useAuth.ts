'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from './useToast'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'

export function useAuthUser() {
    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const { data } = await authApi.getMe()
            return data.data.user
        },
        enabled: typeof window !== 'undefined' && !!localStorage.getItem('tryst_token'),
        staleTime: 5 * 60 * 1000,
    })
}

export function useSendOtp() {
    const toast = useToast()
    return useMutation({
        mutationFn: (phone: string) => authApi.sendOtp(phone),
        onSuccess: () => toast.success('OTP Sent', 'Check your phone for the verification code.'),
        onError: (e: AxiosError<{ message: string }>) =>
            toast.error('Failed to send OTP', e.response?.data?.message),
    })
}

export function useVerifyOtp() {
    const toast = useToast()
    return useMutation({
        mutationFn: ({ phone, otp }: { phone: string; otp: string }) => authApi.verifyOtp(phone, otp),
        onError: (e: AxiosError<{ message: string }>) =>
            toast.error('Invalid OTP', e.response?.data?.message || 'Please try again.'),
    })
}

export function useRegister() {
    const toast = useToast()
    const { setAuthenticated } = useAppStore()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Parameters<typeof authApi.register>[0]) => authApi.register(data),
        onSuccess: ({ data }) => {
            localStorage.setItem('tryst_token', data.data.accessToken)
            localStorage.setItem('tryst_refresh', data.data.refreshToken)
            setAuthenticated(true)
            qc.setQueryData(['me'], data.data.user)
            toast.success('Welcome to TRYST!', `Your story begins, ${data.data.user.alias}.`)
        },
        onError: (e: AxiosError<{ message: string }>) =>
            toast.error('Registration failed', e.response?.data?.message),
    })
}

export function useGoogleLogin() {
    const toast = useToast()
    const { setAuthenticated } = useAppStore()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (idToken: string) => authApi.googleLogin(idToken),
        onSuccess: ({ data }) => {
            if (data.data.isNew) return data.data
            localStorage.setItem('tryst_token', data.data.accessToken)
            localStorage.setItem('tryst_refresh', data.data.refreshToken)
            setAuthenticated(true)
            qc.setQueryData(['me'], data.data.user)
            toast.success('Welcome back!', `Good to see you, ${data.data.user.alias}.`)
            return data.data
        },
        onError: () => toast.error('Google login failed', 'Please try again.'),
    })
}

export function useSignOut() {
    const { setAuthenticated } = useAppStore()
    const qc = useQueryClient()
    const router = useRouter()
    const toast = useToast()
    return () => {
        localStorage.removeItem('tryst_token')
        localStorage.removeItem('tryst_refresh')
        setAuthenticated(false)
        qc.clear()
        toast.info('Signed out', 'Your session has ended discreetly.')
        router.push('/login')
    }
}
