import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/** Stable Auth password per email (NOT tied to OTP digits — OTP only gates login). */
export function stableOtpPassword(email: string) {
    const secret = process.env.OTP_HMAC_SECRET || process.env.RESEND_API_KEY || 'tryst-otp'
    const h = crypto.createHmac('sha256', secret).update(`tryst-auth:${email.trim().toLowerCase()}`).digest('hex')
    return `Tryst!A1${h.slice(0, 24)}`
}

export function anonClient(accessToken?: string): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createClient(url, key, {
        global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

export function adminClient(): SupabaseClient | null {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!key?.trim()) return null
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    return listed?.users?.find((u) => u.email?.toLowerCase() === email) || null
}

/**
 * Ensure Auth user exists with the stable password so verify can signInWithPassword.
 * Prefer admin APIs so Supabase does NOT send its own auth emails (avoids rate limits).
 * OTP emails are sent only via Resend.
 */
export async function ensureAuthUserForOtp(email: string) {
    const password = stableOtpPassword(email)
    const admin = adminClient()

    if (admin) {
        const existing = await findAuthUserByEmail(admin, email)
        if (existing) {
            const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
                password,
                email_confirm: true,
            })
            if (updErr) {
                return { ok: false as const, mode: 'error' as const, message: updErr.message, password }
            }
            return { ok: true as const, mode: 'existing' as const, password }
        }

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { alias: email.split('@')[0], otp_login: true },
        })
        if (createErr || !created.user) {
            // Race: user created between list and create
            if (/already|registered|exists/i.test(createErr?.message || '')) {
                const again = await findAuthUserByEmail(admin, email)
                if (again) {
                    await admin.auth.admin.updateUserById(again.id, {
                        password,
                        email_confirm: true,
                    })
                    return { ok: true as const, mode: 'existing' as const, password }
                }
            }
            return {
                ok: false as const,
                mode: 'error' as const,
                message: createErr?.message || 'Could not create auth user',
                password,
            }
        }
        return { ok: true as const, mode: 'new' as const, password }
    }

    // No service role — last resort (may trigger Supabase email / rate limits)
    const supabase = anonClient()
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { alias: email.split('@')[0], otp_login: true },
            // Avoid redirect emails when possible
            emailRedirectTo: undefined,
        },
    })

    if (signUpErr) {
        if (/rate limit|over_email/i.test(signUpErr.message || '')) {
            return {
                ok: false as const,
                mode: 'error' as const,
                message: 'email rate limit exceeded',
                password,
            }
        }
        if (/already|registered|exists/i.test(signUpErr.message || '')) {
            return { ok: true as const, mode: 'existing' as const, password, needsServiceRole: true }
        }
        return { ok: false as const, mode: 'error' as const, message: signUpErr.message, password }
    }

    void signUpData
    return { ok: true as const, mode: 'new' as const, password }
}

/** After OTP table match: create Supabase session tokens. */
export async function sessionAfterOtpMatch(email: string) {
    const password = stableOtpPassword(email)
    const supabase = anonClient()
    const admin = adminClient()

    let { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error && admin) {
        const existing = await findAuthUserByEmail(admin, email)
        if (existing) {
            await admin.auth.admin.updateUserById(existing.id, {
                password,
                email_confirm: true,
            })
        } else {
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { alias: email.split('@')[0], otp_login: true },
            })
            if (createErr || !created.user) {
                return { error: createErr?.message || 'Could not create auth user' }
            }
        }
        const retry = await supabase.auth.signInWithPassword({ email, password })
        data = retry.data
        error = retry.error
    }

    if (error || !data.session || !data.user) {
        const hint = !admin
            ? ' Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Dashboard → Settings → API → service_role), then request a new code.'
            : ' Turn Confirm email OFF in Authentication → Providers → Email.'
        return {
            error: (error?.message || 'Could not create session.') + hint,
        }
    }

    return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.user.id,
    }
}
