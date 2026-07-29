import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createSupabaseClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

export function createServerSupabase() {
    const cookieStore = cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        )
                    } catch {
                        /* Server Component — ignore */
                    }
                },
            },
        },
    )
}

/** Prefer cookies; fall back to Authorization Bearer from the browser session */
export async function getRequestUser(req?: NextRequest) {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user

    const auth = req?.headers.get('authorization')
    if (auth?.startsWith('Bearer ')) {
        const token = auth.slice(7)
        const client = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const { data } = await client.auth.getUser(token)
        return data.user
    }
    return null
}
