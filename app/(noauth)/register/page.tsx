'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Check, ArrowRight, User, Heart, Lock, Mail, MapPin, Navigation, Loader2 } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'
import { EmailField, isValidEmail } from '@/components/auth/EmailField'
import { type GoogleUserData } from '@/lib/hooks/useGoogleAuthFlow'
import { useRegister, useSendOtp, useVerifyOtp } from '@/lib/hooks/useAuth'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { OtpErrorBanner } from '@/components/auth/OtpErrorBanner'
import { OtpDeliveryBanner } from '@/components/auth/OtpSentBanner'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'
import { createClient } from '@/lib/supabase/client'
import {
    detectGpsPlace,
    resolveCityPlace,
    suggestLocationPlaces,
    type LocationSuggestion,
} from '@/lib/geo/deviceLocation'

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

    const registerMutation = useRegister()
    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()
    const [step, setStep] = useState(1)
    const [otpStep, setOtpStep] = useState<'email' | 'otp'>('email')
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
    const [sendError, setSendError] = useState('')
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')
    const [shownOtp, setShownOtp] = useState<string | null>(null)
    const [otpEmailSent, setOtpEmailSent] = useState(false)
    const [otpEmailError, setOtpEmailError] = useState<string | null>(null)
    const [googleSignup, setGoogleSignup] = useState<GoogleUserData | null>(null)
    const [hasSession, setHasSession] = useState(false)
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
        country: '',
        latitude: null as number | null,
        longitude: null as number | null,
    })
    const [locStatus, setLocStatus] = useState<'idle' | 'asking' | 'gps' | 'manual' | 'error'>('idle')
    const [locMessage, setLocMessage] = useState('')
    const [locBusy, setLocBusy] = useState(false)
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
    const [suggestOpen, setSuggestOpen] = useState(false)
    const [suggestLoading, setSuggestLoading] = useState(false)
    const gpsAsked = useRef(false)
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pickLock = useRef(false)
    /** Keep last known GPS bias even if user clears/edits the field */
    const geoBias = useRef<{
        country: string | null
        latitude: number | null
        longitude: number | null
    }>({ country: null, latitude: null, longitude: null })

    // Pre-fill from login OTP / Google / existing session
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const source = params.get('source')

        createClient().auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                setHasSession(true)
                setOtpStep('otp')
                if (data.session.user.email) {
                    setForm((p) => ({ ...p, email: data.session!.user.email! }))
                }
            }
        })

        if (source === 'google' || source === 'magic') {
            const raw = sessionStorage.getItem('tryst_google_data')
            if (raw) {
                try {
                    const data = JSON.parse(raw) as GoogleUserData
                    setGoogleSignup(data)
                    setForm((p) => ({
                        ...p,
                        email: data.email || p.email,
                        // Do not take Google display name — user saves their own name
                        alias: p.alias || '',
                    }))
                    setHasSession(true)
                } catch { /* ignore */ }
            }
            const savedEmail = sessionStorage.getItem('tryst_email')
            if (savedEmail) setForm((p) => ({ ...p, email: savedEmail }))
            return
        }
        const saved = sessionStorage.getItem('tryst_email')
        if (saved) setForm((p) => ({ ...p, email: saved }))
    }, [])

    /** Ask device GPS on Identity step and fill city from Google reverse-geocode. */
    const applyGpsLocation = async () => {
        setLocBusy(true)
        setLocStatus('asking')
        setLocMessage('Asking for your current location…')
        const place = await detectGpsPlace()
        if (place.source === 'gps' && (place.city || place.latitude != null)) {
            const next = {
                city: place.city || '',
                country: place.country || '',
                latitude: place.latitude,
                longitude: place.longitude,
            }
            // Always write city into the field when we have a name
            setForm((p) => ({
                ...p,
                city: next.city || p.city,
                country: next.country || p.country,
                latitude: next.latitude,
                longitude: next.longitude,
            }))
            if (next.country || next.latitude != null) {
                geoBias.current = {
                    country: next.country || geoBias.current.country,
                    latitude: next.latitude ?? geoBias.current.latitude,
                    longitude: next.longitude ?? geoBias.current.longitude,
                }
            }
            if (next.city) {
                setLocStatus('gps')
                setLocMessage(`Location set · ${next.city}${next.country ? `, ${next.country}` : ''}`)
                try {
                    sessionStorage.setItem('tryst_register_location_v2', JSON.stringify(next))
                } catch { /* ignore */ }
            } else {
                setLocStatus('error')
                setLocMessage('GPS found — type your city name to finish')
            }
        } else {
            setLocStatus('error')
            setLocMessage(place.error || 'Enter your city manually')
        }
        setLocBusy(false)
    }

    useEffect(() => {
        if (step !== 1 || gpsAsked.current) return
        gpsAsked.current = true
        // Restore previous GPS fill if user refreshed mid-register
        try {
            const raw = sessionStorage.getItem('tryst_register_location_v2')
            if (raw) {
                const saved = JSON.parse(raw) as {
                    city?: string; country?: string; latitude?: number | null; longitude?: number | null
                }
                if (saved.city && saved.latitude != null) {
                    setForm((p) => ({
                        ...p,
                        city: saved.city || p.city,
                        country: saved.country || p.country,
                        latitude: saved.latitude ?? null,
                        longitude: saved.longitude ?? null,
                    }))
                    geoBias.current = {
                        country: saved.country || null,
                        latitude: saved.latitude ?? null,
                        longitude: saved.longitude ?? null,
                    }
                    setLocStatus('gps')
                    setLocMessage(`Location set · ${saved.city}`)
                    return
                }
            }
            sessionStorage.removeItem('tryst_register_location')
        } catch { /* ignore */ }
        applyGpsLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step])

    const onCityBlur = async () => {
        // Let suggestion click finish first
        setTimeout(() => setSuggestOpen(false), 150)
        if (pickLock.current) return
        const city = form.city.trim()
        if (!city) return
        if (locStatus === 'gps' && form.latitude != null) return
        setLocBusy(true)
        const place = await resolveCityPlace(city)
        setForm((p) => ({
            ...p,
            city: place.city || city,
            country: place.country || p.country,
            latitude: place.latitude,
            longitude: place.longitude,
        }))
        if (place.country || place.latitude != null) {
            geoBias.current = {
                country: place.country || geoBias.current.country,
                latitude: place.latitude ?? geoBias.current.latitude,
                longitude: place.longitude ?? geoBias.current.longitude,
            }
        }
        setLocStatus('manual')
        setSuggestions([])
        setLocMessage(
            place.latitude != null
                ? `Location set · ${place.city || city}`
                : `Using “${place.city || city}”`,
        )
        setLocBusy(false)
    }

    const fetchSuggestions = (query: string) => {
        if (suggestTimer.current) clearTimeout(suggestTimer.current)
        if (query.trim().length < 2) {
            setSuggestions([])
            setSuggestOpen(false)
            setSuggestLoading(false)
            return
        }
        setSuggestLoading(true)
        suggestTimer.current = setTimeout(async () => {
            const list = await suggestLocationPlaces({
                query,
                country: form.country || geoBias.current.country || 'India',
                latitude: form.latitude ?? geoBias.current.latitude,
                longitude: form.longitude ?? geoBias.current.longitude,
            })
            setSuggestions(list)
            setSuggestOpen(list.length > 0)
            setSuggestLoading(false)
        }, 280)
    }

    const pickSuggestion = (s: LocationSuggestion) => {
        pickLock.current = true
        setForm((p) => ({
            ...p,
            city: s.label,
            country: s.country || p.country,
            latitude: s.latitude,
            longitude: s.longitude,
        }))
        geoBias.current = {
            country: s.country || geoBias.current.country,
            latitude: s.latitude,
            longitude: s.longitude,
        }
        setLocStatus('manual')
        setLocMessage(`Location set · ${s.label}`)
        setSuggestions([])
        setSuggestOpen(false)
        try {
            sessionStorage.setItem(
                'tryst_register_location_v2',
                JSON.stringify({
                    city: s.label,
                    country: s.country,
                    latitude: s.latitude,
                    longitude: s.longitude,
                }),
            )
        } catch { /* ignore */ }
        setTimeout(() => { pickLock.current = false }, 300)
    }

    const updateForm = (key: keyof typeof form, value: unknown) => setForm((p) => ({ ...p, [key]: value }))

    const toggleTag = (tag: DesireTag) => {
        const curr = form.desireTags
        updateForm('desireTags', curr.includes(tag) ? curr.filter(t => t !== tag) : [...curr, tag])
    }

    const canProceed = () => {
        if (step === 1) return form.alias.length >= 2 && form.age && Number(form.age) >= 18
        if (step === 2) return form.gender !== '' && form.relationshipStatus !== ''
        if (step === 3) return form.desireTags.length >= 1
        if (step === 4) {
            if (googleSignup || hasSession) return true
            return otpStep === 'otp' && otpDigits.join('').length === 6
        }
        return false
    }

    const registerEmail = (googleSignup?.email || form.email).trim().toLowerCase()

    const handleSendOtp = async () => {
        if (!isValidEmail(form.email)) return
        setSendError('')
        try {
            sessionStorage.setItem('tryst_email', registerEmail)
            const res = await sendOtp.mutateAsync({ email: registerEmail, purpose: 'register' })
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
            setOtpStep('otp')
            setOtpDigits(['', '', '', '', '', ''])
            // Prefill digits when OTP is shown on screen (dev / email blocked)
            if (payload?.otp && payload.otp.length === 6) {
                setOtpDigits(payload.otp.split(''))
            }
        } catch (err) {
            setOtpStep('email')
            setSendError(formatOtpSendError(getApiErrorMessage(err, 'Could not send code.')))
        }
    }

    const handleEmailChange = (value: string) => {
        updateForm('email', value)
        setSendError('')
        if (otpStep === 'otp') {
            setOtpStep('email')
            setOtpDigits(['', '', '', '', '', ''])
            autoSendDone.current = false
        }
    }

    useEffect(() => {
        if (step !== 4 || otpStep !== 'email' || hasSession || googleSignup) return
        if (!isValidEmail(form.email) || autoSendDone.current) return
        const fromLogin = sessionStorage.getItem('tryst_email')
        if (!fromLogin) return
        autoSendDone.current = true
        handleSendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, form.email, otpStep, hasSession, googleSignup])

    const handleOtpChange = (i: number, v: string) => {
        if (v.length > 1) return
        const next = [...otpDigits]
        next[i] = v.replace(/\D/g, '')
        setOtpDigits(next)
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
                country: form.country || undefined,
                latitude: form.latitude,
                longitude: form.longitude,
                ...(googleSignup ? { googleId: googleSignup.googleId, avatarUrl: googleSignup.avatar, freshStart: true } : {}),
            }

            // If user typed a city but GPS failed earlier, resolve coords before save
            if (payload.city && (payload.latitude == null || payload.longitude == null)) {
                const place = await resolveCityPlace(payload.city)
                payload.city = place.city || payload.city
                payload.country = place.country || payload.country
                payload.latitude = place.latitude
                payload.longitude = place.longitude
            }

            if (!googleSignup && !hasSession) {
                const { data } = await verifyOtp.mutateAsync({ email: registerEmail, otp: otpDigits.join('') })
                if (!data.data) return
            }

            await registerMutation.mutateAsync(payload)

            sessionStorage.removeItem('tryst_email')
            sessionStorage.removeItem('tryst_google_data')
            sessionStorage.removeItem('tryst_pending_register')
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
                            <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-1">Choose your name.</h2>
                            <p className="text-ivory-500 text-sm mb-6">
                                Your email is for login only. Save the display name people will see — only that name is shown.
                            </p>
                        </div>

                        {(googleSignup?.email || form.email) && (
                            <div className="flex items-center gap-3 p-3 bg-tryst-bg border border-tryst-border rounded-xl">
                                {googleSignup?.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={googleSignup.avatar} alt="" className="w-10 h-10 rounded-full" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-tryst-border flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-ivory-500" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-ivory-500 text-[10px] uppercase tracking-wider">Email</p>
                                    <p className="text-ivory-200 text-sm font-medium truncate">
                                        {googleSignup?.email || form.email}
                                    </p>
                                </div>
                                {googleSignup && (
                                    <span className="ml-auto text-xs text-emerald-400 shrink-0">Verified</span>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Your name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                <input type="text" value={form.alias} onChange={(e) => updateForm('alias', e.target.value)}
                                    placeholder="Name people will see" className="tryst-input pl-10" maxLength={30} />
                            </div>
                            <p className="text-ivory-600 text-xs mt-1 flex items-center gap-1"><Lock className="w-3 h-3" /> This is the only name others see</p>
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase">
                                    Your location
                                </label>
                                {form.latitude != null && form.city && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                                        <Check className="w-3 h-3" /> Location set
                                    </span>
                                )}
                            </div>

                            {(locStatus === 'asking' || (locBusy && !form.city)) && (
                                <div className="mb-3 flex items-center gap-2 rounded-xl border border-crimson/20 bg-crimson/5 px-3 py-2.5 text-sm text-ivory-300">
                                    <Loader2 className="w-4 h-4 animate-spin text-crimson-300 shrink-0" />
                                    Detecting your current location…
                                </div>
                            )}

                            {locStatus === 'gps' && form.city && (
                                <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                                    <p className="text-emerald-300 text-sm font-medium flex items-center gap-2">
                                        <MapPin className="w-4 h-4 shrink-0" />
                                        {form.city}
                                    </p>
                                    <p className="text-emerald-500/80 text-[11px] mt-0.5 pl-6">
                                        Autofilled from your device GPS
                                    </p>
                                </div>
                            )}

                            <div className="relative">
                                <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${
                                    form.city && form.latitude != null ? 'text-emerald-400' : 'text-tryst-muted'
                                }`} />
                                <input
                                    type="text"
                                    value={form.city}
                                    autoComplete="off"
                                    onChange={(e) => {
                                        const city = e.target.value
                                        setForm((p) => ({
                                            ...p,
                                            city,
                                            latitude: null,
                                            longitude: null,
                                        }))
                                        setLocStatus('manual')
                                        setLocMessage('Type to search places near you')
                                        fetchSuggestions(city)
                                    }}
                                    onFocus={() => {
                                        if (suggestions.length > 0) setSuggestOpen(true)
                                        else if (form.city.trim().length >= 2) fetchSuggestions(form.city)
                                    }}
                                    onBlur={onCityBlur}
                                    placeholder={locBusy ? 'Detecting…' : 'Type area, sector, or city'}
                                    className={`tryst-input pl-10 pr-12 ${
                                        form.city && form.latitude != null
                                            ? 'border-emerald-500/40 focus:border-emerald-400'
                                            : ''
                                    }`}
                                />
                                <button
                                    type="button"
                                    title="Use current location"
                                    disabled={locBusy}
                                    onClick={applyGpsLocation}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg text-crimson-300 hover:bg-crimson/10 disabled:opacity-50"
                                >
                                    {locBusy || suggestLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Navigation className="w-4 h-4" />}
                                </button>

                                {suggestOpen && suggestions.length > 0 && (
                                    <ul className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-auto rounded-xl border border-tryst-border bg-tryst-card shadow-2xl">
                                        {suggestions.map((s) => (
                                            <li key={`${s.label}-${s.latitude}`}>
                                                <button
                                                    type="button"
                                                    className="w-full text-left px-3 py-2.5 text-sm text-ivory-200 hover:bg-crimson/10 hover:text-crimson-200 flex items-start gap-2 transition-colors"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => pickSuggestion(s)}
                                                >
                                                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-crimson-300 shrink-0" />
                                                    <span>
                                                        <span className="font-medium block">{s.label}</span>
                                                        {s.country && (
                                                            <span className="text-[11px] text-ivory-500">{s.country}</span>
                                                        )}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <p className="text-[11px] text-ivory-600 mt-1.5">
                                Optional — type to see places in {form.country || geoBias.current.country || 'your country'}
                            </p>

                            {locMessage && locStatus !== 'gps' && (
                                <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                                    locStatus === 'error' ? 'text-gold-400' : 'text-ivory-500'
                                }`}>
                                    {locBusy
                                        ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                        : <MapPin className="w-3 h-3 shrink-0" />}
                                    {locMessage}
                                </p>
                            )}

                            <button
                                type="button"
                                disabled={locBusy}
                                onClick={applyGpsLocation}
                                className="mt-2 w-full py-2.5 rounded-xl border border-tryst-border text-sm text-ivory-300 hover:border-crimson/40 hover:text-crimson-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {locBusy
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting GPS…</>
                                    : <><Navigation className="w-4 h-4" /> {form.city ? 'Update from my location' : 'Use my current location'}</>}
                            </button>
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
                                {googleSignup || hasSession
                                    ? 'You\'re verified. Review and begin your story.'
                                    : 'We\'ll send a 6-digit code to your email.'}
                            </p>
                        </div>

                        {googleSignup || hasSession ? (
                            <>
                                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                    {googleSignup?.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={googleSignup.avatar} alt="" className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-crimson" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-ivory-200 text-sm font-medium">
                                            {googleSignup ? 'Signed in with Google' : 'Email verified'}
                                        </p>
                                        <p className="text-ivory-500 text-xs">{registerEmail}</p>
                                    </div>
                                </div>
                            </>
                        ) : otpStep === 'email' ? (
                            <div className="space-y-4">
                                <EmailField
                                    value={form.email}
                                    onChange={handleEmailChange}
                                    id="register-email"
                                    hint="Never shown on your profile"
                                />
                                {sendError && (
                                    <OtpErrorBanner message={sendError} onDismiss={() => setSendError('')} />
                                )}
                                <button onClick={handleSendOtp} disabled={!isValidEmail(form.email) || sendOtp.isPending}
                                    className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                    {sendOtp.isPending ? <div className="loading-spinner" /> : <>Send code to email <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <OtpDeliveryBanner
                                    email={registerEmail}
                                    mode={otpDelivery}
                                    otp={shownOtp}
                                    emailSent={otpEmailSent}
                                    emailError={otpEmailError}
                                />
                                <div className="flex gap-2 justify-between">
                                    {otpDigits.map((d, i) => (
                                        <input
                                            key={i}
                                            id={`rotp-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            value={d}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !d && i > 0) {
                                                    document.getElementById(`rotp-${i - 1}`)?.focus()
                                                }
                                            }}
                                            maxLength={1}
                                            className="w-12 h-14 text-center text-ivory-100 text-xl font-bold bg-tryst-card border border-tryst-border rounded-xl outline-none focus:border-crimson focus:shadow-[0_0_0_3px_rgba(192,57,43,0.15)] transition-all"
                                        />
                                    ))}
                                </div>
                                {sendError && (
                                    <OtpErrorBanner message={sendError} onDismiss={() => setSendError('')} />
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOtpStep('email')
                                        setOtpDigits(['', '', '', '', '', ''])
                                        autoSendDone.current = false
                                        setSendError('')
                                    }}
                                    className="text-ivory-500 text-xs hover:text-ivory-300 transition-colors"
                                >
                                    ← Change email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={sendOtp.isPending}
                                    className="block text-crimson-400 text-xs hover:text-crimson-300 transition-colors disabled:opacity-50"
                                >
                                    {sendOtp.isPending ? 'Sending…' : 'Resend code'}
                                </button>
                            </div>
                        )}

                        <div className="bg-tryst-card border border-tryst-border rounded-xl p-4 space-y-2">
                            <p className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-3">Your Profile Preview</p>
                            {[['Name', form.alias],['Age', form.age],['Status', form.relationshipStatus?.replace(/-/g,' ')],['Desires', `${form.desireTags.length} selected`]].map(([k, v]) => (
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
                    {(step < 4 || (step === 4 && (googleSignup || hasSession || otpStep === 'otp'))) && (
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
