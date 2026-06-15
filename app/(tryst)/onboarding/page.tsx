'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Camera, Loader2 } from 'lucide-react'
import { userApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'

const ARCHETYPES = [
    { key: 'WANDERER', name: 'Wanderer', desc: 'Curious, restless, always planning the next escape' },
    { key: 'FLAME', name: 'Flame', desc: 'Intense, magnetic, lives in the moment' },
    { key: 'GHOST', name: 'Ghost', desc: 'Private, selective, values discretion above all' },
    { key: 'SPARK', name: 'Spark', desc: 'Playful, witty, chemistry through conversation' },
    { key: 'STORY', name: 'Story', desc: 'Deep, literary, connection through narrative' },
]

const STEPS = ['Alias', 'Basics', 'Archetype', 'Preferences', 'Availability', 'Privacy', 'Photos']

export default function OnboardingPage() {
    const router = useRouter()
    const toast = useToast()
    const qc = useQueryClient()
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        alias: '', age: '', gender: '', heightCm: '', profession: '',
        desireArchetype: '', seeking: 'Everyone', orientation: '',
        agePrefMin: 25, agePrefMax: 45, maxDistanceKm: 50,
        availabilityMask: 127, blurDefault: true, incognitoOnStart: false,
        bio: '',
    })

    const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }))

    const save = async () => {
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                alias: form.alias,
                desireArchetype: form.desireArchetype,
                seeking: form.seeking,
                agePrefMin: form.agePrefMin,
                agePrefMax: form.agePrefMax,
                maxDistanceKm: form.maxDistanceKm,
                availabilityMask: form.availabilityMask,
                blurDefault: form.blurDefault,
                incognitoOnStart: form.incognitoOnStart,
            }
            if (form.age) payload.age = parseInt(form.age)
            if (form.gender) payload.gender = form.gender
            if (form.heightCm) payload.heightCm = parseInt(form.heightCm)
            if (form.profession) payload.profession = form.profession
            if (form.orientation) payload.orientation = form.orientation
            if (form.bio) payload.bio = form.bio

            await userApi.updateProfile(payload)
            qc.invalidateQueries({ queryKey: ['me'] })
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            toast.success('Profile complete', 'Your Desire DNA is set.')
            router.push('/tonight')
        } catch {
            toast.error('Save failed', 'Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const next = () => step < STEPS.length - 1 ? setStep(s => s + 1) : save()
    const back = () => step > 0 && setStep(s => s - 1)

    return (
        <div className="page-content py-8 pb-24 min-h-screen page-transition">
            <div className="mb-8">
                <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400 mb-2">Desire DNA</p>
                <h1 className="font-playfair text-2xl text-ivory-100">{STEPS[step]}</h1>
                <div className="flex gap-1.5 mt-4">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-crimson' : 'bg-tryst-border'}`} />
                    ))}
                </div>
            </div>

            {step === 0 && (
                <div className="space-y-4">
                    <p className="text-ivory-500 text-sm">Choose an alias — your real name stays private.</p>
                    <input value={form.alias} onChange={e => set('alias', e.target.value)}
                        placeholder="Your alias" className="tryst-input text-lg font-playfair" />
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <input value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age" type="number" className="tryst-input" />
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className="tryst-input">
                        <option value="">Gender</option>
                        <option value="female">Woman</option>
                        <option value="male">Man</option>
                        <option value="other">Non-binary</option>
                    </select>
                    <input value={form.heightCm} onChange={e => set('heightCm', e.target.value)} placeholder="Height (cm)" type="number" className="tryst-input" />
                    <input value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="Profession" className="tryst-input" />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-3">
                    {ARCHETYPES.map(a => (
                        <button key={a.key} onClick={() => set('desireArchetype', a.key)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                                form.desireArchetype === a.key ? 'border-crimson bg-crimson/10' : 'border-tryst-border hover:border-tryst-border-2'
                            }`}>
                            <p className="font-playfair text-ivory-100">{a.name}</p>
                            <p className="text-ivory-500 text-xs mt-1">{a.desc}</p>
                        </button>
                    ))}
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <select value={form.seeking} onChange={e => set('seeking', e.target.value)} className="tryst-input">
                        <option>Women</option><option>Men</option><option>Everyone</option>
                    </select>
                    <div className="flex gap-3">
                        <input value={form.agePrefMin} onChange={e => set('agePrefMin', +e.target.value)} type="number" className="tryst-input" placeholder="Min age" />
                        <input value={form.agePrefMax} onChange={e => set('agePrefMax', +e.target.value)} type="number" className="tryst-input" placeholder="Max age" />
                    </div>
                    <input value={form.maxDistanceKm} onChange={e => set('maxDistanceKm', +e.target.value)} type="range" min={5} max={500} className="w-full" />
                    <p className="text-ivory-500 text-xs text-center">{form.maxDistanceKm >= 100 ? 'Worldwide' : `${form.maxDistanceKm} km`}</p>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-3">
                    {['Weeknights', 'Weekends', 'Late night', 'Travel mode'].map((label, i) => (
                        <button key={label} onClick={() => set('availabilityMask', form.availabilityMask ^ (1 << i))}
                            className={`w-full p-3 rounded-xl border text-left text-sm ${
                                form.availabilityMask & (1 << i) ? 'border-gold/40 bg-gold/10 text-gold-400' : 'border-tryst-border text-ivory-400'
                            }`}>{label}</button>
                    ))}
                </div>
            )}

            {step === 5 && (
                <div className="space-y-3">
                    {[
                        { key: 'blurDefault', label: 'Blur photos by default' },
                        { key: 'incognitoOnStart', label: 'Start in incognito mode' },
                    ].map(row => (
                        <button key={row.key} onClick={() => set(row.key, !form[row.key as keyof typeof form])}
                            className={`w-full p-4 rounded-xl border text-left flex justify-between items-center ${
                                form[row.key as keyof typeof form] ? 'border-crimson bg-crimson/10' : 'border-tryst-border'
                            }`}>
                            <span className="text-ivory-200 text-sm">{row.label}</span>
                            <div className={`w-5 h-5 rounded-full border-2 ${form[row.key as keyof typeof form] ? 'bg-crimson border-crimson' : 'border-ivory-600'}`} />
                        </button>
                    ))}
                </div>
            )}

            {step === 6 && (
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-tryst-border flex items-center justify-center">
                        <Camera className="w-8 h-8 text-ivory-600" />
                    </div>
                    <p className="text-ivory-500 text-sm">Photo upload coming soon. Complete with your alias for now.</p>
                    <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                        placeholder="A line that captures you..." className="tryst-input min-h-[100px] resize-none" />
                </div>
            )}

            <div className="flex gap-3 mt-10">
                {step > 0 && (
                    <button onClick={back} className="px-5 py-3 border border-tryst-border rounded-xl text-ivory-400">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
                <button onClick={next} disabled={saving}
                    className="flex-1 py-3 bg-crimson-gradient text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>{step === STEPS.length - 1 ? 'Enter TRYST' : 'Continue'} <ChevronRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
    )
}
