import sgMail from '@sendgrid/mail'
import { Resend } from 'resend'

export type SendMailInput = {
    to: string
    subject: string
    html: string
    text: string
}

/**
 * EMAIL_PROVIDER=sendgrid|resend forces one provider.
 * Default: SendGrid if SENDGRID_API_KEY is set, else Resend.
 * Resend fallback only when EMAIL_FALLBACK_RESEND=true.
 */
export function getMailFrom(provider?: 'sendgrid' | 'resend') {
    if (provider === 'resend') {
        return (
            process.env.RESEND_FROM_EMAIL ||
            process.env.EMAIL_FROM ||
            'TRYST <onboarding@resend.dev>'
        )
    }
    return (
        process.env.EMAIL_FROM ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.RESEND_FROM_EMAIL ||
        'TRYST <noreply@example.com>'
    )
}

export function getMailProvider(): 'sendgrid' | 'resend' | null {
    const forced = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
    if (forced === 'sendgrid' && process.env.SENDGRID_API_KEY?.trim()) return 'sendgrid'
    if (forced === 'resend' && process.env.RESEND_API_KEY?.trim()) return 'resend'
    if (process.env.SENDGRID_API_KEY?.trim()) return 'sendgrid'
    if (process.env.RESEND_API_KEY?.trim()) return 'resend'
    return null
}

async function sendViaSendGrid(input: SendMailInput): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
        await sgMail.send({
            to: input.to,
            from: getMailFrom('sendgrid'),
            subject: input.subject,
            text: input.text,
            html: input.html,
        })
        return { ok: true }
    } catch (e: unknown) {
        const err = e as {
            message?: string
            response?: { body?: { errors?: Array<{ message?: string }> } }
        }
        const detail =
            err.response?.body?.errors?.[0]?.message ||
            err.message ||
            'SendGrid could not send email'
        console.error('[sendgrid]', err.response?.body || e)
        return { ok: false, message: detail }
    }
}

async function sendViaResend(input: SendMailInput): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!process.env.RESEND_API_KEY?.trim()) {
        return { ok: false, message: 'RESEND_API_KEY missing' }
    }
    try {
        const resend = new Resend(process.env.RESEND_API_KEY!)
        const { error } = await resend.emails.send({
            from: getMailFrom('resend'),
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text,
        })
        if (error) {
            return { ok: false, message: error.message || 'Could not send email' }
        }
        return { ok: true }
    } catch (e: unknown) {
        return { ok: false, message: e instanceof Error ? e.message : 'Could not send email' }
    }
}

/** Send OTP — SendGrid only unless EMAIL_FALLBACK_RESEND=true. */
export async function sendOtpMail(
    input: SendMailInput,
): Promise<{ ok: true; provider: 'sendgrid' | 'resend' } | { ok: false; message: string }> {
    const primary = getMailProvider()
    if (!primary) {
        return {
            ok: false,
            message: 'No email provider configured. Set SENDGRID_API_KEY (or RESEND_API_KEY) in .env.local',
        }
    }

    if (primary === 'sendgrid') {
        const sg = await sendViaSendGrid(input)
        if (sg.ok) return { ok: true, provider: 'sendgrid' }

        const allowFallback =
            process.env.EMAIL_FALLBACK_RESEND === 'true' && !!process.env.RESEND_API_KEY?.trim()

        if (allowFallback) {
            console.warn('[mail] SendGrid failed, falling back to Resend:', sg.message)
            const rs = await sendViaResend(input)
            if (rs.ok) return { ok: true, provider: 'resend' }
            return {
                ok: false,
                message: `SendGrid: ${sg.message}. Resend: ${rs.message}`,
            }
        }

        if (/credit|maximum/i.test(sg.message)) {
            return {
                ok: false,
                message:
                    'SendGrid maximum credits exceeded — upgrade SendGrid plan. (Resend fallback is off; set EMAIL_FALLBACK_RESEND=true to enable.)',
            }
        }
        return { ok: false, message: `SendGrid: ${sg.message}` }
    }

    const rs = await sendViaResend(input)
    if (rs.ok) return { ok: true, provider: 'resend' }
    return { ok: false, message: rs.message }
}
