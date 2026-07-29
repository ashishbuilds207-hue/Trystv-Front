import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Exchanges ?code= from Supabase magic link / OAuth for a session,
 * then sends new users to register and returning users into the app.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') || ''
    const errDesc = searchParams.get('error_description') || searchParams.get('error')

    if (errDesc) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errDesc)}`)
    }
    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const cookiesToApply: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookiesToApply.push({ name, value, options: options || {} })
                })
            },
        },
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(error?.message || 'sign_in_failed')}`,
        )
    }

    const { data: profile } = await supabase
        .from('users')
        .select('age, gender, profile_complete')
        .eq('id', data.user.id)
        .maybeSingle()

    const needsProfile =
        next === 'register' ||
        !profile?.profile_complete ||
        !profile?.age ||
        !profile?.gender

    const dest = needsProfile ? `${origin}/register?source=magic` : `${origin}/tonight`
    const response = NextResponse.redirect(dest)

    cookiesToApply.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    })

    return response
}
