import { NextResponse } from 'next/server'
import { hashOtp } from '@/lib/email/otpChallenge'
import { anonClient, sessionAfterOtpMatch, ensureAuthUserForOtp } from '@/lib/email/otpAuth'
import { consumeOtpMemory, matchOtpMemory } from '@/lib/email/otpMemory'
import {
    normalizeEmail,
    normalizePhone,
    phoneAuthEmail,
} from '@/lib/auth/contact'

function mapMatchError(match: unknown): string {
    const err = (match as { error?: string })?.error
    if (err === 'EXPIRED') return 'Code expired — request a new one'
    if (err === 'TOO_MANY_ATTEMPTS') return 'Too many attempts — request a new code'
    if (err === 'MISMATCH') return 'Incorrect code'
    return 'Invalid or expired code'
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            email?: string
            phone?: string
            otp?: string
        }
        const email = normalizeEmail(body.email)
        const phone = normalizePhone(body.phone)
        const code = String(body.otp || '').trim()

        if ((!email && !phone) || code.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Email or phone and 6-digit code required' },
                { status: 400 },
            )
        }

        const codeHash = hashOtp(code)
        const supabase = anonClient()

        const tryIds = [
            email ? { id: email, channel: 'email' as const } : null,
            phone ? { id: phone.toLowerCase(), channel: 'phone' as const } : null,
        ].filter(Boolean) as { id: string; channel: 'email' | 'phone' }[]

        let matchedId: string | null = null
        let lastMatch: unknown = null
        let matchedViaMemory = false

        for (const item of tryIds) {
            let match: unknown = null
            let matchErr: { message?: string; code?: string } | null = null

            const rpc = await supabase.rpc('match_otp', {
                p_identifier: item.id,
                p_code_hash: codeHash,
            })
            match = rpc.data
            matchErr = rpc.error

            if (matchErr && item.channel === 'email') {
                const legacy = await supabase.rpc('match_email_otp', {
                    p_email: item.id,
                    p_code_hash: codeHash,
                })
                match = legacy.data
                matchErr = legacy.error
            }

            if (matchErr) {
                // Fall back to on-screen / memory OTP when SQL RPCs are missing
                const mem = matchOtpMemory(item.id, codeHash)
                lastMatch = mem.ok ? { ok: true } : { error: mem.error }
                if (mem.ok) {
                    matchedId = item.id
                    matchedViaMemory = true
                    break
                }
                continue
            }

            lastMatch = match
            if (match && (match as { ok?: boolean }).ok === true) {
                matchedId = item.id
                break
            }

            // RPC returned mismatch — also try memory (code was shown on screen)
            const mem = matchOtpMemory(item.id, codeHash)
            if (mem.ok) {
                matchedId = item.id
                matchedViaMemory = true
                lastMatch = { ok: true }
                break
            }
        }

        if (!matchedId) {
            return NextResponse.json(
                { success: false, message: mapMatchError(lastMatch) },
                { status: 400 },
            )
        }

        const authEmail = email || phoneAuthEmail(phone!)
        // Ensure auth user exists (needed when send used memory fallback)
        await ensureAuthUserForOtp(authEmail)

        const session = await sessionAfterOtpMatch(authEmail)
        if ('error' in session && session.error) {
            return NextResponse.json({ success: false, message: session.error }, { status: 400 })
        }

        const accessToken = (session as { accessToken: string }).accessToken
        const refreshToken = (session as { refreshToken: string }).refreshToken
        const userId = (session as { userId: string }).userId

        for (const item of tryIds) {
            consumeOtpMemory(item.id)
            if (!matchedViaMemory) {
                try {
                    await supabase.rpc('consume_otp', { p_identifier: item.id })
                } catch { /* ignore */ }
                if (item.channel === 'email') {
                    try {
                        await supabase.rpc('consume_email_otp', { p_email: item.id })
                    } catch { /* ignore */ }
                }
            }
        }

        const userClient = anonClient(accessToken)
        const patch: Record<string, unknown> = {}
        if (email) patch.email = email
        if (phone) patch.phone = phone

        const { data: existing } = await userClient
            .from('users')
            .select('id, alias, profile_complete, age, gender')
            .eq('id', userId)
            .maybeSingle()

        if (!existing) {
            await userClient.from('users').insert({
                id: userId,
                email: email || null,
                phone: phone || null,
                alias: '',
                is_ghost_mode: false,
            })
        } else if (Object.keys(patch).length) {
            await userClient.from('users').update(patch).eq('id', userId)
        }

        const { data: profile } = await userClient
            .from('users')
            .select('id, alias, profile_complete, age, gender')
            .eq('id', userId)
            .maybeSingle()

        const isNew =
            !profile?.profile_complete ||
            !profile.alias ||
            profile.alias === 'NewUser' ||
            profile.alias === ''

        return NextResponse.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                userId,
                isNew,
                email,
                phone,
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
