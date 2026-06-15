'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useState } from 'react'
import { ToastProvider } from '@/components/ui/toast-provider'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: { staleTime: 60 * 1000, retry: 1 },
            mutations: { retry: 0 },
        },
    }))

    return (
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
            <QueryClientProvider client={queryClient}>
                {children}
                <ToastProvider />
            </QueryClientProvider>
        </GoogleOAuthProvider>
    )
}
