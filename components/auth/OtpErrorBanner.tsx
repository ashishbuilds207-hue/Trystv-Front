'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

function isEmailExists(message: string) {
    return /already exists|try a new email|EMAIL_EXISTS/i.test(message)
}

function isRateLimit(message: string) {
    return /rate limit|too many|wait ~45s|wait 2/i.test(message)
}

export function OtpErrorBanner({
    message,
    onDismiss,
}: {
    message: string
    onDismiss?: () => void
}) {
    if (!message) return null

    const emailExists = isEmailExists(message)
    const rateLimit = !emailExists && isRateLimit(message)

    return (
        <div
            role="alert"
            className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                emailExists || rateLimit
                    ? 'border-gold/30 bg-gold/10 text-ivory-200'
                    : 'border-crimson/30 bg-crimson/10 text-ivory-200'
            }`}
        >
            <AlertCircle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                    emailExists || rateLimit ? 'text-gold-400' : 'text-crimson-400'
                }`}
            />
            <div className="flex-1 space-y-1.5">
                <p className="font-medium text-ivory-100">
                    {emailExists
                        ? 'Email already registered'
                        : rateLimit
                          ? 'Email rate limit exceeded'
                          : 'Could not send verification code'}
                </p>
                <p className="text-ivory-400 leading-relaxed">
                    {emailExists
                        ? 'Email already exists — try a new email'
                        : rateLimit
                          ? 'Wait 2–3 minutes, then request one new code. Avoid tapping Send repeatedly.'
                          : message}
                </p>
                {emailExists && (
                    <p className="text-ivory-500 text-xs pt-0.5">
                        Already have an account?{' '}
                        <Link href="/login" className="text-crimson-300 hover:underline font-medium">
                            Log in instead
                        </Link>
                    </p>
                )}
            </div>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 text-ivory-500 hover:text-ivory-300 text-xs"
                    aria-label="Dismiss"
                >
                    ✕
                </button>
            )}
        </div>
    )
}
