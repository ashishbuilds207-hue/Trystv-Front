'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGoogleLogin } from '@react-oauth/google'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from '@/lib/hooks/useToast'
import api from '@/lib/api/client'

export type GoogleUserData = {
    googleId: string
    email: string
    name: string
    avatar: string
}

export function useGoogleAuthFlow() {
    const router = useRouter()
    const { setAuthenticated } = useAppStore()
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    const completeGoogleAuth = useCallback(async (accessToken: string) => {
        setLoading(true)
        try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (!userInfoRes.ok) throw new Error('Could not load Google profile')
            const userInfo = await userInfoRes.json()

            const { data } = await api.post('/auth/google-access', {
                accessToken,
                googleId: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
            })

            if (data.data.isNew) {
                const googleData: GoogleUserData = {
                    googleId: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name || '',
                    avatar: userInfo.picture || '',
                }
                sessionStorage.setItem('tryst_google_data', JSON.stringify(googleData))
                router.push('/register?source=google')
                return
            }

            localStorage.setItem('tryst_token', data.data.accessToken)
            localStorage.setItem('tryst_refresh', data.data.refreshToken)
            setAuthenticated(true)
            toast.success('Welcome back!', `Good to see you, ${data.data.user.alias}.`)
            router.push('/tonight')
        } catch {
            toast.error('Google login failed', 'Please try again.')
        } finally {
            setLoading(false)
        }
    }, [router, setAuthenticated, toast])

    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => completeGoogleAuth(tokenResponse.access_token),
        onError: () => {
            toast.error('Google login cancelled', 'Please try again.')
            setLoading(false)
        },
        scope: 'openid email profile',
    })

    return { googleLogin: () => googleLogin(), loading }
}
