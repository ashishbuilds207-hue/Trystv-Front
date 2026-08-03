import { NextResponse } from 'next/server'
import { buildOtpEmailHtml, buildOtpEmailText } from '@/lib/email/otpTemplate'
import { generateOtp, hashOtp } from '@/lib/email/otpChallenge'
import { adminClient, anonClient, ensureAuthUserForOtp } from '@/lib/email/otpAuth'
import { getMailProvider, sendOtpMail } from '@/lib/email/sendMail'
import { sendOtpSms } from '@/lib/email/sendSms'
import { storeOtpMemory } from '@/lib/email/otpMemory'
import {
    normalizeEmail,
    normalizePhone,
    phoneAuthEmail,
} from '@/lib/auth/contact'

const rateMap = new Map<string, number>()

async function contactAlreadyRegistered(email: string | null, phone: string | null): Promise<boolean> {
    const admin = adminClient()
    const client = admin || anonClient()

    if (email) {
        const { data: byEmail } = await client
            .from('users')
            .select('id, profile_complete, alias')
            .eq('email', email)
            .maybeSingle()
        if (byEmail?.profile_complete) return true
        if (byEmail?.alias && byEmail.alias !== 'NewUser' && byEmail.alias !== '') return true
    }
    if (phone) {
        const { data: byPhone } = await client
            .from('users')
            .select('id, profile_complete, alias')
            .eq('phone', phone)
            .maybeSingle()
        if (byPhone?.profile_complete) return true
        if (byPhone?.alias && byPhone.alias !== 'NewUser' && byPhone.alias !== '') return true
    }
    return false
}

async function persistOtp(
    supabase: ReturnType<typeof anonClient>,
    identifiers: { id: string; channel: 'email' | 'phone' }[],
    code: string,
    codeHash: string,
): Promise<{ dbOk: boolean; usedMemory: boolean }> {
    let dbOk = true
    for (const item of identifiers) {
        const { error: storeErr } = await supabase.rpc('store_otp', {
            p_identifier: item.id,
            p_code_hash: codeHash,
            p_channel: item.channel,
            p_ttl_minutes: 10,
        })
        if (!storeErr) continue

        if (item.channel === 'email') {
            const { error: legacyErr } = await supabase.rpc('store_email_otp', {
                p_email: item.id,
                p_code_hash: codeHash,
                p_ttl_minutes: 10,
            })
            if (!legacyErr) continue
        }
        dbOk = false
    }

    // Always keep a memory copy so on-screen OTP works even if SQL isn't run yet
    for (const item of identifiers) {
        storeOtpMemory(item.id, code)
    }

    return { dbOk, usedMemory: !dbOk }
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            email?: string
            phone?: string
            purpose?: 'login' | 'register'
        }
        const email = normalizeEmail(body.email)
        const phone = normalizePhone(body.phone)
        const purpose = body.purpose === 'register' ? 'register' : 'login'

        if (!email && !phone) {
            return NextResponse.json(
                { success: false, message: 'Enter email and/or phone number' },
                { status: 400 },
            )
        }
        if (body.email && !email) {
            return NextResponse.json({ success: false, message: 'Valid email required' }, { status: 400 })
        }
        if (body.phone && !phone) {
            return NextResponse.json({ success: false, message: 'Valid phone required' }, { status: 400 })
        }

        if (purpose === 'register') {
            try {
                const exists = await contactAlreadyRegistered(email, phone)
                if (exists) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: 'Account already exists — try login, or a new email / phone',
                            code: 'CONTACT_EXISTS',
                        },
                        { status: 409 },
                    )
                }
            } catch {
                /* users table may be incomplete — allow continue */
            }
        }

        const rateKey = email || phone!
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
        const authEmail = email || phoneAuthEmail(phone!)

        const identifiers: { id: string; channel: 'email' | 'phone' }[] = []
        if (email) identifiers.push({ id: email, channel: 'email' })
        if (phone) identifiers.push({ id: phone.toLowerCase(), channel: 'phone' })

        await persistOtp(supabase, identifiers, code, codeHash)

        const ensured = await ensureAuthUserForOtp(authEmail)
        if (!ensured.ok) {
            const isRate = /rate limit|over_email/i.test(ensured.message || '')
            // Still return on-screen OTP if auth user prep failed for non-rate reasons? Rate = hard fail
            if (isRate) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'email rate limit exceeded',
                        code: 'EMAIL_RATE_LIMIT',
                    },
                    { status: 429 },
                )
            }
            // For missing service role etc., still show code so local testing works when possible
            console.warn('[send-otp] ensureAuthUser:', ensured.message)
        }

        let emailSent = false
        let smsSent = false
        let emailError: string | null = null
        let smsError: string | null = null
        const provider = getMailProvider()

        if (email && provider) {
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
            const mailed = await sendOtpMail({
                to: email,
                subject: `${code} is your TRYST code`,
                html: buildOtpEmailHtml({ code, email, appUrl }),
                text: buildOtpEmailText(code),
            })
            if (mailed.ok) emailSent = true
            else emailError = mailed.message
        } else if (email && !provider) {
            emailError = 'Email provider not configured'
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
    } catch (e: unknown) {
        console.error('[send-otp]', e)
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Send failed' },
            { status: 500 },
        )
    }
}
