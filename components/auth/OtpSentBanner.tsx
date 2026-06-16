import { Mail, Terminal, Inbox } from 'lucide-react'

export type OtpDeliveryMode = 'email' | 'console'

export function maskEmail(email: string): string {
    const normalized = email.trim().toLowerCase()
    const [local, domain] = normalized.split('@')
    if (!local || !domain) return email
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2)
    return `${visible}•••@${domain}`
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
                                ? 'Open Gmail → check Inbox and Spam for “Your TRYST verification code”.'
                                : 'Check your inbox and spam folder. Delivery usually takes under a minute.'}
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
                    Set <code className="text-xs text-amber-300/90">OTP_LOG_ONLY=false</code> in BACKTRY{' '}
                    <code className="text-xs text-amber-300/90">.env</code> for real email. Code is in the terminal.
                </p>
            </div>
        </div>
    )
}

export function OtpDeliveryBanner({ email, mode }: { email: string; mode: OtpDeliveryMode }) {
    if (mode === 'console') return <OtpConsoleBanner />
    return <OtpEmailBanner email={email} />
}
