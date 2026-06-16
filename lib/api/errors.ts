import { AxiosError } from 'axios'

type ApiErrorBody = { message?: string; success?: boolean }

export function getApiErrorMessage(err: unknown, fallback = 'Please try again.'): string {
    if (err instanceof AxiosError) {
        const data = err.response?.data as ApiErrorBody | string | undefined
        if (typeof data === 'string' && data.trim()) return data
        if (data && typeof data === 'object' && data.message) return data.message
    }
    if (err instanceof Error && err.message) return err.message
    return fallback
}

/** Shorter copy for OTP failures shown in the form */
export function formatOtpSendError(message: string): string {
    if (/sendgrid|email service|verification email/i.test(message)) {
        return 'Could not send the verification email. Check the address and try again, or look in spam.'
    }
    if (/not configured|not installed/i.test(message)) {
        return 'Email verification is temporarily unavailable. Please try again later.'
    }
    return message
}
