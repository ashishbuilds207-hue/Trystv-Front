import { createBrowserClient } from '@supabase/ssr'
import { publicConfig } from '@/lib/config'

export function createClient() {
    return createBrowserClient(
        publicConfig.supabaseUrl,
        publicConfig.supabasePublishableKey,
    )
}

export const supabase = typeof window !== 'undefined'
    ? createBrowserClient(publicConfig.supabaseUrl, publicConfig.supabasePublishableKey)
    : null
