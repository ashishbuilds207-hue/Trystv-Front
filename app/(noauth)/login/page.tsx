'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, ArrowRight } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'
import { useGoogleLogin as useGoogleOAuth } from '@react-oauth/google'
import { useAppStore } from '@/lib/store/useAppStore'
import { useSendOtp, useVerifyOtp } from '@/lib/hooks/useAuth'
import { useToast } from '@/lib/hooks/useToast'
import api from '@/lib/api/client'

export default function LoginPage() {
    const router = useRouter()
    const { setAuthenticated } = useAppStore()
    const toast = useToast()

    const [step, setStep] = useState<'phone' | 'otp'>('phone')
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [googleLoading, setGoogleLoading] = useState(false)
    const [devOtp, setDevOtp] = useState<string | null>(null)

    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()

    // Google OAuth flow — gets access token, then exchanges for user info
    const googleLogin = useGoogleOAuth({
        onSuccess: async (tokenResponse) => {
            setGoogleLoading(true)
            try {
                // Get Google user info with the access token
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                })
                const userInfo = await userInfoRes.json()

                // Send to our backend as an ID-token equivalent (we use email + sub)
                const { data } = await api.post('/auth/google-access', {
                    accessToken: tokenResponse.access_token,
                    googleId: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name,
                    avatar: userInfo.picture,
                })

                if (data.data.isNew) {
                    sessionStorage.setItem('tryst_google_data', JSON.stringify({
                        googleId: userInfo.sub,
                        email: userInfo.email,
                        name: userInfo.name,
                        avatar: userInfo.picture,
                    }))
                    router.push('/register?source=google')
                } else {
                    localStorage.setItem('tryst_token', data.data.accessToken)
                    localStorage.setItem('tryst_refresh', data.data.refreshToken)
                    setAuthenticated(true)
                    toast.success('Welcome back!', `Good to see you, ${data.data.user.alias}.`)
                    router.push('/tonight')
                }
            } catch {
                toast.error('Google login failed', 'Please try again.')
            } finally {
                setGoogleLoading(false)
            }
        },
        onError: () => {
            toast.error('Google login cancelled', 'Please try again.')
            setGoogleLoading(false)
        },
        scope: 'openid email profile',
    })

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (phone.length < 10) return
        const { data } = await sendOtp.mutateAsync(`+91${phone}`)
        if (data?.data?.devOtp) setDevOtp(data.data.devOtp)
        setStep('otp')
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
        const { data } = await verifyOtp.mutateAsync({ phone: `+91${phone}`, otp: otp.join('') })
        if (data.data.isNew) {
            sessionStorage.setItem('tryst_phone', `+91${phone}`)
            router.push('/register')
        } else {
            localStorage.setItem('tryst_token', data.data.accessToken)
            localStorage.setItem('tryst_refresh', data.data.refreshToken)
            setAuthenticated(true)
            toast.success('Welcome back!', `Good to see you, ${data.data.user.alias}.`)
            router.push('/tonight')
        }
    }

    const loading = sendOtp.isPending || verifyOtp.isPending

    return (
        <div className="min-h-screen bg-tryst-bg flex">
            {/* Left panel */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-tryst-bg-2">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(192,57,43,0.15) 0%, transparent 60%)' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                    <TrystLogo href="/" size="hero" layout="stacked" className="mb-4" />
                    <p className="font-playfair text-xl text-gold-400 italic text-center mb-8">"Your Secret. Your Story."</p>
                    <p className="text-ivory-500 text-center text-sm max-w-xs leading-relaxed">
                        A space for adults who believe desire is complex, private, and entirely their own.
                    </p>
                    <div className="mt-12 flex gap-4">
                        {['https://randomuser.me/api/portraits/women/44.jpg', 'https://randomuser.me/api/portraits/women/33.jpg', 'https://randomuser.me/api/portraits/men/32.jpg', 'https://randomuser.me/api/portraits/women/55.jpg'].map((src, i) => (
                            <div key={i} className="w-14 h-14 rounded-full overflow-hidden border-2 border-tryst-border" style={{ animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite` }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt="" className="w-full h-full object-cover blur-sm" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-ivory-500 text-xs">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        <span>50,000+ members waiting to connect</span>
                    </div>
                </div>
            </div>

            {/* Right — Form */}
            <div className="flex-1 lg:max-w-lg flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="lg:hidden mb-10">
                    <TrystLogo href="/" size="md" />
                </div>

                <div className="w-full max-w-sm">
                    {step === 'phone' ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Welcome back.</h2>
                                <p className="text-ivory-500 text-sm">Enter your phone number to continue your story.</p>
                            </div>

                            {/* Google Login */}
                            <div className="mb-6 space-y-3">
                                <button
                                    onClick={() => googleLogin()}
                                    disabled={googleLoading}
                                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-tryst-border rounded-xl text-ivory-300 hover:bg-tryst-card hover:border-tryst-border-2 transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                    type="button"
                                >
                                    {googleLoading ? (
                                        <div className="loading-spinner" />
                                    ) : (
                                        <>
                                            {/* Google icon */}
                                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                            </svg>
                                            Continue with Google
                                        </>
                                    )}
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-tryst-border" />
                                    <span className="text-ivory-600 text-xs">or use phone</span>
                                    <div className="flex-1 h-px bg-tryst-border" />
                                </div>
                            </div>

                            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                <div>
                                    <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">
                                        Phone Number
                                    </label>
                                    <div className="flex gap-2">
                                        {/* Country code block */}
                                        <div className="flex items-center gap-2 px-3 bg-tryst-card border border-tryst-border rounded-xl min-w-[72px] justify-center">
                                            <span className="text-base leading-none">🇮🇳</span>
                                            <span className="text-ivory-300 text-sm font-medium">+91</span>
                                        </div>
                                        {/* Number input */}
                                        <div className="relative flex-1">
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                                placeholder="98765 43210"
                                                className="tryst-input pr-10 tracking-widest"
                                                maxLength={10}
                                                required
                                            />
                                            {phone.length === 10 && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-ivory-600 text-xs mt-2 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Your number is encrypted and never shared
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || phone.length < 10}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <div className="loading-spinner" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Verify it's you.</h2>
                                <p className="text-ivory-500 text-sm">
                                    Enter the 6-digit code sent to +91 {phone}
                                </p>
                                {devOtp ? (
                                    <div className="mt-3 bg-gold/10 border border-gold/30 rounded-lg px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-gold-400 text-xs font-medium tracking-wider uppercase mb-1">Dev Mode — Your OTP</p>
                                            <p className="text-ivory-100 text-2xl font-bold tracking-[0.3em] font-playfair">{devOtp}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const digits = devOtp.split('')
                                                setOtp(digits)
                                                digits.forEach((d, i) => {
                                                    const el = document.getElementById(`otp-${i}`) as HTMLInputElement
                                                    if (el) el.value = d
                                                })
                                            }}
                                            className="text-xs text-gold-400 hover:text-gold-300 border border-gold/30 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            Auto-fill
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-3 bg-crimson/10 border border-crimson/20 rounded-lg px-3 py-2 text-crimson-300 text-xs">
                                        Check your phone for the OTP.
                                    </div>
                                )}
                            </div>
                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div className="flex gap-2 justify-between">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
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
                                    type="button" onClick={() => { setStep('phone'); setOtp(['','','','','','']) }}
                                    className="w-full text-center text-ivory-500 text-sm hover:text-ivory-300 transition-colors"
                                >
                                    ← Change number
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
