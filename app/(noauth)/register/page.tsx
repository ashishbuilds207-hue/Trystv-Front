'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Check, ArrowRight, User, Heart, Lock } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'
import { EmailField, isValidEmail } from '@/components/auth/EmailField'
import { GoogleSignInButton, AuthDivider } from '@/components/auth/GoogleSignInButton'
import { useGoogleAuthFlow, type GoogleUserData } from '@/lib/hooks/useGoogleAuthFlow'
import { useRegister, useSendOtp, useVerifyOtp } from '@/lib/hooks/useAuth'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { OtpErrorBanner } from '@/components/auth/OtpErrorBanner'
import { OtpDeliveryBanner } from '@/components/auth/OtpSentBanner'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'

type RelationshipStatus = 'married' | 'partnered' | 'open-relationship' | 'discreet-single'
type DesireTag = 'Emotional Connection' | 'Adventure' | 'Conversation' | 'Physical' | 'Romance' | 'Travel' | 'Passion' | 'Discretion'

const desireTags: DesireTag[] = ['Emotional Connection', 'Adventure', 'Conversation', 'Physical', 'Romance', 'Travel', 'Passion', 'Discretion']

const relationshipOptions: { value: RelationshipStatus; label: string; desc: string }[] = [
    { value: 'married', label: 'Married', desc: 'Currently married' },
    { value: 'partnered', label: 'Partnered', desc: 'In a long-term relationship' },
    { value: 'open-relationship', label: 'Open Relationship', desc: 'Non-monogamous by agreement' },
    { value: 'discreet-single', label: 'Discreet Single', desc: 'Single, values privacy' },
]

export default function RegisterPage() {
    const router = useRouter()
    const { googleLogin, loading: googleLoading } = useGoogleAuthFlow()

    const registerMutation = useRegister()
    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()
    const [step, setStep] = useState(1)
    const [otpStep, setOtpStep] = useState<'email' | 'otp'>('email')
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
    const [otpSendError, setOtpSendError] = useState('')
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')
    const [googleSignup, setGoogleSignup] = useState<GoogleUserData | null>(null)
    const autoSendDone = useRef(false)

    const [form, setForm] = useState({
        alias: '',
        age: '',
        email: '',
        gender: '' as 'female' | 'male' | '',
        relationshipStatus: '' as RelationshipStatus | '',
        desireTags: [] as DesireTag[],
        profession: '',
        city: '',
    })

    // Pre-fill email from OTP login or Google signup redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('source') === 'google') {
            const raw = sessionStorage.getItem('tryst_google_data')
            if (raw) {
                try {
                    const data = JSON.parse(raw) as GoogleUserData
                    setGoogleSignup(data)
                    setForm((p) => ({
                        ...p,
                        email: data.email,
                        alias: p.alias || data.name?.split(' ')[0] || '',
                    }))
                } catch { /* ignore */ }
            }
            return
        }
        const saved = sessionStorage.getItem('tryst_email')
        if (saved) setForm((p) => ({ ...p, email: saved }))
    }, [])

    const updateForm = (key: keyof typeof form, value: unknown) => setForm((p) => ({ ...p, [key]: value }))

    const toggleTag = (tag: DesireTag) => {
        const curr = form.desireTags
        updateForm('desireTags', curr.includes(tag) ? curr.filter(t => t !== tag) : [...curr, tag])
    }

    const canProceed = () => {
        if (step === 1) return form.alias.length >= 2 && form.age && Number(form.age) >= 18
        if (step === 2) return form.gender !== '' && form.relationshipStatus !== ''
        if (step === 3) return form.desireTags.length >= 1
        if (step === 4) return googleSignup ? true : otpStep === 'otp' && otpDigits.join('').length === 6
        return false
    }

    const registerEmail = (googleSignup?.email || form.email).trim().toLowerCase()

    const handleSendOtp = async () => {
        if (!isValidEmail(form.email)) return
        setOtpSendError('')
        try {
            const res = await sendOtp.mutateAsync(registerEmail)
            setOtpDelivery((res.data?.data?.otpMode as OtpDeliveryMode) || 'email')
            setOtpStep('otp')
            setOtpDigits(['', '', '', '', '', ''])
        } catch (err) {
            setOtpStep('email')
            setOtpSendError(formatOtpSendError(getApiErrorMessage(err, 'Could not send OTP. Please try again.')))
        }
    }

    const handleEmailChange = (value: string) => {
        updateForm('email', value)
        setOtpSendError('')
        if (otpStep === 'otp') {
            setOtpStep('email')
            setOtpDigits(['', '', '', '', '', ''])
            autoSendDone.current = false
        }
    }

    // Auto-send when arriving at step 4 with email from login redirect
    useEffect(() => {
        if (step !== 4 || otpStep !== 'email' || !isValidEmail(form.email) || autoSendDone.current) return
        const fromLogin = sessionStorage.getItem('tryst_email')
        if (!fromLogin) return
        autoSendDone.current = true
        handleSendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, form.email, otpStep])

    const handleOtpChange = (i: number, v: string) => {
        if (v.length > 1) return
        const next = [...otpDigits]; next[i] = v; setOtpDigits(next)
        if (v && i < 5) document.getElementById(`rotp-${i + 1}`)?.focus()
    }

    const handleSubmit = async () => {
        try {
            const payload = {
                email: registerEmail,
                alias: form.alias,
                age: Number(form.age),
                gender: form.gender as string,
                relationshipStatus: form.relationshipStatus as string,
                desireTags: form.desireTags,
                profession: form.profession,
                city: form.city,
                ...(googleSignup ? { googleId: googleSignup.googleId, avatarUrl: googleSignup.avatar } : {}),
            }

            if (googleSignup) {
                await registerMutation.mutateAsync(payload)
            } else {
                const { data } = await verifyOtp.mutateAsync({ email: registerEmail, otp: otpDigits.join('') })
                if (!data.data) return
                await registerMutation.mutateAsync(payload)
            }

            sessionStorage.removeItem('tryst_email')
            sessionStorage.removeItem('tryst_google_data')
            router.push('/onboarding')
        } catch {
            // toasts from hooks
        }
    }

    const handleNext = () => {
        if (step < 4) setStep(step + 1)
        else handleSubmit()
    }

    const loading = registerMutation.isPending || verifyOtp.isPending || sendOtp.isPending
    const stepLabels = ['Identity', 'About You', 'Desires', 'Verify']

    return (
        <div className="min-h-screen bg-tryst-bg flex flex-col items-center justify-center p-6">
            <div className="mb-10">
                <TrystLogo href="/" size="md" />
            </div>

            {/* Progress */}
            <div className="w-full max-w-md mb-8">
                <div className="flex items-center justify-between mb-3">
                    {stepLabels.map((label, i) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i + 1 < step ? 'bg-crimson text-white' : i + 1 === step ? 'bg-crimson/20 border-2 border-crimson text-crimson' : 'bg-tryst-card border border-tryst-border text-ivory-500'}`}>
                                {i + 1 < step ? <Check className="w-3 h-3" /> : i + 1}
                            </div>
                            <span className={`text-xs hidden sm:block ${i + 1 === step ? 'text-ivory-200' : 'text-ivory-600'}`}>{label}</span>
                        </div>
                    ))}
                </div>
                <div className="relative h-1 bg-tryst-border rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-crimson-gradient rounded-full transition-all duration-500" style={{ width: `${((step - 1) / (stepLabels.length - 1)) * 100}%` }} />
                </div>
            </div>

            <div className="w-full max-w-md bg-tryst-card border border-tryst-border rounded-2xl p-8">
                {/* Step 1 */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">Create your alias.</h2>
                            <p className="text-ivory-500 text-sm">Your real name is never shown. Choose a name that feels like you.</p>
                        </div>

                        {!googleSignup && (
                            <div className="space-y-3">
                                <GoogleSignInButton
                                    onClick={googleLogin}
                                    loading={googleLoading}
                                    label="Sign up with Google"
                                />
                                <AuthDivider label="or continue with email" />
                            </div>
                        )}

                        {googleSignup && (
                            <div className="flex items-center gap-3 p-3 bg-tryst-bg border border-tryst-border rounded-xl">
                                {googleSignup.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={googleSignup.avatar} alt="" className="w-10 h-10 rounded-full" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-tryst-border" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-ivory-200 text-sm font-medium truncate">{googleSignup.name || 'Google account'}</p>
                                    <p className="text-ivory-500 text-xs truncate">{googleSignup.email}</p>
                                </div>
                                <span className="ml-auto text-xs text-emerald-400 shrink-0">Verified</span>
                            </div>
                        )}
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Your Alias</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                <input type="text" value={form.alias} onChange={(e) => updateForm('alias', e.target.value)}
                                    placeholder="e.g. Scarlett M., The Wanderer" className="tryst-input pl-10" maxLength={30} />
                            </div>
                            <p className="text-ivory-600 text-xs mt-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Never your real name</p>
                        </div>
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Age</label>
                            <input type="number" value={form.age} onChange={(e) => updateForm('age', e.target.value)}
                                placeholder="Must be 18+" className="tryst-input" min={18} max={99} />
                        </div>
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Profession (optional)</label>
                            <input type="text" value={form.profession} onChange={(e) => updateForm('profession', e.target.value)}
                                placeholder="e.g. Doctor, Entrepreneur" className="tryst-input" />
                        </div>
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">City (optional)</label>
                            <input type="text" value={form.city} onChange={(e) => updateForm('city', e.target.value)}
                                placeholder="e.g. Mumbai, Dubai" className="tryst-input" />
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">About you.</h2>
                            <p className="text-ivory-500 text-sm">This helps us find the right connections for you.</p>
                        </div>
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-3 block">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['female', 'male'] as const).map((g) => (
                                    <button key={g} onClick={() => updateForm('gender', g)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all capitalize ${form.gender === g ? 'bg-crimson/10 border-crimson text-crimson-300' : 'border-tryst-border text-ivory-400 hover:border-tryst-border-2'}`}>
                                        {g === 'female' ? '👩 Woman' : '👨 Man'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-3 block">Relationship Status</label>
                            <div className="space-y-2">
                                {relationshipOptions.map((opt) => (
                                    <button key={opt.value} onClick={() => updateForm('relationshipStatus', opt.value)}
                                        className={`w-full flex items-center justify-between py-3 px-4 rounded-xl border text-sm transition-all ${form.relationshipStatus === opt.value ? 'bg-crimson/10 border-crimson' : 'border-tryst-border hover:border-tryst-border-2'}`}>
                                        <div className="text-left">
                                            <p className={`font-medium ${form.relationshipStatus === opt.value ? 'text-crimson-300' : 'text-ivory-200'}`}>{opt.label}</p>
                                            <p className="text-ivory-500 text-xs">{opt.desc}</p>
                                        </div>
                                        {form.relationshipStatus === opt.value && <Check className="w-4 h-4 text-crimson flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">What do you desire?</h2>
                            <p className="text-ivory-500 text-sm">Select all that resonate. Our AI uses this to find your matches.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {desireTags.map((tag) => (
                                <button key={tag} onClick={() => toggleTag(tag)}
                                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${form.desireTags.includes(tag) ? 'bg-crimson/15 border-crimson text-crimson-300' : 'border-tryst-border text-ivory-400 hover:border-tryst-border-2 hover:text-ivory-200'}`}>
                                    {form.desireTags.includes(tag) && <span className="mr-1">✓</span>}
                                    {tag}
                                </button>
                            ))}
                        </div>
                        {form.desireTags.length > 0 && (
                            <div className="bg-crimson/5 border border-crimson/15 rounded-xl p-3">
                                <p className="text-ivory-400 text-xs flex items-center gap-2">
                                    <Heart className="w-3 h-3 text-crimson" />
                                    DesireIQ™ will match you based on: {form.desireTags.join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">One last step.</h2>
                            <p className="text-ivory-500 text-sm">
                                {googleSignup
                                    ? 'Your Google account is verified. Review and begin your story.'
                                    : 'Verify with your email. We\'ll send a private code — your address stays hidden on TRYST.'}
                            </p>
                        </div>

                        {googleSignup ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                {googleSignup.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={googleSignup.avatar} alt="" className="w-12 h-12 rounded-full" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-tryst-border" />
                                )}
                                <div>
                                    <p className="text-ivory-200 text-sm font-medium">Signed in with Google</p>
                                    <p className="text-ivory-500 text-xs">{googleSignup.email}</p>
                                </div>
                            </div>
                        ) : otpStep === 'email' ? (
                            <div className="space-y-4">
                                <EmailField
                                    value={form.email}
                                    onChange={handleEmailChange}
                                    id="register-email"
                                    hint="Never shown on your profile"
                                />
                                {otpSendError && (
                                    <OtpErrorBanner message={otpSendError} onDismiss={() => setOtpSendError('')} />
                                )}
                                <button onClick={handleSendOtp} disabled={!isValidEmail(form.email) || sendOtp.isPending}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                    {sendOtp.isPending ? <div className="loading-spinner" /> : <>Send code to email <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-ivory-400 text-sm">
                                    Enter the 6-digit code we sent to your email.
                                </p>
                                <OtpDeliveryBanner email={registerEmail} mode={otpDelivery} />
                                <div className="flex gap-2 justify-between">
                                    {otpDigits.map((d, i) => (
                                        <input key={i} id={`rotp-${i}`} type="text" inputMode="numeric" value={d}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`rotp-${i - 1}`)?.focus() }}
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-ivory-100 text-xl font-bold bg-tryst-card border border-tryst-border rounded-xl outline-none focus:border-crimson focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)] transition-all"
                                        />
                                    ))}
                                </div>
                                {otpSendError && (
                                    <OtpErrorBanner message={otpSendError} onDismiss={() => setOtpSendError('')} />
                                )}
                                <button onClick={() => { setOtpStep('email'); setOtpDigits(['','','','','','']); autoSendDone.current = false; setOtpSendError('') }}
                                    className="text-ivory-500 text-xs hover:text-ivory-300 transition-colors">
                                    ← Change email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={sendOtp.isPending}
                                    className="text-crimson-400 text-xs hover:text-crimson-300 transition-colors disabled:opacity-50"
                                >
                                    {sendOtp.isPending ? 'Sending…' : 'Resend OTP'}
                                </button>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-tryst-card border border-tryst-border rounded-xl p-4 space-y-2">
                            <p className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-3">Your Profile Preview</p>
                            {[['Alias', form.alias],['Age', form.age],['Status', form.relationshipStatus?.replace(/-/g,' ')],['Desires', `${form.desireTags.length} selected`]].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between text-sm">
                                    <span className="text-ivory-500">{k}</span>
                                    <span className="text-ivory-200 capitalize">{v}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-ivory-600 text-xs">
                            By joining, you confirm you are 18+ and agree to our{' '}
                            <Link href="/terms" className="text-crimson-400 hover:underline">Terms</Link> &{' '}
                            <Link href="/privacy" className="text-crimson-400 hover:underline">Privacy Policy</Link>.
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex items-center gap-3">
                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)}
                            className="px-4 py-3 border border-tryst-border text-ivory-400 rounded-lg hover:border-tryst-border-2 hover:text-ivory-200 transition-all text-sm">
                            Back
                        </button>
                    )}
                    {(step < 4 || (step === 4 && (googleSignup || otpStep === 'otp'))) && (
                        <button onClick={handleNext} disabled={!canProceed() || loading}
                            className="flex-1 tryst-button-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                            {loading ? <div className="loading-spinner" /> : step < 4 ? <>Continue <ChevronRight className="w-4 h-4" /></> : <>Begin My Story <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    )}
                </div>
            </div>

            <p className="text-ivory-500 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-crimson-400 hover:text-crimson-300 transition-colors">Sign in</Link>
            </p>
        </div>
    )
}
