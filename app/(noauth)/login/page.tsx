'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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

export default function LoginPage() {
    const router = useRouter()
    const { setAuthenticated } = useAppStore()
    const toast = useToast()
    const { googleLogin, loading: googleLoading } = useGoogleAuthFlow()

    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [otpSendError, setOtpSendError] = useState('')
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')

    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()

    const normalizedEmail = email.trim().toLowerCase()

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValidEmail(email)) return
        setOtpSendError('')
        try {
            const res = await sendOtp.mutateAsync(normalizedEmail)
            setOtpDelivery((res.data?.data?.otpMode as OtpDeliveryMode) || 'email')
            setStep('otp')
        } catch (err) {
            setOtpSendError(formatOtpSendError(getApiErrorMessage(err, 'Could not send OTP. Please try again.')))
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
        if (e.key === 'Backspace' && !otp[index] && index > 0)
            document.getElementById(`otp-${index - 1}`)?.focus()
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
                localStorage.setItem('tryst_token', data.data.accessToken)
                localStorage.setItem('tryst_refresh', data.data.refreshToken)
                setAuthenticated(true)
                toast.success('Welcome back!', `Good to see you, ${data.data.user.alias}.`)
                router.push('/tonight')
            }
        } catch {
            // Error toast shown by useVerifyOtp
        }
    }

    const loading = sendOtp.isPending || verifyOtp.isPending

    return (
        <div className="min-h-screen bg-tryst-bg flex">
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-tryst-bg-2">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(192,57,43,0.15) 0%, transparent 60%)' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                    <TrystLogo href="/" size="hero" layout="stacked" className="mb-4" />
                    <p className="font-playfair text-xl text-gold-400 italic text-center mb-8">&quot;Your Secret. Your Story.&quot;</p>
                    <p className="text-ivory-500 text-center text-sm max-w-xs leading-relaxed">
                        A space for adults who believe desire is complex, private, and entirely their own.
                    </p>
                </div>
            </div>

            <div className="flex-1 lg:max-w-lg flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="lg:hidden mb-10">
                    <TrystLogo href="/" size="md" />
                </div>

                <div className="w-full max-w-sm">
                    {step === 'email' ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Welcome back.</h2>
                                <p className="text-ivory-500 text-sm">Sign in with Google or your email.</p>
                            </div>

                            <div className="mb-6 space-y-3">
                                <GoogleSignInButton onClick={googleLogin} loading={googleLoading} />
                                <AuthDivider />
                            </div>

                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <EmailField value={email} onChange={setEmail} id="login-email" />
                                {otpSendError && (
                                    <OtpErrorBanner message={otpSendError} onDismiss={() => setOtpSendError('')} />
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || !isValidEmail(email)}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <div className="loading-spinner" /> : <>Send code to email <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Verify it&apos;s you.</h2>
                                <p className="text-ivory-500 text-sm">
                                    Enter the 6-digit code we sent to your email.
                                </p>
                                <div className="mt-4">
                                    <OtpDeliveryBanner email={normalizedEmail} mode={otpDelivery} />
                                </div>
                            </div>
                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div className="flex gap-2 justify-between">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-ivory-100 text-xl font-bold bg-tryst-card border border-tryst-border rounded-xl outline-none focus:border-crimson focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)] transition-all"
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || otp.join('').length < 6}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <div className="loading-spinner" /> : <>Enter TRYST <ArrowRight className="w-4 h-4" /></>}
                                </button>
                                <button
                                    type="button" onClick={() => { setStep('email'); setOtp(['','','','','','']); setOtpSendError('') }}
                                    className="w-full text-center text-ivory-500 text-sm hover:text-ivory-300 transition-colors"
                                >
                                    ← Change email
                                </button>
                                {otpSendError && (
                                    <OtpErrorBanner message={otpSendError} onDismiss={() => setOtpSendError('')} />
                                )}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setOtpSendError('')
                                        try {
                                            const res = await sendOtp.mutateAsync(normalizedEmail)
                                            setOtpDelivery((res.data?.data?.otpMode as OtpDeliveryMode) || 'email')
                                            setOtp(['', '', '', '', '', ''])
                                        } catch (err) {
                                            setOtpSendError(formatOtpSendError(getApiErrorMessage(err, 'Could not resend OTP. Please try again.')))
                                        }
                                    }}
                                    disabled={sendOtp.isPending}
                                    className="w-full text-center text-crimson-400 text-sm hover:text-crimson-300 transition-colors disabled:opacity-50"
                                >
                                    {sendOtp.isPending ? 'Sending…' : 'Resend OTP'}
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
