'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Mail } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'
import { EmailField, isValidEmail } from '@/components/auth/EmailField'
import { GoogleSignInButton, AuthDivider } from '@/components/auth/GoogleSignInButton'
import { useGoogleAuthFlow } from '@/lib/hooks/useGoogleAuthFlow'
import { useSendOtp, useVerifyOtp } from '@/lib/hooks/useAuth'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from '@/lib/hooks/useToast'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { OtpErrorBanner } from '@/components/auth/OtpErrorBanner'
import { OtpDeliveryBanner } from '@/components/auth/OtpSentBanner'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { setAuthenticated } = useAppStore()
    const toast = useToast()
    const { googleLogin, loading: googleLoading } = useGoogleAuthFlow()
    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()

    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [sendError, setSendError] = useState('')
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')
    const [shownOtp, setShownOtp] = useState<string | null>(null)
    const [otpEmailSent, setOtpEmailSent] = useState(false)
    const [otpEmailError, setOtpEmailError] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        const err = searchParams.get('error')
        if (err) setSendError(decodeURIComponent(err))
    }, [searchParams])

    useEffect(() => {
        if (cooldown <= 0) return
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => clearTimeout(t)
    }, [cooldown])

    const normalizedEmail = email.trim().toLowerCase()
    const loading = sendOtp.isPending || verifyOtp.isPending

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValidEmail(email) || cooldown > 0) return
        setSendError('')
        try {
            sessionStorage.setItem('tryst_email', normalizedEmail)
            const res = await sendOtp.mutateAsync(normalizedEmail)
            const payload = res.data?.data as {
                otpMode?: OtpDeliveryMode
                otp?: string
                emailSent?: boolean
                emailError?: string | null
            } | undefined
            setOtpDelivery(payload?.otpMode || (payload?.otp ? 'onscreen' : 'email'))
            setShownOtp(payload?.otp || null)
            setOtpEmailSent(!!payload?.emailSent)
            setOtpEmailError(payload?.emailError || null)
            setStep('otp')
            setOtp(payload?.otp && payload.otp.length === 6 ? payload.otp.split('') : ['', '', '', '', '', ''])
            setCooldown(45)
        } catch (err) {
            const msg = formatOtpSendError(getApiErrorMessage(err, 'Could not send verification code.'))
            setSendError(msg)
            if (/rate|wait/i.test(msg)) setCooldown(45)
        }
    }

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return
        const next = [...otp]
        next[index] = value
        setOtp(next)
        if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus()
        }
    }

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.join('').length < 6) return
        try {
            const { data } = await verifyOtp.mutateAsync({ email: normalizedEmail, otp: otp.join('') })
            if (data.data.isNew) {
                sessionStorage.setItem('tryst_email', normalizedEmail)
                router.push('/register')
            } else {
                localStorage.setItem('tryst_token', 'supabase')
                setAuthenticated(true)
                const name = (data.data.user?.alias || '').trim()
                toast.success(
                    'Welcome back!',
                    name ? `Good to see you, ${name}.` : `Signed in as ${normalizedEmail}`,
                )
                router.push('/tonight')
            }
        } catch {
            /* toast from hook */
        }
    }

    return (
        <div className="min-h-screen bg-tryst-bg flex">
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-tryst-bg-2">
                <div
                    className="absolute inset-0"
                    style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(192,57,43,0.18) 0%, transparent 60%)' }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                    <TrystLogo href="/" size="hero" layout="stacked" className="mb-4" />
                    <p className="font-playfair text-xl text-gold-400 italic text-center mb-8">
                        &quot;Your Secret. Your Story.&quot;
                    </p>
                    <p className="text-ivory-500 text-center text-sm max-w-xs leading-relaxed">
                        A private 6-digit code lands in your inbox — discreet, fast, and just for you.
                    </p>
                </div>
            </div>

            <div className="flex-1 lg:max-w-lg flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative">
                <div
                    className="pointer-events-none absolute inset-0 opacity-60 lg:hidden"
                    style={{
                        background:
                            'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(192,57,43,0.16), transparent 55%)',
                    }}
                />
                <div className="lg:hidden mb-10 relative z-10">
                    <TrystLogo href="/" size="md" />
                </div>

                <div className="w-full max-w-sm relative z-10 rounded-2xl border border-tryst-border/70 bg-tryst-card/80 backdrop-blur-md p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)] lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:shadow-none">
                    {step === 'email' ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Welcome back.</h2>
                                <p className="text-ivory-500 text-sm">
                                    Sign in with your email or Google. Your saved name is what others see — not your email.
                                </p>
                            </div>

                            <div className="mb-6 space-y-3">
                                <GoogleSignInButton onClick={googleLogin} loading={googleLoading} />
                                <AuthDivider />
                            </div>

                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <EmailField value={email} onChange={setEmail} id="login-email" />
                                {sendError && (
                                    <OtpErrorBanner message={sendError} onDismiss={() => setSendError('')} />
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || !isValidEmail(email) || cooldown > 0}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="loading-spinner" />
                                    ) : cooldown > 0 ? (
                                        <>Wait {cooldown}s</>
                                    ) : (
                                        <>
                                            Send code to email
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-crimson/10 border border-crimson/25 flex items-center justify-center mb-5">
                                    <Mail className="w-6 h-6 text-crimson" />
                                </div>
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">
                                    Enter your code
                                </h2>
                                <p className="text-ivory-500 text-sm mb-4">
                                    We sent a 6-digit code to your Gmail. It expires in 10 minutes.
                                </p>
                                <OtpDeliveryBanner
                                    email={normalizedEmail}
                                    mode={otpDelivery}
                                    otp={shownOtp}
                                    emailSent={otpEmailSent}
                                    emailError={otpEmailError}
                                />
                            </div>

                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div className="flex gap-2 justify-between">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`otp-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            value={digit}
                                            onChange={(e) =>
                                                handleOtpChange(i, e.target.value.replace(/\D/g, ''))
                                            }
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-ivory-100 text-xl font-bold bg-tryst-card border border-tryst-border rounded-xl outline-none focus:border-crimson focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)] transition-all"
                                        />
                                    ))}
                                </div>

                                {sendError && (
                                    <OtpErrorBanner message={sendError} onDismiss={() => setSendError('')} />
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || otp.join('').length < 6}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="loading-spinner" />
                                    ) : (
                                        <>
                                            Enter TRYST
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email')
                                        setOtp(['', '', '', '', '', ''])
                                        setSendError('')
                                    }}
                                    className="w-full text-center text-ivory-500 text-sm hover:text-ivory-300 transition-colors"
                                >
                                    ← Change email
                                </button>

                                <button
                                    type="button"
                                    disabled={sendOtp.isPending || cooldown > 0}
                                    onClick={async () => {
                                        setSendError('')
                                        try {
                                            const res = await sendOtp.mutateAsync(normalizedEmail)
                                            const payload = res.data?.data as {
                                                otpMode?: OtpDeliveryMode
                                                otp?: string
                                                emailSent?: boolean
                                                emailError?: string | null
                                            } | undefined
                                            setOtpDelivery(payload?.otpMode || (payload?.otp ? 'onscreen' : 'email'))
                                            setShownOtp(payload?.otp || null)
                                            setOtpEmailSent(!!payload?.emailSent)
                                            setOtpEmailError(payload?.emailError || null)
                                            setOtp(
                                                payload?.otp && payload.otp.length === 6
                                                    ? payload.otp.split('')
                                                    : ['', '', '', '', '', ''],
                                            )
                                            setCooldown(45)
                                        } catch (err) {
                                            const msg = formatOtpSendError(
                                                getApiErrorMessage(err, 'Could not resend.'),
                                            )
                                            setSendError(msg)
                                            if (/rate|wait/i.test(msg)) setCooldown(45)
                                        }
                                    }}
                                    className="w-full text-center text-crimson-400 text-sm hover:text-crimson-300 transition-colors disabled:opacity-50"
                                >
                                    {sendOtp.isPending
                                        ? 'Sending…'
                                        : cooldown > 0
                                          ? `Resend in ${cooldown}s`
                                          : 'Resend code'}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-8 pt-6 border-t border-tryst-border text-center">
                        <p className="text-ivory-500 text-sm">
                            New to TRYST?{' '}
                            <Link href="/register" className="text-crimson-400 hover:text-crimson-300 transition-colors">
                                Begin your story
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-tryst-bg flex items-center justify-center text-ivory-500 text-sm">
                    Loading…
                </div>
            }
        >
            <LoginContent />
        </Suspense>
    )
}
