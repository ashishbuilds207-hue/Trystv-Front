import { NextResponse } from 'next/server'
import { buildOtpEmailHtml, buildOtpEmailText } from '@/lib/email/otpTemplate'
import { generateOtp, hashOtp } from '@/lib/email/otpChallenge'
import { anonClient } from '@/lib/email/otpAuth'
import { getMailProvider, sendOtpMail } from '@/lib/email/sendMail'
import { sendOtpSms } from '@/lib/email/sendSms'
import { storeOtpMemory, matchOtpMemory, consumeOtpMemory } from '@/lib/email/otpMemory'
import {
    normalizeEmail,
    normalizePhone,
} from '@/lib/auth/contact'

const rateMap = new Map<string, number>()

function bearer(req: Request) {
    const h = req.headers.get('authorization') || ''
    const m = /^Bearer\s+(.+)$/i.exec(h)
    return m?.[1] || null
}

async function contactTakenByOther(
    client: ReturnType<typeof anonClient>,
    email: string | null,
    phone: string | null,
    myId: string,
): Promise<string | null> {
    if (email) {
        const { data } = await client.from('users').select('id').eq('email', email).maybeSingle()
        if (data?.id && data.id !== myId) return 'That email is already on another account'
    }
    if (phone) {
        const { data } = await client.from('users').select('id').eq('phone', phone).maybeSingle()
        if (data?.id && data.id !== myId) return 'That phone is already on another account'
    }
    return null
}

export async function POST(req: Request) {
    try {
        const token = bearer(req)
        if (!token) {
            return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
        }

        const userClient = anonClient(token)
        const { data: authData, error: authErr } = await userClient.auth.getUser()
        if (authErr || !authData.user) {
            return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
        }
        const myId = authData.user.id

        const body = (await req.json()) as {
            action?: 'send' | 'verify'
            email?: string
            phone?: string
            otp?: string
        }
        const action = body.action === 'verify' ? 'verify' : 'send'
        const email = normalizeEmail(body.email)
        const phone = normalizePhone(body.phone)

        if (!email && !phone) {
            return NextResponse.json(
                { success: false, message: 'Enter a new email and/or phone' },
                { status: 400 },
            )
        }
        if (body.email && !email) {
            return NextResponse.json({ success: false, message: 'Valid email required' }, { status: 400 })
        }
        if (body.phone && !phone) {
            return NextResponse.json({ success: false, message: 'Valid phone required' }, { status: 400 })
        }

        const taken = await contactTakenByOther(userClient, email, phone, myId)
        if (taken) {
            return NextResponse.json({ success: false, message: taken, code: 'CONTACT_EXISTS' }, { status: 409 })
        }

        if (action === 'send') {
            const rateKey = `chg:${myId}:${email || phone}`
            const last = rateMap.get(rateKey) || 0
            if (Date.now() - last < 45_000) {
                return NextResponse.json(
                    { success: false, message: 'Please wait ~45s before requesting another code.' },
                    { status: 429 },
                )
            }

            const code = generateOtp()
            const codeHash = hashOtp(code)
            const supabase = anonClient()

            const identifiers: { id: string; channel: 'email' | 'phone' }[] = []
            if (email) identifiers.push({ id: email, channel: 'email' })
            if (phone) identifiers.push({ id: phone.toLowerCase(), channel: 'phone' })

            for (const item of identifiers) {
                const { error: storeErr } = await supabase.rpc('store_otp', {
                    p_identifier: item.id,
                    p_code_hash: codeHash,
                    p_channel: item.channel,
                    p_ttl_minutes: 10,
                })
                // Always keep memory copy so on-screen OTP works without SQL setup
                storeOtpMemory(item.id, code)
                if (storeErr) {
                    console.warn('[change-contact] store_otp missing, using on-screen OTP')
                }
            }

            let emailSent = false
            let smsSent = false
            let emailError: string | null = null
            let smsError: string | null = null

            if (email && getMailProvider()) {
                const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
                const mailed = await sendOtpMail({
                    to: email,
                    subject: `${code} is your TRYST code`,
                    html: buildOtpEmailHtml({ code, email, appUrl }),
                    text: buildOtpEmailText(code),
                })
                if (mailed.ok) emailSent = true
                else emailError = mailed.message
            }

            if (phone) {
                const sms = await sendOtpSms(phone, code)
                if (sms.ok) smsSent = true
                else smsError = sms.message || 'SMS not sent'
            }

            rateMap.set(rateKey, Date.now())
            const delivered = emailSent || smsSent

            return NextResponse.json({
                success: true,
                message: delivered
                    ? 'Verification code sent — also shown on screen'
                    : 'Use the code shown on screen to continue',
                data: {
                    otpMode: 'onscreen' as const,
                    email,
                    phone,
                    emailSent,
                    smsSent,
                    emailError: emailSent ? null : emailError,
                    smsError: smsSent ? null : smsError,
                    otp: code,
                },
            })
        }

        // verify
        const code = String(body.otp || '').trim()
        if (code.length < 6) {
            return NextResponse.json({ success: false, message: '6-digit code required' }, { status: 400 })
        }

        const codeHash = hashOtp(code)
        const supabase = anonClient()
        const tryIds = [
            email ? email : null,
            phone ? phone.toLowerCase() : null,
        ].filter(Boolean) as string[]

        let matched = false
        let lastMatch: unknown = null
        for (const id of tryIds) {
            const { data: match, error } = await supabase.rpc('match_otp', {
                p_identifier: id,
                p_code_hash: codeHash,
            })
            if (error) {
                const mem = matchOtpMemory(id, codeHash)
                lastMatch = mem.ok ? { ok: true } : { error: mem.error }
                if (mem.ok) {
                    matched = true
                    break
                }
                continue
            }
            lastMatch = match
            if (match && (match as { ok?: boolean }).ok === true) {
                matched = true
                break
            }
            const mem = matchOtpMemory(id, codeHash)
            if (mem.ok) {
                matched = true
                lastMatch = { ok: true }
                break
            }
        }

        if (!matched) {
            const err = (lastMatch as { error?: string })?.error
            const msg =
                err === 'EXPIRED'
                    ? 'Code expired — request a new one'
                    : err === 'TOO_MANY_ATTEMPTS'
                      ? 'Too many attempts — request a new code'
                      : err === 'MISMATCH'
                        ? 'Incorrect code'
                        : 'Invalid or expired code'
            return NextResponse.json({ success: false, message: msg }, { status: 400 })
        }

        for (const id of tryIds) {
            consumeOtpMemory(id)
            try {
                await supabase.rpc('consume_otp', { p_identifier: id })
            } catch { /* ignore */ }
        }

        const patch: Record<string, unknown> = {}
        if (email) patch.email = email
        if (phone) patch.phone = phone

        const { data: updated, error: updErr } = await userClient
            .from('users')
            .update(patch)
            .eq('id', myId)
            .select('email, phone')
            .single()

        if (updErr) {
            return NextResponse.json({ success: false, message: updErr.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Contact updated',
            data: {
                email: (updated?.email as string) || email,
                phone: (updated?.phone as string) || phone,
            },
        })
    } catch (e: unknown) {
        console.error('[change-contact]', e)
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Update failed' },
            { status: 500 },
        )
    }
}
