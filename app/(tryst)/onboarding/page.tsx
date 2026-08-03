'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ArrowLeft, ChevronRight, Loader2, MapPin, Sparkles, User, Lock,
} from 'lucide-react'
import { userApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useUserProfile } from '@/lib/hooks/useDiscover'
import ProfilePhotoUpload from '@/components/tryst/ProfilePhotoUpload'
import {
    detectGpsPlace,
    resolveCityPlace,
    suggestLocationPlaces,
    type LocationSuggestion,
} from '@/lib/geo/deviceLocation'
import {
    EDIT_PROFILE_STEPS,
    INTENT_OPTIONS,
    INTERESTS,
    normalizeIntent,
    normalizeSeeking,
    seekingToDb,
    type Intent,
    type Seeking,
} from '@/lib/profile/editProfileOptions'

const fade = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.25 },
}

export default function OnboardingPage() {
    const router = useRouter()
    const toast = useToast()
    const qc = useQueryClient()
    const { data: authMe, isLoading: authLoading } = useAuthUser()
    const { data: profile, isLoading: profileLoading } = useUserProfile()
    const me = profile || authMe

    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [locBusy, setLocBusy] = useState(false)
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
    const [suggestOpen, setSuggestOpen] = useState(false)
    const [suggestLoading, setSuggestLoading] = useState(false)
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pickLock = useRef(false)
    const prefilled = useRef(false)

    const [form, setForm] = useState({
        alias: '',
        age: '',
        gender: '' as 'female' | 'male' | 'non-binary' | '',
        profession: '',
        city: '',
        country: '',
        latitude: null as number | null,
        longitude: null as number | null,
        intent: '' as Intent | '',
        seeking: '' as Seeking | '',
        interests: [] as string[],
        bio: '',
        agePrefMin: 18,
        agePrefMax: 50,
        maxDistanceKm: 50,
        desireArchetype: 'WANDERER',
    })

    useEffect(() => {
        if (prefilled.current || !me) return
        prefilled.current = true
        setForm((p) => ({
            ...p,
            alias: me.alias || p.alias,
            age: me.age != null ? String(me.age) : p.age,
            gender: (me.gender as typeof p.gender) || p.gender,
            profession: me.profession || p.profession,
            city: me.city || p.city,
            country: me.country || p.country,
            latitude: me.latitude ?? p.latitude,
            longitude: me.longitude ?? p.longitude,
            intent: normalizeIntent(me.relationshipStatus) || p.intent,
            seeking: normalizeSeeking(me.seeking) || p.seeking,
            interests: Array.isArray(me.desireTags) ? me.desireTags : p.interests,
            bio: me.bio || p.bio,
            agePrefMin: me.agePrefMin ?? p.agePrefMin,
            agePrefMax: me.agePrefMax ?? p.agePrefMax,
            maxDistanceKm: me.maxDistanceKm ?? p.maxDistanceKm,
            desireArchetype: me.desireArchetype || p.desireArchetype,
        }))
    }, [me])

    useEffect(() => {
        if (step !== 1) return
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
                    country: form.country || undefined,
                    latitude: form.latitude,
                    longitude: form.longitude,
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
    }, [form.city, form.country, form.latitude, form.longitude, step])

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
        setForm((p) => ({ ...p, [k]: v }))

    const toggleInterest = (id: string) => {
        setForm((p) => {
            const has = p.interests.includes(id)
            if (has) return { ...p, interests: p.interests.filter((x) => x !== id) }
            if (p.interests.length >= 16) return p
            return { ...p, interests: [...p.interests, id] }
        })
    }

    const detectLocation = async () => {
        setLocBusy(true)
        try {
            const place = await detectGpsPlace()
            if (place.source === 'gps' && (place.city || place.latitude != null)) {
                setForm((p) => ({
                    ...p,
                    city: place.city || p.city,
                    country: place.country || p.country,
                    latitude: place.latitude,
                    longitude: place.longitude,
                }))
                toast.success('Location found', place.city || 'Coordinates saved')
            } else {
                toast.error('Location unavailable', 'Type your city instead')
            }
        } finally {
            setLocBusy(false)
        }
    }

    const canNext = useMemo(() => {
        if (step === 0) return form.alias.trim().length >= 2 && Number(form.age) >= 18 && !!form.gender
        if (step === 1) return form.city.trim().length >= 2
        if (step === 2) return !!form.intent && !!form.seeking
        if (step === 3) return form.interests.length >= 3
        if (step === 4) return form.bio.trim().length >= 20
        if (step === 5) return true
        return true
    }, [form, step])

    const save = async () => {
        setSaving(true)
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

            await userApi.updateProfile({
                alias: form.alias.trim(),
                age: Number(form.age),
                gender: form.gender,
                profession: form.profession.trim() || null,
                city: city.trim(),
                country: country || null,
                latitude,
                longitude,
                relationshipStatus: form.intent,
                seeking: seekingToDb(form.seeking),
                desireTags: form.interests,
                bio: form.bio.trim(),
                agePrefMin: form.agePrefMin,
                agePrefMax: form.agePrefMax,
                maxDistanceKm: form.maxDistanceKm,
                desireArchetype: form.desireArchetype,
                profileComplete: true,
            })

            await Promise.all([
                qc.invalidateQueries({ queryKey: ['me'] }),
                qc.invalidateQueries({ queryKey: ['profile', 'me'] }),
                qc.invalidateQueries({ queryKey: ['profile-completion'] }),
                qc.invalidateQueries({ queryKey: ['orbit-feed'] }),
            ])

            toast.success('Profile updated', 'Your changes are live')
            router.push('/you')
        } catch {
            toast.error('Save failed', 'Please try again')
        } finally {
            setSaving(false)
        }
    }

    const next = async () => {
        if (step < EDIT_PROFILE_STEPS.length - 1) {
            setStep((s) => s + 1)
            return
        }
        await save()
    }

    const loading = authLoading || profileLoading

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-crimson animate-spin" />
            </div>
        )
    }

    return (
        <div className="page-content py-6 pb-28 max-w-lg mx-auto page-transition">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400 mb-1">
                            Edit profile
                        </p>
                        <h1 className="font-playfair text-2xl sm:text-3xl text-tryst-text font-bold">
                            {EDIT_PROFILE_STEPS[step].label}
                        </h1>
                    </div>
                    <Link
                        href="/you"
                        className="text-xs text-tryst-muted hover:text-tryst-text border border-tryst-border rounded-full px-3 py-1.5"
                    >
                        Cancel
                    </Link>
                </div>

                <div className="flex gap-1.5 mb-2">
                    {EDIT_PROFILE_STEPS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStep(s.id)}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                s.id <= step ? 'bg-crimson' : 'bg-tryst-border'
                            }`}
                            aria-label={s.label}
                        />
                    ))}
                </div>
                <p className="text-[11px] text-tryst-muted">
                    Step {step + 1} of {EDIT_PROFILE_STEPS.length} · tap a bar to jump
                </p>
            </div>

            <div className="you-card p-5 sm:p-6 mb-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div key="basics" {...fade} className="space-y-4">
                            <p className="text-tryst-muted text-sm">Name, age, and how you identify.</p>
                            <Field label="Display name">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                    <input
                                        value={form.alias}
                                        maxLength={30}
                                        onChange={(e) => set('alias', e.target.value)}
                                        placeholder="Name others will see"
                                        className="tryst-input pl-10"
                                    />
                                </div>
                                <Hint icon={<Lock className="w-3 h-3" />} text="Only this name is shown — not your email or phone" />
                            </Field>
                            <Field label="Age">
                                <input
                                    type="number"
                                    min={18}
                                    max={99}
                                    value={form.age}
                                    onChange={(e) => set('age', e.target.value)}
                                    className="tryst-input"
                                    placeholder="18+"
                                />
                            </Field>
                            <Field label="I am">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['female', 'male', 'non-binary'] as const).map((g) => (
                                        <Chip
                                            key={g}
                                            active={form.gender === g}
                                            onClick={() => set('gender', g)}
                                            label={g === 'non-binary' ? 'Non-binary' : g[0].toUpperCase() + g.slice(1)}
                                        />
                                    ))}
                                </div>
                            </Field>
                            <Field label="Profession (optional)">
                                <input
                                    value={form.profession}
                                    onChange={(e) => set('profession', e.target.value)}
                                    className="tryst-input"
                                    placeholder="e.g. Designer, Doctor"
                                />
                            </Field>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div key="loc" {...fade} className="space-y-4">
                            <p className="text-tryst-muted text-sm">Helps show people nearby.</p>
                            <button
                                type="button"
                                onClick={() => void detectLocation()}
                                disabled={locBusy}
                                className="w-full py-2.5 rounded-xl border border-crimson/30 text-crimson text-sm flex items-center justify-center gap-2 hover:bg-crimson/5 disabled:opacity-50"
                            >
                                {locBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                Use my location
                            </button>
                            <Field label="City">
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                    <input
                                        value={form.city}
                                        onChange={(e) => {
                                            pickLock.current = false
                                            set('city', e.target.value)
                                        }}
                                        onFocus={() => suggestions.length && setSuggestOpen(true)}
                                        className="tryst-input pl-10"
                                        placeholder="Start typing your city"
                                    />
                                    {suggestLoading && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-tryst-muted" />
                                    )}
                                </div>
                                {suggestOpen && suggestions.length > 0 && (
                                    <div className="mt-2 rounded-xl border border-tryst-border bg-tryst-bg overflow-hidden max-h-48 overflow-y-auto">
                                        {suggestions.map((s) => (
                                            <button
                                                key={`${s.city}-${s.latitude}`}
                                                type="button"
                                                className="w-full text-left px-3.5 py-2.5 text-sm text-tryst-text hover:bg-crimson/10 border-b border-tryst-border/50 last:border-0"
                                                onClick={() => {
                                                    pickLock.current = true
                                                    setForm((p) => ({
                                                        ...p,
                                                        city: s.city || '',
                                                        country: s.country || p.country,
                                                        latitude: s.latitude,
                                                        longitude: s.longitude,
                                                    }))
                                                    setSuggestOpen(false)
                                                }}
                                            >
                                                {s.city}{s.country ? `, ${s.country}` : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </Field>
                            <Field label="Country (optional)">
                                <input
                                    value={form.country}
                                    onChange={(e) => set('country', e.target.value)}
                                    className="tryst-input"
                                    placeholder="Country"
                                />
                            </Field>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="looking" {...fade} className="space-y-5">
                            <p className="text-tryst-muted text-sm">What are you open to right now?</p>
                            <Field label="Intent">
                                <div className="space-y-2">
                                    {INTENT_OPTIONS.map((o) => (
                                        <button
                                            key={o.value}
                                            type="button"
                                            onClick={() => set('intent', o.value)}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                                                form.intent === o.value
                                                    ? 'border-crimson bg-crimson/10 shadow-[0_0_0_1px_rgba(192,57,43,0.2)]'
                                                    : 'border-tryst-border hover:border-crimson/30'
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-tryst-text">{o.label}</p>
                                            <p className="text-xs text-tryst-muted mt-0.5">{o.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Looking for">
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { v: 'women' as const, l: 'Women' },
                                        { v: 'men' as const, l: 'Men' },
                                        { v: 'everyone' as const, l: 'Everyone' },
                                    ]).map((o) => (
                                        <Chip key={o.v} active={form.seeking === o.v} onClick={() => set('seeking', o.v)} label={o.l} />
                                    ))}
                                </div>
                            </Field>
                            <Field label={`Age range · ${form.agePrefMin}–${form.agePrefMax}`}>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        min={18}
                                        max={99}
                                        value={form.agePrefMin}
                                        onChange={(e) => set('agePrefMin', Number(e.target.value) || 18)}
                                        className="tryst-input"
                                        placeholder="Min"
                                    />
                                    <input
                                        type="number"
                                        min={18}
                                        max={99}
                                        value={form.agePrefMax}
                                        onChange={(e) => set('agePrefMax', Number(e.target.value) || 50)}
                                        className="tryst-input"
                                        placeholder="Max"
                                    />
                                </div>
                            </Field>
                            <Field label={`Distance · ${form.maxDistanceKm >= 100 ? 'Worldwide' : `${form.maxDistanceKm} km`}`}>
                                <input
                                    type="range"
                                    min={5}
                                    max={200}
                                    value={form.maxDistanceKm}
                                    onChange={(e) => set('maxDistanceKm', Number(e.target.value))}
                                    className="w-full accent-crimson"
                                />
                            </Field>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="interests" {...fade} className="space-y-4">
                            <div className="flex items-end justify-between gap-3">
                                <p className="text-tryst-muted text-sm">
                                    Select at least 3. Tap to select / unselect.
                                </p>
                                <span className={`text-xs font-semibold ${form.interests.length >= 3 ? 'text-crimson' : 'text-tryst-muted'}`}>
                                    {form.interests.length}/16
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[52vh] overflow-y-auto pr-1">
                                {INTERESTS.map((item) => {
                                    const active = form.interests.includes(item.id)
                                    const Icon = item.icon
                                    return (
                                        <motion.button
                                            key={item.id}
                                            type="button"
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => toggleInterest(item.id)}
                                            className={`relative text-left p-3 rounded-xl border transition-all ${
                                                active
                                                    ? 'border-crimson bg-crimson/12 text-tryst-text'
                                                    : 'border-tryst-border text-tryst-muted hover:border-crimson/35 hover:text-tryst-text'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-crimson' : ''}`} />
                                            <p className="text-xs font-medium leading-snug">{item.label}</p>
                                            {active && (
                                                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-crimson" />
                                            )}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="bio" {...fade} className="space-y-4">
                            <p className="text-tryst-muted text-sm">A few lines about you. Min 20 characters.</p>
                            <textarea
                                value={form.bio}
                                maxLength={400}
                                rows={7}
                                onChange={(e) => set('bio', e.target.value)}
                                placeholder="What draws you in? What should someone know before they reach out…"
                                className="tryst-input resize-none leading-relaxed"
                            />
                            <div className="flex justify-between text-[11px] text-tryst-muted">
                                <span>
                                    {form.bio.trim().length < 20
                                        ? `${20 - form.bio.trim().length} more to go`
                                        : 'Looks good'}
                                </span>
                                <span>{form.bio.length}/400</span>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="photos" {...fade} className="space-y-3">
                            <p className="text-tryst-muted text-sm">Add or rearrange photos. First photo is your main.</p>
                            <ProfilePhotoUpload
                                photos={me?.photoUrls || []}
                                avatarUrl={me?.avatarUrl}
                            />
                        </motion.div>
                    )}

                    {step === 6 && (
                        <motion.div key="review" {...fade} className="space-y-4">
                            <p className="text-tryst-muted text-sm">Review and save your profile.</p>
                            <div className="rounded-2xl border border-tryst-border bg-tryst-bg/60 p-4 space-y-2.5">
                                <Row k="Name" v={form.alias} />
                                <Row k="Age" v={form.age} />
                                <Row k="Gender" v={form.gender} />
                                <Row k="City" v={[form.city, form.country].filter(Boolean).join(', ')} />
                                <Row
                                    k="Looking for"
                                    v={`${INTENT_OPTIONS.find((o) => o.value === form.intent)?.label || form.intent} · ${form.seeking}`}
                                />
                                <Row k="Age range" v={`${form.agePrefMin}–${form.agePrefMax}`} />
                                <Row k="Distance" v={form.maxDistanceKm >= 100 ? 'Worldwide' : `${form.maxDistanceKm} km`} />
                                <Row k="Interests" v={`${form.interests.length} selected`} />
                                <Row k="Photos" v={`${me?.photoUrls?.length || 0}`} />
                            </div>
                            {form.bio && (
                                <p className="text-sm text-tryst-text leading-relaxed whitespace-pre-wrap">
                                    {form.bio}
                                </p>
                            )}
                            {form.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {form.interests.map((id) => (
                                        <span
                                            key={id}
                                            className="px-2.5 py-1 rounded-full text-[11px] border border-crimson/30 bg-crimson/10 text-crimson"
                                        >
                                            {INTERESTS.find((i) => i.id === id)?.label || id}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex gap-3 sticky bottom-20 lg:bottom-4 z-20">
                {step > 0 && (
                    <button
                        type="button"
                        onClick={() => setStep((s) => s - 1)}
                        className="px-4 py-3.5 rounded-xl border border-tryst-border text-tryst-muted hover:text-tryst-text inline-flex items-center gap-1 bg-tryst-card"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                )}
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={!canNext || saving}
                    onClick={() => void next()}
                    className="flex-1 tryst-button-primary py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : step === EDIT_PROFILE_STEPS.length - 1 ? (
                        <>Save profile <Sparkles className="w-4 h-4" /></>
                    ) : (
                        <>Continue <ChevronRight className="w-4 h-4" /></>
                    )}
                </motion.button>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-tryst-muted text-xs font-medium tracking-wider uppercase mb-2 block">{label}</label>
            {children}
        </div>
    )
}

function Hint({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <p className="text-tryst-muted text-xs mt-1.5 flex items-center gap-1">
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
                active
                    ? 'bg-crimson text-white border-crimson'
                    : 'bg-tryst-bg text-tryst-muted border-tryst-border hover:border-crimson/40'
            }`}
        >
            {label}
        </button>
    )
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between gap-3 text-sm">
            <span className="text-tryst-muted">{k}</span>
            <span className="text-tryst-text font-medium text-right capitalize truncate">{v || '—'}</span>
        </div>
    )
}
