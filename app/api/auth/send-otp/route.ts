import { NextResponse } from 'next/server'
import { buildOtpEmailHtml, buildOtpEmailText } from '@/lib/email/otpTemplate'
import { generateOtp, hashOtp } from '@/lib/email/otpChallenge'
import { adminClient, anonClient, ensureAuthUserForOtp } from '@/lib/email/otpAuth'
import { getMailProvider, sendOtpMail } from '@/lib/email/sendMail'

const rateMap = new Map<string, number>()

/** For now: always return OTP in API so UI can show it while email domain is unverified. */
function showOtpInResponse() {
    return process.env.OTP_DEV_SHOW_CODE !== 'false'
}

async function emailAlreadyRegistered(email: string): Promise<boolean> {
    const admin = adminClient()

    if (admin) {
        const { data: profile } = await admin
            .from('users')
            .select('id, profile_complete, alias')
            .eq('email', email)
            .maybeSingle()

        if (profile?.profile_complete) return true
        if (profile?.alias && profile.alias !== 'NewUser') return true

        const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const authUser = listed?.users?.find((u) => u.email?.toLowerCase() === email)
        if (authUser) {
            const { data: byId } = await admin
                .from('users')
                .select('id, profile_complete, alias')
                .eq('id', authUser.id)
                .maybeSingle()
            if (byId?.profile_complete) return true
            if (byId?.alias && byId.alias !== 'NewUser') return true
        }
        return false
    }

    const supabase = anonClient()
    const { data: profile } = await supabase
        .from('users')
        .select('id, profile_complete, alias')
        .eq('email', email)
        .maybeSingle()

    if (profile?.profile_complete) return true
    if (profile?.alias && profile.alias !== 'NewUser') return true
    return false
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { email?: string; purpose?: 'login' | 'register' }
        const normalized = (body.email || '').trim().toLowerCase()
        const purpose = body.purpose === 'register' ? 'register' : 'login'

        if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            return NextResponse.json({ success: false, message: 'Valid email required' }, { status: 400 })
        }

        if (purpose === 'register') {
            const exists = await emailAlreadyRegistered(normalized)
            if (exists) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Email already exists — try a new email',
                        code: 'EMAIL_EXISTS',
                    },
                    { status: 409 },
                )
            }
        }

        const last = rateMap.get(normalized) || 0
        if (Date.now() - last < 45_000) {
            return NextResponse.json(
                { success: false, message: 'Please wait ~45s before requesting another code.' },
                { status: 429 },
            )
        }

        const code = generateOtp()
        const codeHash = hashOtp(code)
        const supabase = anonClient()

        // 1) Store hash in otp_codes
        const { data: stored, error: storeErr } = await supabase.rpc('store_email_otp', {
            p_email: normalized,
            p_code_hash: codeHash,
            p_ttl_minutes: 10,
        })
        if (storeErr) {
            console.error('[send-otp] store_email_otp', storeErr)
            return NextResponse.json(
                {
                    success: false,
                    message:
                        storeErr.message.includes('function') || storeErr.code === 'PGRST202'
                            ? 'OTP table missing. Run TRYSTV1/supabase/otp_table.sql in Supabase SQL Editor.'
                            : storeErr.message,
                },
                { status: 500 },
            )
        }

        // 2) Ensure Auth user (admin — no Supabase emails)
        const ensured = await ensureAuthUserForOtp(normalized)
        if (!ensured.ok) {
            const isRate = /rate limit|over_email/i.test(ensured.message || '')
            return NextResponse.json(
                {
                    success: false,
                    message: isRate ? 'email rate limit exceeded' : ensured.message,
                    code: isRate ? 'EMAIL_RATE_LIMIT' : undefined,
                },
                { status: isRate ? 429 : 400 },
            )
        }

        // 3) Try email — if it fails (Resend test limit etc.), still succeed and show OTP on screen
        let emailSent = false
        let provider: string | null = getMailProvider()
        let emailError: string | null = null

        if (provider) {
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
            const mailed = await sendOtpMail({
                to: normalized,
                subject: `${code} is your TRYST code`,
                html: buildOtpEmailHtml({ code, email: normalized, appUrl }),
                text: buildOtpEmailText(code),
            })
            if (mailed.ok) {
                emailSent = true
                provider = mailed.provider
            } else {
                emailError = mailed.message
                console.warn('[send-otp] email failed, showing OTP on screen:', mailed.message)
            }
        }

        rateMap.set(normalized, Date.now())

        const reveal = showOtpInResponse() || !emailSent

        return NextResponse.json({
            success: true,
            message: emailSent
                ? 'Verification code sent'
                : 'Verification code ready (email not delivered — use the code shown)',
            data: {
                otpMode: emailSent ? ('email' as const) : ('onscreen' as const),
                email: normalized,
                stored: stored ?? true,
                mode: ensured.mode,
                provider,
                emailSent,
                emailError: emailSent ? null : emailError,
                // Shown in UI until Resend domain is verified / email works
                ...(reveal ? { otp: code } : {}),
            },
        })
    } catch (e: unknown) {
        console.error('[send-otp]', e)
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Send failed' },
            { status: 500 },
        )
    }
}
