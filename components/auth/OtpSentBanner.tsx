import { Mail, Terminal, Inbox, Eye } from 'lucide-react'

export type OtpDeliveryMode = 'email' | 'console' | 'onscreen'

export function maskEmail(email: string): string {
    const normalized = email.trim().toLowerCase()
    const [local, domain] = normalized.split('@')
    if (!local || !domain) return email
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2)
    return `${visible}•••@${domain}`
}

function OtpOnScreenBanner({
    email,
    otp,
    emailSent,
    emailError,
}: {
    email: string
    otp?: string | null
    emailSent?: boolean
    emailError?: string | null
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-sm">
            <div className="relative flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/30">
                    <Eye className="h-4 w-4 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ivory-100">Your verification code</p>
                        <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold-300">
                            {emailSent ? 'Email + on screen' : 'On screen (for now)'}
                        </span>
                    </div>
                    {otp && (
                        <p className="font-mono text-2xl tracking-[0.35em] text-ivory-50 font-semibold pl-1">
                            {otp}
                        </p>
                    )}
                    <p className="text-ivory-500 leading-relaxed text-xs">
                        {emailSent
                            ? `Also sent to ${maskEmail(email)}. Enter the code above to continue.`
                            : `Enter this code to continue. Email to ${maskEmail(email)} will work after you verify a domain on Resend.`}
                    </p>
                    {emailError && !emailSent && (
                        <p className="text-[11px] text-ivory-600 leading-relaxed">
                            Email note: {emailError}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

function OtpEmailBanner({ email }: { email: string }) {
    const isGmail = email.toLowerCase().includes('@gmail.com')
    return (
        <div className="relative overflow-hidden rounded-xl border border-crimson/20 bg-gradient-to-br from-crimson/10 via-tryst-card to-tryst-card px-4 py-4 text-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-crimson/10 blur-2xl" />
            <div className="relative flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson/20 ring-1 ring-crimson/30">
                    <Mail className="h-4 w-4 text-crimson-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-ivory-100">Verification code sent</p>
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
                            Email on
                        </span>
                    </div>
                    <p className="text-ivory-500 leading-relaxed">
                        We sent a 6-digit code to{' '}
                        <span className="font-medium text-ivory-300">{maskEmail(email)}</span>.
                    </p>
                    <div className="flex items-start gap-2 rounded-lg bg-tryst-bg/60 px-3 py-2 text-xs text-ivory-500">
                        <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ivory-600" />
                        <span>
                            {isGmail
                                ? 'Open Gmail → Inbox/Spam for subject like “123456 is your TRYST code”.'
                                : 'Check inbox and spam. Delivery usually takes under a minute.'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function OtpConsoleBanner() {
    return (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-1 text-ivory-300">
                <p className="font-medium text-amber-200/90">Dev mode — check terminal</p>
                <p className="text-ivory-500 leading-relaxed">
                    Code is shown in the app / terminal until email delivery is fully set up.
                </p>
            </div>
        </div>
    )
}

export function OtpDeliveryBanner({
    email,
    mode,
    otp,
    emailSent,
    emailError,
}: {
    email: string
    mode: OtpDeliveryMode
    otp?: string | null
    emailSent?: boolean
    emailError?: string | null
}) {
    if (otp || mode === 'onscreen') {
        return (
            <OtpOnScreenBanner
                email={email}
                otp={otp}
                emailSent={emailSent}
                emailError={emailError}
            />
        )
    }
    if (mode === 'console') return <OtpConsoleBanner />
    return <OtpEmailBanner email={email} />
}
