import { ApiError } from '@/lib/supabase/mappers'

export function getApiErrorMessage(e: unknown, fallback = 'Something went wrong') {
    if (e instanceof ApiError) return e.response.data.message || fallback
    if (e && typeof e === 'object' && 'response' in e) {
        const r = (e as { response?: { data?: { message?: string } } }).response
        if (r?.data?.message) return r.data.message
    }
    if (e instanceof Error && e.message) return e.message
    return fallback
}

export function formatOtpSendError(msg: string) {
    if (/already exists|try a new email|EMAIL_EXISTS/i.test(msg)) {
        return 'Email already exists — try a new email'
    }
    if (/over_email_send_rate_limit|email rate limit|rate limit exceeded/i.test(msg)) {
        return 'Email rate limit exceeded — wait 2–3 minutes, then try once more.'
    }
    if (/Please wait ~45s/i.test(msg)) {
        return msg
    }
    if (/rate|limit|too many/i.test(msg)) {
        return 'Too many requests. Wait a minute and try again.'
    }
    if (/resend|domain|only send testing|not authorized/i.test(msg)) {
        return msg
    }
    if (/smtp|email|send|magic/i.test(msg) && !/already|exists|rate/i.test(msg)) {
        return 'Could not send email. Check Resend / email settings, then try again.'
    }
    return msg
}
