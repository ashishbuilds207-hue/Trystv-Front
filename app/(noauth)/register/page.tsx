'use client'

/**
 * Dating-style signup:
 * 1) Email and/or phone → OTP
 * 2) OTP verify creates the account (contact locked)
 * 3) Profile stepper starts — email/phone already filled, no re-entry
 * Progress autosaves; returning users resume at the first incomplete step.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronRight, ArrowRight, ArrowLeft, User, Lock, MapPin, Navigation,
    Loader2, Camera, X, Sparkles, Heart, Utensils, Gamepad2, Plane, Music, Dumbbell,
    BookOpen, Palette, Wine, Mountain, Clapperboard, PawPrint, Briefcase,
    Coffee, Headphones, Bike, Waves, Flame, Leaf, ShoppingBag, Mic2, Laugh,
    Moon, Sun, Tent, Drama, Languages, ChefHat, Flower2, Guitar, Dices, Tv,
    Car, Footprints, TreePine, Anchor, Brush, PartyPopper, Shirt, Pizza, Film,
    Phone,
} from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'
import { IconInput } from '@/components/tryst/IconInput'
import { EmailField, isValidEmail } from '@/components/auth/EmailField'
import { type GoogleUserData } from '@/lib/hooks/useGoogleAuthFlow'
import { useRegister, useSendOtp, useVerifyOtp } from '@/lib/hooks/useAuth'
import { useAppStore } from '@/lib/store/useAppStore'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { OtpErrorBanner } from '@/components/auth/OtpErrorBanner'
import { OtpDeliveryBanner } from '@/components/auth/OtpSentBanner'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'
import { VerifiedContactCard } from '@/components/auth/VerifiedContactCard'
import { createClient } from '@/lib/supabase/client'
import { userApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { isValidPhone, normalizePhone, phoneAuthEmail } from '@/lib/auth/contact'
import {
    clearRegisterDraft,
    computeResumeStep,
    formFromUserRow,
    loadRegisterDraft,
    saveRegisterDraft,
    type RegisterDraftForm,
} from '@/lib/auth/registerDraft'
import {
    detectGpsPlace,
    resolveCityPlace,
    suggestLocationPlaces,
    type LocationSuggestion,
} from '@/lib/geo/deviceLocation'

type Gate = 'contact' | 'otp' | 'profile'
type Intent = 'long-term' | 'short-term' | 'casual' | 'friendship' | 'open-to-all'
type Seeking = 'women' | 'men' | 'everyone'
type ContactMode = 'email' | 'phone' | 'both'

const PROFILE_STEPS = [
    { id: 1, label: 'Basics', weight: 15 },
    { id: 2, label: 'Location', weight: 10 },
    { id: 3, label: 'Looking for', weight: 15 },
    { id: 4, label: 'Interests', weight: 15 },
    { id: 5, label: 'Bio', weight: 15 },
    { id: 6, label: 'Photos', weight: 20 },
    { id: 7, label: 'Finish', weight: 10 },
] as const

const INTENT_OPTIONS: { value: Intent; label: string; desc: string }[] = [
    { value: 'long-term', label: 'Long-term', desc: 'Something real & lasting' },
    { value: 'short-term', label: 'Short-term', desc: 'Fun with a timeline' },
    { value: 'casual', label: 'Casual', desc: 'Keep it light' },
    { value: 'friendship', label: 'Friendship', desc: 'Chemistry without pressure' },
    { value: 'open-to-all', label: 'Open to all', desc: 'See where it goes' },
]

const INTERESTS: { id: string; label: string; icon: typeof Heart }[] = [
    // Lifestyle
    { id: 'Foodie', label: 'Foodie', icon: Utensils },
    { id: 'Cooking', label: 'Cooking', icon: ChefHat },
    { id: 'Coffee', label: 'Coffee', icon: Coffee },
    { id: 'Pizza nights', label: 'Pizza nights', icon: Pizza },
    { id: 'Wine & dining', label: 'Wine & dining', icon: Wine },
    { id: 'Nightlife', label: 'Nightlife', icon: Wine },
    { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'Fashion', label: 'Fashion', icon: Shirt },
    { id: 'Career', label: 'Career', icon: Briefcase },
    // Entertainment
    { id: 'Gamer', label: 'Gamer', icon: Gamepad2 },
    { id: 'Movies', label: 'Movies', icon: Clapperboard },
    { id: 'Series & TV', label: 'Series & TV', icon: Tv },
    { id: 'Anime', label: 'Anime', icon: Drama },
    { id: 'Comedy', label: 'Comedy', icon: Laugh },
    { id: 'Music', label: 'Music', icon: Music },
    { id: 'Live music', label: 'Live music', icon: Guitar },
    { id: 'Dancing', label: 'Dancing', icon: PartyPopper },
    { id: 'Karaoke', label: 'Karaoke', icon: Mic2 },
    { id: 'Podcasts', label: 'Podcasts', icon: Headphones },
    { id: 'Board games', label: 'Board games', icon: Dices },
    { id: 'Documentaries', label: 'Documentaries', icon: Film },
    // Active / outdoors
    { id: 'Fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'Yoga', label: 'Yoga', icon: Flower2 },
    { id: 'Running', label: 'Running', icon: Footprints },
    { id: 'Cycling', label: 'Cycling', icon: Bike },
    { id: 'Hiking', label: 'Hiking', icon: Mountain },
    { id: 'Camping', label: 'Camping', icon: Tent },
    { id: 'Beach', label: 'Beach', icon: Waves },
    { id: 'Swimming', label: 'Swimming', icon: Waves },
    { id: 'Outdoors', label: 'Outdoors', icon: TreePine },
    { id: 'Adventure', label: 'Adventure', icon: Flame },
    { id: 'Travel', label: 'Travel', icon: Plane },
    { id: 'Road trips', label: 'Road trips', icon: Car },
    { id: 'Photography', label: 'Photography', icon: Camera },
    // Mind & culture
    { id: 'Books', label: 'Books', icon: BookOpen },
    { id: 'Art', label: 'Art', icon: Palette },
    { id: 'Writing', label: 'Writing', icon: Brush },
    { id: 'Languages', label: 'Languages', icon: Languages },
    { id: 'Spirituality', label: 'Spirituality', icon: Leaf },
    { id: 'Astrology', label: 'Astrology', icon: Moon },
    { id: 'Meditation', label: 'Meditation', icon: Sun },
    { id: 'Pets', label: 'Pets', icon: PawPrint },
    { id: 'Nature', label: 'Nature', icon: TreePine },
    // Connection vibes
    { id: 'Romance', label: 'Romance', icon: Heart },
    { id: 'Passion', label: 'Passion', icon: Flame },
    { id: 'Conversation', label: 'Deep talks', icon: BookOpen },
    { id: 'Emotional Connection', label: 'Emotional connection', icon: Heart },
    { id: 'Physical', label: 'Chemistry', icon: Sparkles },
    { id: 'Discretion', label: 'Discretion', icon: Lock },
    { id: 'Night owl', label: 'Night owl', icon: Moon },
    { id: 'Early bird', label: 'Early bird', icon: Sun },
    { id: 'Spontaneous', label: 'Spontaneous', icon: Sparkles },
    { id: 'Chill vibes', label: 'Chill vibes', icon: Anchor },
]

const MIN_PHOTOS = 2
const MAX_PHOTOS = 6

const fade = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.28 },
}

export default function RegisterPage() {
    const router = useRouter()
    const toast = useToast()
    const { setAuthenticated } = useAppStore()
    const registerMutation = useRegister()
    const sendOtp = useSendOtp()
    const verifyOtp = useVerifyOtp()

    const [gate, setGate] = useState<Gate>('contact')
    const [contactMode, setContactMode] = useState<ContactMode>('email')
    const [step, setStep] = useState(1)
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
    const [sendError, setSendError] = useState('')
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')
    const [shownOtp, setShownOtp] = useState<string | null>(null)
    const [otpEmailSent, setOtpEmailSent] = useState(false)
    const [otpEmailError, setOtpEmailError] = useState<string | null>(null)
    const [verifiedEmail, setVerifiedEmail] = useState('')
    const [verifiedPhone, setVerifiedPhone] = useState('')
    const [googleSignup, setGoogleSignup] = useState<GoogleUserData | null>(null)
    const [photoUrls, setPhotoUrls] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [bootLoading, setBootLoading] = useState(true)
    const [resumed, setResumed] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)
    const userIdRef = useRef<string | null>(null)
    const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [form, setForm] = useState({
        alias: '',
        age: '',
        email: '',
        phone: '',
        gender: '' as 'female' | 'male' | 'non-binary' | '',
        intent: '' as Intent | '',
        seeking: '' as Seeking | '',
        interests: [] as string[],
        bio: '',
        profession: '',
        city: '',
        country: '',
        latitude: null as number | null,
        longitude: null as number | null,
    })

    const [locStatus, setLocStatus] = useState<'idle' | 'asking' | 'gps' | 'manual' | 'error'>('idle')
    const [locBusy, setLocBusy] = useState(false)
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
    const [suggestOpen, setSuggestOpen] = useState(false)
    const [suggestLoading, setSuggestLoading] = useState(false)
    const gpsAsked = useRef(false)
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pickLock = useRef(false)
    const geoBias = useRef<{ country: string | null; latitude: number | null; longitude: number | null }>({
        country: null, latitude: null, longitude: null,
    })

    const updateForm = (key: keyof typeof form, value: unknown) => setForm((p) => ({ ...p, [key]: value }))

    const draftFormSnapshot = (): RegisterDraftForm => ({
        alias: form.alias,
        age: form.age,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        intent: form.intent,
        seeking: form.seeking,
        interests: form.interests,
        bio: form.bio,
        profession: form.profession,
        city: form.city,
        country: form.country,
        latitude: form.latitude,
        longitude: form.longitude,
    })

    const writeLocalDraft = (nextStep: number, nextForm?: RegisterDraftForm) => {
        const uid = userIdRef.current
        if (!uid) return
        saveRegisterDraft({
            userId: uid,
            step: nextStep,
            form: nextForm || draftFormSnapshot(),
            updatedAt: Date.now(),
        })
    }

    /** Save filled fields to DB (profile stays incomplete until final submit). */
    const persistProgressToDb = async (snapshot: RegisterDraftForm, photos: string[]) => {
        const patch: Record<string, unknown> = {
            profileComplete: false,
        }
        if (snapshot.alias.trim().length >= 2) patch.alias = snapshot.alias.trim()
        if (Number(snapshot.age) >= 18) patch.age = Number(snapshot.age)
        if (snapshot.gender) patch.gender = snapshot.gender
        if (snapshot.city.trim()) patch.city = snapshot.city.trim()
        if (snapshot.country) patch.country = snapshot.country
        if (snapshot.latitude != null) patch.latitude = snapshot.latitude
        if (snapshot.longitude != null) patch.longitude = snapshot.longitude
        if (snapshot.intent) patch.relationshipStatus = snapshot.intent
        if (snapshot.seeking) {
            patch.seeking =
                snapshot.seeking === 'women' ? 'Women' : snapshot.seeking === 'men' ? 'Men' : 'Everyone'
        }
        if (snapshot.interests.length) patch.desireTags = snapshot.interests
        if (snapshot.bio.trim()) patch.bio = snapshot.bio.trim()
        if (snapshot.profession.trim()) patch.profession = snapshot.profession.trim()
        const phone = normalizePhone(snapshot.phone)
        if (phone) patch.phone = phone
        if (isValidEmail(snapshot.email)) patch.email = snapshot.email.trim().toLowerCase()
        if (photos[0]) patch.avatarUrl = photos[0]

        try {
            setSavingDraft(true)
            await userApi.updateProfile(patch)
        } catch {
            /* local draft still keeps progress */
        } finally {
            setSavingDraft(false)
        }
    }

    const completion = useMemo(() => {
        let pct = 0
        if (form.alias.length >= 2 && form.age && form.gender) pct += 15
        if (form.city) pct += 10
        if (form.intent && form.seeking) pct += 15
        if (form.interests.length >= 3) pct += 15
        else if (form.interests.length >= 1) pct += 8
        if (form.bio.trim().length >= 20) pct += 15
        else if (form.bio.trim().length >= 1) pct += 6
        if (photoUrls.length >= MIN_PHOTOS) pct += 20
        else if (photoUrls.length === 1) pct += 10
        if (gate === 'profile' && step >= 7) pct += 10
        return Math.min(100, pct)
    }, [form, photoUrls.length, gate, step])

    // Boot: session → restore unfinished profile at the right step
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const source = params.get('source')
        const saved = sessionStorage.getItem('tryst_email')
        const savedPhone = sessionStorage.getItem('tryst_phone')

        let cancelled = false

        ;(async () => {
            try {
                if (source === 'google' || source === 'magic') {
                    const raw = sessionStorage.getItem('tryst_google_data')
                    if (raw) {
                        try {
                            const data = JSON.parse(raw) as GoogleUserData
                            if (!cancelled) {
                                setGoogleSignup(data)
                                setForm((p) => ({ ...p, email: data.email || p.email, alias: p.alias || '' }))
                            }
                        } catch { /* ignore */ }
                    }
                }

                const { data } = await createClient().auth.getSession()
                if (cancelled) return

                if (!data.session?.user) {
                    if (saved) {
                        setForm((p) => ({ ...p, email: saved }))
                        setContactMode(savedPhone ? 'both' : 'email')
                    }
                    if (savedPhone) {
                        setForm((p) => ({ ...p, phone: savedPhone }))
                        if (!saved) setContactMode('phone')
                    }
                    setGate('contact')
                    return
                }

                const uid = data.session.user.id
                userIdRef.current = uid
                setAuthenticated(true)

                const empty: RegisterDraftForm = {
                    alias: '',
                    age: '',
                    email:
                        data.session.user.email && !data.session.user.email.endsWith('@phone.tryst.app')
                            ? data.session.user.email
                            : saved || '',
                    phone: savedPhone || '',
                    gender: '',
                    intent: '',
                    seeking: '',
                    interests: [],
                    bio: '',
                    profession: '',
                    city: '',
                    country: '',
                    latitude: null,
                    longitude: null,
                }

                const { data: row } = await createClient()
                    .from('users')
                    .select(
                        'photo_urls, alias, age, gender, bio, seeking, desire_tags, city, country, latitude, longitude, profession, relationship_status, phone, email, profile_complete',
                    )
                    .eq('id', uid)
                    .maybeSingle()

                if (cancelled) return

                if (row?.profile_complete && (row.alias as string)?.trim() && row.alias !== 'NewUser') {
                    clearRegisterDraft()
                    router.replace('/tonight')
                    return
                }

                const draft = loadRegisterDraft(uid)
                let nextForm = formFromUserRow((row || {}) as Record<string, unknown>, empty)
                if (draft?.form) {
                    // Prefer draft for fields the user typed but may not have synced yet
                    nextForm = {
                        ...nextForm,
                        ...Object.fromEntries(
                            Object.entries(draft.form).filter(([, v]) => {
                                if (Array.isArray(v)) return v.length > 0
                                if (typeof v === 'string') return v.trim().length > 0
                                return v != null
                            }),
                        ),
                    } as RegisterDraftForm
                }

                const photos = (row?.photo_urls as string[]) || []
                const nextStep = computeResumeStep(nextForm, photos.length)

                setForm(nextForm)
                setPhotoUrls(photos)
                setStep(nextStep)
                setGate('profile')
                const ve =
                    nextForm.email && !nextForm.email.endsWith('@phone.tryst.app') ? nextForm.email : ''
                const vp = nextForm.phone || ''
                setVerifiedEmail(ve)
                setVerifiedPhone(vp)
                saveRegisterDraft({
                    userId: uid,
                    step: nextStep,
                    form: nextForm,
                    updatedAt: Date.now(),
                })

                if (nextStep > 1 || photos.length > 0 || nextForm.alias.trim().length >= 2) {
                    setResumed(true)
                    toast.info('Welcome back', `Continuing at step ${nextStep} — your details are saved`)
                }
            } finally {
                if (!cancelled) setBootLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
    }, [])

    // Autosave draft while editing profile steps
    useEffect(() => {
        if (gate !== 'profile' || !userIdRef.current || bootLoading) return
        if (draftTimer.current) clearTimeout(draftTimer.current)
        draftTimer.current = setTimeout(() => {
            writeLocalDraft(step)
        }, 400)
        return () => {
            if (draftTimer.current) clearTimeout(draftTimer.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, step, photoUrls, gate, bootLoading])

    // GPS on location step
    useEffect(() => {
        if (gate !== 'profile' || step !== 2 || gpsAsked.current) return
        gpsAsked.current = true
        void (async () => {
            setLocBusy(true)
            setLocStatus('asking')
            const place = await detectGpsPlace()
            if (place.source === 'gps' && (place.city || place.latitude != null)) {
                geoBias.current = { country: place.country, latitude: place.latitude, longitude: place.longitude }
                setForm((p) => ({
                    ...p,
                    city: place.city || p.city,
                    country: place.country || p.country,
                    latitude: place.latitude,
                    longitude: place.longitude,
                }))
                setLocStatus('gps')
            } else {
                setLocStatus('manual')
            }
            setLocBusy(false)
        })()
    }, [gate, step])

    useEffect(() => {
        if (gate !== 'profile' || step !== 2) return
        if (suggestTimer.current) clearTimeout(suggestTimer.current)
        const q = form.city.trim()
        if (q.length < 2 || pickLock.current) {
            setSuggestions([])
            return
        }
        suggestTimer.current = setTimeout(async () => {
            setSuggestLoading(true)
            try {
                const list = await suggestLocationPlaces({
                    query: q,
                    country: geoBias.current.country || form.country || undefined,
                    latitude: geoBias.current.latitude ?? form.latitude,
                    longitude: geoBias.current.longitude ?? form.longitude,
                })
                setSuggestions(list)
                setSuggestOpen(true)
            } catch {
                setSuggestions([])
            } finally {
                setSuggestLoading(false)
            }
        }, 280)
        return () => {
            if (suggestTimer.current) clearTimeout(suggestTimer.current)
        }
    }, [form.city, form.country, form.latitude, form.longitude, gate, step])

    const handleSendOtp = async () => {
        const wantEmail = contactMode === 'email' || contactMode === 'both'
        const wantPhone = contactMode === 'phone' || contactMode === 'both'
        const emailOk = wantEmail && isValidEmail(form.email)
        const phoneNorm = wantPhone ? normalizePhone(form.phone) : null

        if (wantEmail && !emailOk) {
            setSendError('Enter a valid email')
            return
        }
        if (wantPhone && !phoneNorm) {
            setSendError('Enter a valid phone number')
            return
        }
        if (!emailOk && !phoneNorm) return

        setSendError('')
        try {
            const email = emailOk ? form.email.trim().toLowerCase() : undefined
            // Lock contact to what they chose for this OTP
            setForm((p) => ({
                ...p,
                email: wantEmail ? (email || p.email) : '',
                phone: wantPhone ? (phoneNorm || p.phone) : '',
            }))

            if (email) sessionStorage.setItem('tryst_email', email)
            else sessionStorage.removeItem('tryst_email')
            if (phoneNorm) sessionStorage.setItem('tryst_phone', phoneNorm)
            else sessionStorage.removeItem('tryst_phone')

            const res = await sendOtp.mutateAsync({
                email,
                phone: phoneNorm || undefined,
                purpose: 'register',
            })
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
            // Stop on OTP screen — profile steps only after verify creates the account
            setGate('otp')
            setOtpDigits(payload?.otp && payload.otp.length === 6 ? payload.otp.split('') : ['', '', '', '', '', ''])
        } catch (err) {
            setSendError(formatOtpSendError(getApiErrorMessage(err, 'Could not send code.')))
        }
    }

    const handleVerifyOtp = async () => {
        if (otpDigits.join('').length < 6) return
        try {
            const email = isValidEmail(form.email) ? form.email.trim().toLowerCase() : undefined
            const phone = normalizePhone(form.phone) || undefined
            const { data } = await verifyOtp.mutateAsync({
                email,
                phone,
                otp: otpDigits.join(''),
            })
            if (data.data) {
                // Account exists now — lock verified contact into the form for all steps
                const lockedEmail = email || (typeof data.data.email === 'string' ? data.data.email : '') || ''
                const lockedPhone = phone || (typeof data.data.phone === 'string' ? data.data.phone : '') || ''
                setVerifiedEmail(lockedEmail && !lockedEmail.endsWith('@phone.tryst.app') ? lockedEmail : '')
                setVerifiedPhone(lockedPhone)
                setAuthenticated(true)
                localStorage.setItem('tryst_token', 'supabase')
                toast.success('Account created', 'Your contact is saved — finish your profile next')
                setGate('profile')
                setStep(1)
                try {
                    const user = (await createClient().auth.getUser()).data.user
                    const uid = user?.id
                    if (uid) {
                        userIdRef.current = uid
                        const { data: row } = await createClient()
                            .from('users')
                            .select('photo_urls, alias, age, gender, bio, seeking, desire_tags, city, country, latitude, longitude, profession, relationship_status, phone, email')
                            .eq('id', uid)
                            .maybeSingle()
                        if (row?.photo_urls) setPhotoUrls((row.photo_urls as string[]) || [])
                        const base: RegisterDraftForm = {
                            ...draftFormSnapshot(),
                            email: lockedEmail || form.email,
                            phone: lockedPhone || form.phone,
                        }
                        const nextForm = row
                            ? formFromUserRow(row as Record<string, unknown>, base)
                            : base
                        // Always keep verified contact on the form
                        nextForm.email = lockedEmail || nextForm.email
                        nextForm.phone = lockedPhone || nextForm.phone
                        setForm(nextForm)
                        const photos = (row?.photo_urls as string[]) || []
                        const resume = computeResumeStep(nextForm, photos.length)
                        setStep(resume)
                        saveRegisterDraft({
                            userId: uid,
                            step: resume,
                            form: nextForm,
                            updatedAt: Date.now(),
                        })
                        if (resume > 1) {
                            setResumed(true)
                            toast.info('Welcome back', `Continuing at step ${resume}`)
                        }
                    }
                } catch { /* ignore resume errors */ }
            }
        } catch {
            /* hook toast */
        }
    }

    const toggleInterest = (id: string) => {
        setForm((p) => ({
            ...p,
            interests: p.interests.includes(id)
                ? p.interests.filter((x) => x !== id)
                : p.interests.length >= 16
                    ? p.interests
                    : [...p.interests, id],
        }))
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        if (photoUrls.length + files.length > MAX_PHOTOS) {
            toast.error('Photo limit', `Maximum ${MAX_PHOTOS} photos`)
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            files.forEach((f) => fd.append('photos', f))
            const res = await userApi.uploadPhotos(fd)
            const payload = res?.data?.data as { user?: { photoUrls?: string[] } } | undefined
            const urls = payload?.user?.photoUrls
            let nextPhotos = photoUrls
            if (Array.isArray(urls) && urls.length) {
                nextPhotos = urls
                setPhotoUrls(urls)
            } else {
                const uid = (await createClient().auth.getUser()).data.user?.id
                if (uid) {
                    const { data: row } = await createClient().from('users').select('photo_urls').eq('id', uid).maybeSingle()
                    nextPhotos = (row?.photo_urls as string[]) || []
                    setPhotoUrls(nextPhotos)
                }
            }
            toast.success('Photos added')
            writeLocalDraft(step)
            void persistProgressToDb(draftFormSnapshot(), nextPhotos)
        } catch {
            toast.error('Upload failed', 'Try again after verifying email')
        } finally {
            setUploading(false)
            if (photoInputRef.current) photoInputRef.current.value = ''
        }
    }

    const removePhoto = async (index: number) => {
        try {
            await userApi.deletePhoto(index)
            setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
        } catch {
            toast.error('Could not remove photo')
        }
    }

    const canProceed = () => {
        if (gate === 'contact') {
            if (contactMode === 'email') return isValidEmail(form.email)
            if (contactMode === 'phone') return isValidPhone(form.phone)
            return isValidEmail(form.email) && isValidPhone(form.phone)
        }
        if (gate === 'otp') return otpDigits.join('').length === 6
        if (step === 1) return form.alias.length >= 2 && Number(form.age) >= 18 && !!form.gender
        if (step === 2) return form.city.trim().length >= 2
        if (step === 3) return !!form.intent && !!form.seeking
        if (step === 4) return form.interests.length >= 3
        if (step === 5) return form.bio.trim().length >= 20
        if (step === 6) return photoUrls.length >= MIN_PHOTOS
        if (step === 7) return true
        return false
    }

    const handleNext = async () => {
        if (gate === 'contact') {
            await handleSendOtp()
            return
        }
        if (gate === 'otp') {
            await handleVerifyOtp()
            return
        }
        if (step < 7) {
            const snapshot = draftFormSnapshot()
            const nextStep = step + 1
            writeLocalDraft(nextStep, snapshot)
            void persistProgressToDb(snapshot, photoUrls)
            setStep(nextStep)
            return
        }
        await handleSubmit()
    }

    const handleBack = () => {
        if (gate === 'otp') {
            // Leave OTP — must re-send to start again; do not open profile steps
            setGate('contact')
            setOtpDigits(['', '', '', '', '', ''])
            setShownOtp(null)
            setSendError('')
            return
        }
        if (gate === 'profile' && step > 1) {
            const next = step - 1
            setStep(next)
            writeLocalDraft(next)
        }
    }

    const handleSubmit = async () => {
        try {
            let city = form.city
            let country = form.country
            let latitude = form.latitude
            let longitude = form.longitude
            if (city && (latitude == null || longitude == null)) {
                const place = await resolveCityPlace(city)
                city = place.city || city
                country = place.country || country
                latitude = place.latitude
                longitude = place.longitude
            }

            const phone = normalizePhone(form.phone)
            const email =
                (isValidEmail(form.email) ? form.email.trim().toLowerCase() : null) ||
                (phone ? phoneAuthEmail(phone) : '')

            await registerMutation.mutateAsync({
                email,
                phone: phone || undefined,
                alias: form.alias.trim(),
                age: Number(form.age),
                gender: form.gender,
                relationshipStatus: form.intent,
                desireTags: form.interests,
                profession: form.profession,
                city,
                country: country || undefined,
                latitude,
                longitude,
                bio: form.bio.trim(),
                seeking: form.seeking === 'women' ? 'Women' : form.seeking === 'men' ? 'Men' : 'Everyone',
                ...(googleSignup
                    ? { googleId: googleSignup.googleId, avatarUrl: googleSignup.avatar || photoUrls[0], freshStart: true }
                    : { avatarUrl: photoUrls[0] }),
            })

            clearRegisterDraft()
            sessionStorage.removeItem('tryst_email')
            sessionStorage.removeItem('tryst_phone')
            sessionStorage.removeItem('tryst_google_data')
            router.push('/tonight')
        } catch {
            /* hooks toast */
        }
    }

    const loading = registerMutation.isPending || verifyOtp.isPending || sendOtp.isPending || uploading

    if (bootLoading) {
        return (
            <div className="min-h-screen bg-tryst-bg flex flex-col items-center justify-center gap-3">
                <TrystLogo href="/" size="md" />
                <Loader2 className="w-7 h-7 text-crimson animate-spin" />
                <p className="text-ivory-500 text-sm">Checking your progress…</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-tryst-bg relative overflow-hidden">
            <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    background:
                        'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(192,57,43,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(212,175,55,0.08), transparent 50%)',
                }}
            />

            <div className="relative z-10 flex flex-col items-center px-4 py-8 sm:py-12 min-h-screen">
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <TrystLogo href="/" size="md" />
                </motion.div>

                {gate === 'profile' && (
                    <div className="w-full max-w-lg mb-6">
                        <VerifiedContactCard
                            email={verifiedEmail || form.email}
                            phone={verifiedPhone || form.phone}
                            onUpdated={({ email: nextEmail, phone: nextPhone }) => {
                                setVerifiedEmail(nextEmail)
                                setVerifiedPhone(nextPhone)
                                setForm((p) => ({
                                    ...p,
                                    email: nextEmail || p.email,
                                    phone: nextPhone || p.phone,
                                }))
                                if (nextEmail) sessionStorage.setItem('tryst_email', nextEmail)
                                else sessionStorage.removeItem('tryst_email')
                                if (nextPhone) sessionStorage.setItem('tryst_phone', nextPhone)
                                else sessionStorage.removeItem('tryst_phone')
                                writeLocalDraft(step, {
                                    ...draftFormSnapshot(),
                                    email: nextEmail || form.email,
                                    phone: nextPhone || form.phone,
                                })
                            }}
                        />
                        {resumed && (
                            <div className="mb-4 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-ivory-200">
                                <p className="font-medium text-gold-300">Picking up where you left off</p>
                                <p className="text-xs text-ivory-500 mt-0.5">
                                    Your answers are saved. Finish when you&apos;re ready.
                                    {savingDraft ? ' · Saving…' : ''}
                                </p>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-ivory-400 text-xs font-medium tracking-wider uppercase">
                                Profile {completion}% complete
                            </p>
                            <p className="text-crimson-300 text-xs font-semibold">
                                Step {step} / {PROFILE_STEPS.length}
                            </p>
                        </div>
                        <div className="h-2 rounded-full bg-tryst-border overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-crimson to-gold rounded-full"
                                animate={{ width: `${completion}%` }}
                                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                            />
                        </div>
                        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                            {PROFILE_STEPS.map((s) => (
                                <div
                                    key={s.id}
                                    className={`flex-1 min-w-[3rem] h-1 rounded-full transition-colors ${
                                        s.id < step ? 'bg-crimson' : s.id === step ? 'bg-crimson/50' : 'bg-tryst-border'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <motion.div
                    layout
                    className="w-full max-w-lg bg-tryst-card/95 backdrop-blur-xl border border-tryst-border/80 rounded-[1.5rem] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
                >
                    <AnimatePresence mode="wait">
                        {gate === 'contact' && (
                            <motion.div key="contact" {...fade} className="space-y-6">
                                <div>
                                    <p className="text-gold-400 text-[10px] tracking-[0.28em] uppercase font-mono mb-2">Join TRYST</p>
                                    <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">
                                        Email or phone first
                                    </h2>
                                    <p className="text-ivory-500 text-sm">
                                        We&apos;ll send a code. After you verify, your account is created — then the profile steps begin with this contact already saved.
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-tryst-bg border border-tryst-border">
                                    {([
                                        { id: 'email' as const, label: 'Email' },
                                        { id: 'phone' as const, label: 'Phone' },
                                        { id: 'both' as const, label: 'Both' },
                                    ]).map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                                setContactMode(m.id)
                                                setSendError('')
                                            }}
                                            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                                                contactMode === m.id
                                                    ? 'bg-crimson text-white'
                                                    : 'text-ivory-500 hover:text-ivory-300'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {sendError && <OtpErrorBanner message={sendError} />}

                                {(contactMode === 'email' || contactMode === 'both') && (
                                    <EmailField
                                        value={form.email}
                                        onChange={(v) => {
                                            updateForm('email', v)
                                            setSendError('')
                                        }}
                                        id="reg-email"
                                    />
                                )}

                                {(contactMode === 'phone' || contactMode === 'both') && (
                                    <div>
                                        <label htmlFor="reg-phone" className="block text-xs text-ivory-500 uppercase tracking-wider mb-1.5">
                                            Phone number
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-500" />
                                            <input
                                                id="reg-phone"
                                                type="tel"
                                                value={form.phone}
                                                onChange={(e) => {
                                                    updateForm('phone', e.target.value)
                                                    setSendError('')
                                                }}
                                                placeholder="+91 98XXX XXXXX"
                                                className="tryst-input w-full pl-10"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={!canProceed() || loading}
                                    onClick={() => void handleNext()}
                                    className="w-full tryst-button-primary py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send verification code <ArrowRight className="w-4 h-4" /></>}
                                </button>
                                <p className="text-center text-ivory-600 text-xs">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-crimson-300 hover:underline">Sign in</Link>
                                </p>
                            </motion.div>
                        )}

                        {gate === 'otp' && (
                            <motion.div key="otp" {...fade} className="space-y-6">
                                <div>
                                    <p className="text-gold-400 text-[10px] tracking-[0.28em] uppercase font-mono mb-2">Verify</p>
                                    <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Enter your code</h2>
                                    <p className="text-ivory-500 text-sm">
                                        Code sent to{' '}
                                        <span className="text-ivory-300">
                                            {[
                                                isValidEmail(form.email) ? form.email : null,
                                                normalizePhone(form.phone),
                                            ].filter(Boolean).join(' · ') || 'your contact'}
                                        </span>
                                        . Profile steps unlock after this.
                                    </p>
                                </div>
                                <OtpDeliveryBanner
                                    email={isValidEmail(form.email) ? form.email : (normalizePhone(form.phone) || form.email)}
                                    mode={otpDelivery}
                                    otp={shownOtp}
                                    emailSent={otpEmailSent}
                                    emailError={otpEmailError}
                                />
                                <div className="flex gap-2 justify-center">
                                    {otpDigits.map((d, i) => (
                                        <input
                                            key={i}
                                            id={`rotp-${i}`}
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={d}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, '')
                                                if (v.length > 1) return
                                                const next = [...otpDigits]
                                                next[i] = v
                                                setOtpDigits(next)
                                                if (v && i < 5) document.getElementById(`rotp-${i + 1}`)?.focus()
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
                                                    document.getElementById(`rotp-${i - 1}`)?.focus()
                                                }
                                            }}
                                            className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-semibold rounded-xl bg-tryst-bg border border-tryst-border text-ivory-100 focus:border-crimson outline-none"
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    disabled={!canProceed() || loading}
                                    onClick={() => void handleNext()}
                                    className="w-full tryst-button-primary py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & create account <ChevronRight className="w-4 h-4" /></>}
                                </button>
                                <button type="button" onClick={handleBack} className="w-full text-ivory-500 text-sm hover:text-ivory-300">
                                    ← Change email / phone
                                </button>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 1 && (
                            <motion.div key="s1" {...fade} className="space-y-5">
                                <Header title="The basics" sub="Name, age, and how you identify — your email/phone are already on your account." />
                                <Field label="Display name">
                                    <IconInput
                                        icon={<User />}
                                        value={form.alias}
                                        maxLength={30}
                                        placeholder="Name others will see"
                                        autoComplete="nickname"
                                        onChange={(e) => updateForm('alias', e.target.value)}
                                    />
                                    <Hint icon={<Lock className="w-3 h-3" />} text="Only this name is shown — not your email or phone" />
                                </Field>
                                <Field label="Age">
                                    <input
                                        type="number"
                                        min={18}
                                        max={99}
                                        className="tryst-input"
                                        value={form.age}
                                        placeholder="18+"
                                        onChange={(e) => updateForm('age', e.target.value)}
                                    />
                                </Field>
                                <Field label="I am">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['female', 'male', 'non-binary'] as const).map((g) => (
                                            <Chip key={g} active={form.gender === g} onClick={() => updateForm('gender', g)} label={g === 'non-binary' ? 'Non-binary' : g[0].toUpperCase() + g.slice(1)} />
                                        ))}
                                    </div>
                                </Field>
                                <Field label="Profession (optional)">
                                    <input
                                        className="tryst-input"
                                        value={form.profession}
                                        placeholder="e.g. Designer, Doctor"
                                        onChange={(e) => updateForm('profession', e.target.value)}
                                    />
                                </Field>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 2 && (
                            <motion.div key="s2" {...fade} className="space-y-5">
                                <Header title="Where are you?" sub="Helps us show people nearby." />
                                {(locBusy || locStatus === 'asking') && (
                                    <div className="flex items-center gap-2 text-sm text-ivory-400 rounded-xl border border-crimson/20 bg-crimson/5 px-3 py-2.5">
                                        <Loader2 className="w-4 h-4 animate-spin text-crimson-300" /> Detecting location…
                                    </div>
                                )}
                                {locStatus === 'gps' && form.city && (
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-300 text-sm flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> {form.city}{form.country ? `, ${form.country}` : ''}
                                    </div>
                                )}
                                <Field label="City">
                                    <IconInput
                                        icon={<MapPin />}
                                        value={form.city}
                                        placeholder="Start typing your city"
                                        autoComplete="address-level2"
                                        onChange={(e) => {
                                            pickLock.current = false
                                            updateForm('city', e.target.value)
                                            setLocStatus('manual')
                                        }}
                                        onFocus={() => suggestions.length && setSuggestOpen(true)}
                                        trailing={suggestLoading ? <Loader2 className="w-4 h-4 animate-spin text-ivory-500" /> : undefined}
                                    />
                                    {suggestOpen && suggestions.length > 0 && (
                                        <div className="mt-2 rounded-xl border border-tryst-border bg-tryst-bg overflow-hidden max-h-48 overflow-y-auto shadow-lg">
                                            {suggestions.map((s) => (
                                                <button
                                                    key={`${s.city}-${s.latitude}`}
                                                    type="button"
                                                    className="w-full text-left px-3.5 py-2.5 text-sm text-ivory-300 hover:bg-crimson/10 border-b border-tryst-border/50 last:border-0"
                                                    onClick={() => {
                                                        pickLock.current = true
                                                        setSuggestOpen(false)
                                                        setForm((p) => ({
                                                            ...p,
                                                            city: s.city || s.label || p.city,
                                                            country: s.country || p.country,
                                                            latitude: s.latitude,
                                                            longitude: s.longitude,
                                                        }))
                                                    }}
                                                >
                                                    {s.label || s.city}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </Field>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setLocBusy(true)
                                        const place = await detectGpsPlace()
                                        if (place.source === 'gps' && (place.city || place.latitude != null)) {
                                            setForm((p) => ({
                                                ...p,
                                                city: place.city || p.city,
                                                country: place.country || p.country,
                                                latitude: place.latitude,
                                                longitude: place.longitude,
                                            }))
                                            setLocStatus('gps')
                                        } else {
                                            toast.warning('Location', place.error || 'Could not detect GPS')
                                        }
                                        setLocBusy(false)
                                    }}
                                    className="text-sm text-crimson-300 hover:underline inline-flex items-center gap-1.5"
                                >
                                    <Navigation className="w-3.5 h-3.5" /> Use my current location
                                </button>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 3 && (
                            <motion.div key="s3" {...fade} className="space-y-5">
                                <Header title="What are you looking for?" sub="Relationship vibe + who you want to meet." />
                                <Field label="Relationship type">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {INTENT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateForm('intent', opt.value)}
                                                className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                                                    form.intent === opt.value
                                                        ? 'border-crimson bg-crimson/10 shadow-crimson'
                                                        : 'border-tryst-border bg-tryst-bg/50 hover:border-crimson/40'
                                                }`}
                                            >
                                                <p className="text-ivory-100 text-sm font-semibold">{opt.label}</p>
                                                <p className="text-ivory-500 text-xs mt-0.5">{opt.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label="Show me">
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { v: 'women' as Seeking, l: 'Women' },
                                            { v: 'men' as Seeking, l: 'Men' },
                                            { v: 'everyone' as Seeking, l: 'Everyone' },
                                        ]).map((o) => (
                                            <Chip key={o.v} active={form.seeking === o.v} onClick={() => updateForm('seeking', o.v)} label={o.l} />
                                        ))}
                                    </div>
                                </Field>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 4 && (
                            <motion.div key="s4" {...fade} className="space-y-5">
                                <Header title="Your interests" sub="Pick at least 3 — food, gaming, fitness, vibes, and more." />
                                <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto pr-1">
                                    {INTERESTS.map((item) => {
                                        const Icon = item.icon
                                        const on = form.interests.includes(item.id)
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => toggleInterest(item.id)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                                                    on
                                                        ? 'bg-crimson text-white border-crimson shadow-crimson'
                                                        : 'bg-tryst-bg text-ivory-400 border-tryst-border hover:border-crimson/40'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {item.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-ivory-600 text-xs">{form.interests.length} selected · min 3 · max 16</p>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 5 && (
                            <motion.div key="s5" {...fade} className="space-y-5">
                                <Header title="Write your bio" sub="A few lines about you. Min 20 characters." />
                                <textarea
                                    className="tryst-input min-h-[140px] resize-none py-3"
                                    value={form.bio}
                                    maxLength={400}
                                    placeholder="What makes a night with you unforgettable?"
                                    onChange={(e) => updateForm('bio', e.target.value)}
                                />
                                <div className="flex justify-between text-xs text-ivory-600">
                                    <span>{form.bio.trim().length < 20 ? `${20 - form.bio.trim().length} more to go` : 'Save looks good'}</span>
                                    <span>{form.bio.length}/400</span>
                                </div>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 6 && (
                            <motion.div key="s6" {...fade} className="space-y-5">
                                <Header title="Add your photos" sub={`At least ${MIN_PHOTOS} photos. First one becomes your main.`} />
                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                                        const url = photoUrls[i]
                                        return (
                                            <div
                                                key={i}
                                                className={`relative aspect-[3/4] rounded-2xl border overflow-hidden ${
                                                    url ? 'border-crimson/40' : 'border-dashed border-tryst-border bg-tryst-bg/60'
                                                }`}
                                            >
                                                {url ? (
                                                    <>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        {i === 0 && (
                                                            <span className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-wider bg-crimson text-white px-1.5 py-0.5 rounded-md">
                                                                Main
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => void removePhoto(i)}
                                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={uploading || photoUrls.length >= MAX_PHOTOS}
                                                        onClick={() => photoInputRef.current?.click()}
                                                        className="w-full h-full flex flex-col items-center justify-center gap-1 text-ivory-500 hover:text-crimson-300"
                                                    >
                                                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                                        <span className="text-[10px]">Add</span>
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => void handlePhotoUpload(e)}
                                />
                                <p className="text-ivory-600 text-xs">
                                    {photoUrls.length}/{MIN_PHOTOS} minimum · up to {MAX_PHOTOS}
                                </p>
                            </motion.div>
                        )}

                        {gate === 'profile' && step === 7 && (
                            <motion.div key="s7" {...fade} className="space-y-5">
                                <Header title="You're almost in" sub="Review and start discovering." />
                                <div className="rounded-2xl border border-tryst-border bg-tryst-bg/50 p-4 space-y-3">
                                    {(verifiedEmail || (form.email && !form.email.endsWith('@phone.tryst.app'))) && (
                                        <Row k="Email" v={verifiedEmail || form.email} />
                                    )}
                                    {(verifiedPhone || form.phone) && (
                                        <Row k="Phone" v={verifiedPhone || form.phone} />
                                    )}
                                    <Row k="Name" v={form.alias} />
                                    <Row k="Age" v={form.age} />
                                    <Row
                                        k="Looking for"
                                        v={`${INTENT_OPTIONS.find((o) => o.value === form.intent)?.label || form.intent} · ${form.seeking}`}
                                    />
                                    <Row k="City" v={form.city} />
                                    <Row k="Interests" v={`${form.interests.length} selected`} />
                                    <Row k="Photos" v={`${photoUrls.length}`} />
                                    <Row k="Profile" v={`${completion}%`} />
                                </div>
                                <p className="text-ivory-500 text-xs leading-relaxed">{form.bio.slice(0, 120)}{form.bio.length > 120 ? '…' : ''}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {gate === 'profile' && (
                        <div className="mt-8 flex gap-3">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-4 py-3 rounded-xl border border-tryst-border text-ivory-400 hover:text-ivory-200 inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={!canProceed() || loading}
                                onClick={() => void handleNext()}
                                className="flex-1 tryst-button-primary py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : step === 7 ? (
                                    <>Start TRYST <Sparkles className="w-4 h-4" /></>
                                ) : (
                                    <>Continue <ChevronRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

function Header({ title, sub }: { title: string; sub: string }) {
    return (
        <div>
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-ivory-100 mb-1">{title}</h2>
            <p className="text-ivory-500 text-sm">{sub}</p>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">{label}</label>
            {children}
        </div>
    )
}

function Hint({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <p className="text-ivory-600 text-xs mt-1.5 flex items-center gap-1">
            {icon} {text}
        </p>
    )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all ${
                active ? 'bg-crimson text-white border-crimson' : 'bg-tryst-bg text-ivory-400 border-tryst-border hover:border-crimson/40'
            }`}
        >
            {label}
        </button>
    )
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between gap-3 text-sm">
            <span className="text-ivory-500">{k}</span>
            <span className="text-ivory-200 font-medium text-right capitalize truncate">{v}</span>
        </div>
    )
}
