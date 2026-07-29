import { NextResponse } from 'next/server'
import { hashOtp } from '@/lib/email/otpChallenge'
import { anonClient, sessionAfterOtpMatch } from '@/lib/email/otpAuth'

export async function POST(req: Request) {
    try {
        const { email, otp } = (await req.json()) as { email?: string; otp?: string }
        const normalized = (email || '').trim().toLowerCase()
        const code = String(otp || '').trim()

        if (!normalized || code.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Email and 6-digit code required' },
                { status: 400 },
            )
        }

        const codeHash = hashOtp(code)
        const supabase = anonClient()

        // 1) Match against otp_codes table (Resend code) — do NOT use Supabase verifyOtp
        const { data: match, error: matchErr } = await supabase.rpc('match_email_otp', {
            p_email: normalized,
            p_code_hash: codeHash,
        })

        if (matchErr) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        matchErr.message.includes('function') || matchErr.code === 'PGRST202'
                            ? 'OTP table missing. Run TRYSTV1/supabase/otp_table.sql in Supabase SQL Editor.'
                            : matchErr.message,
                },
                { status: 500 },
            )
        }

        const matched = match && (match as { ok?: boolean }).ok === true
        if (!matched) {
            return NextResponse.json(
                { success: false, message: mapMatchError(match) },
                { status: 400 },
            )
        }

        // 2) Code OK → create Supabase session (stable password / service role)
        const session = await sessionAfterOtpMatch(normalized)
        if ('error' in session && session.error) {
            return NextResponse.json({ success: false, message: session.error }, { status: 400 })
        }

        const accessToken = (session as { accessToken: string }).accessToken
        const refreshToken = (session as { refreshToken: string }).refreshToken
        const userId = (session as { userId: string }).userId

        // 3) Consume OTP only after tokens are ready
        await supabase.rpc('consume_email_otp', { p_email: normalized })

        // 4) Ensure profile row
        const userClient = anonClient(accessToken)
        await userClient.from('users').upsert({
            id: userId,
            email: normalized,
            alias: normalized.split('@')[0] || 'NewUser',
        })

        const { data: profile } = await userClient
            .from('users')
            .select('age, gender, profile_complete, alias')
            .eq('id', userId)
            .maybeSingle()

        const isNew = !profile?.profile_complete || !profile?.age || !profile?.gender

        // 5) Tokens for client setSession → next screen
        return NextResponse.json({
            success: true,
            data: {
                isNew,
                email: normalized,
                userId,
                accessToken,
                refreshToken,
                alias: profile?.alias || null,
            },
        })
    } catch (e: unknown) {
        console.error('[verify-otp]', e)
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Verify failed' },
            { status: 500 },
        )
    }
}

function mapMatchError(match: unknown): string {
    const err = (match as { error?: string } | null)?.error
    switch (err) {
        case 'expired':
            return 'Code expired. Request a new one.'
        case 'too_many_attempts':
            return 'Too many attempts. Request a new code.'
        case 'no_code':
            return 'No code found. Request a new code.'
        case 'mismatch':
            return 'Invalid code. Check your email and try again.'
        default:
            return 'Invalid or expired code.'
    }
}
