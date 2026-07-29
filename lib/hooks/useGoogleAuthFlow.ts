'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from '@/lib/hooks/useToast'
import { createClient } from '@/lib/supabase/client'
import { publicConfig } from '@/lib/config'

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

    const googleLogin = useCallback(async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${publicConfig.appUrl}/auth/callback`,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                },
            })
            if (error) throw error
            // Redirect happens — keep loading
        } catch {
            toast.error('Google login failed', 'Enable Google provider in Supabase Auth, then try again.')
            setLoading(false)
        }
    }, [toast])

    // Keep unused refs quiet for pages that still expect loading flag
    void router
    void setAuthenticated

    return { googleLogin, loading }
}
