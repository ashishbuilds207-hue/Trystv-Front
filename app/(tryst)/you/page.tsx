'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
    Edit3, Shield, Crown, ChevronRight, LogOut, Loader2,
    Moon, Eye, EyeOff, Newspaper, User,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { useSignOut, useAuthUser } from '@/lib/hooks/useAuth'
import { useUserProfile } from '@/lib/hooks/useDiscover'
import { userApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import ProfilePhotoUpload from '@/components/tryst/ProfilePhotoUpload'
import ProfileCompletionRing from '@/components/tryst/ProfileCompletionRing'
import { DISGUISE_SKIN_META } from '@/components/tryst/disguise/skinMeta'
import DisguisePickerModal from '@/components/tryst/disguise/DisguisePickerModal'
import type { DisguiseSkinId } from '@/components/tryst/disguise/skins'
import { scrollAppToTop } from '@/lib/scroll'

const ARCHETYPES: Record<string, { name: string; glyph: string }> = {
    WANDERER: { name: 'Wanderer', glyph: '✦' },
    FLAME: { name: 'Flame', glyph: '🔥' },
    GHOST: { name: 'Ghost', glyph: '👻' },
    SPARK: { name: 'Spark', glyph: '⚡' },
    STORY: { name: 'Story', glyph: '📖' },
}

export default function YouPage() {
    const { isGhostMode, toggleGhostMode, isNightMode, toggleNightMode, disguiseModeEnabled, setDisguise } = useAppStore()
    const signOut = useSignOut()
    const toast = useToast()
    const qc = useQueryClient()
    const { data: authData } = useAuthUser()
    const { data: profile, isLoading } = useUserProfile()

    const [showDisguise, setShowDisguise] = useState(false)
    const [saving, setSaving] = useState(false)
    const [priv, setPriv] = useState({ blur: true, incognito: false, approx: true })

    const me = profile || authData
    const arch = ARCHETYPES[me?.desireArchetype || 'WANDERER'] || ARCHETYPES.WANDERER
    const isGold = me?.isGold

    const savePrivacy = async (key: string, val: boolean) => {
        setPriv(p => ({ ...p, [key]: val }))
        setSaving(true)
        try {
            const map: Record<string, Record<string, boolean>> = {
                blur: { blurDefault: val },
                incognito: { incognitoOnStart: val },
                approx: { showExactDistance: !val },
            }
            await userApi.updateProfile(map[key] || {})
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
        } catch {
            toast.error('Update failed')
        } finally {
            setSaving(false)
        }
    }

    const activateDisguise = async (skin: DisguiseSkinId) => {
        try {
            setShowDisguise(false)
            scrollAppToTop('auto')
            await userApi.updateProfile({ disguiseModeEnabled: true, activeDisguiseSkin: skin })
            setDisguise(true, skin)
            const meta = DISGUISE_SKIN_META.find(s => s.id === skin)
            toast.success('Disguise active', meta ? `Looks like ${meta.appName}` : 'Innocent app skin on')
            requestAnimationFrame(() => scrollAppToTop('auto'))
        } catch {
            toast.error('Could not activate disguise')
        }
    }

    const openDisguisePicker = useCallback(() => {
        scrollAppToTop('auto')
        requestAnimationFrame(() => setShowDisguise(true))
    }, [])

    const exitDisguise = async () => {
        setDisguise(false)
        try {
            await userApi.updateProfile({ disguiseModeEnabled: false })
            toast.info('Disguise off', 'Welcome back to TRYST')
        } catch { /* local state already cleared */ }
    }

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-24 page-transition">
            <div className="flex items-center gap-4 py-6">
                <ProfileAvatar seed={me?.alias || 'You'} src={me?.avatarUrl} size={74} className="border-2 border-crimson shadow-crimson" />
                <div className="flex-1">
                    <h1 className="font-playfair text-2xl text-ivory-100">{me?.alias}</h1>
                    <p className="text-ivory-500 text-xs mt-1">
                        {[me?.age, me?.profession, me?.city].filter(Boolean).join(' · ')}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold-400 text-[10px]">
                        {arch.glyph} {arch.name}
                    </span>
                </div>
                <Link href="/onboarding" className="w-9 h-9 rounded-full border border-tryst-border flex items-center justify-center text-ivory-500 hover:text-ivory-200">
                    <Edit3 className="w-4 h-4" />
                </Link>
            </div>

            <ProfileCompletionRing />

            <div className="mb-5">
                <ProfilePhotoUpload photos={me?.photoUrls || []} avatarUrl={me?.avatarUrl} />
            </div>

            {isGold ? (
                <div className="tryst-card p-4 mb-4 border-gold/40 bg-gold/5 flex items-center gap-3">
                    <Crown className="w-6 h-6 text-gold-400" />
                    <div className="flex-1">
                        <p className="font-playfair text-gold-400">TRYST Gold</p>
                        <p className="text-ivory-500 text-xs">Active subscription</p>
                    </div>
                </div>
            ) : (
                <Link href="/gold" className="tryst-card p-4 mb-4 border-gold/40 bg-gold/5 flex items-center gap-3 hover:border-gold/60 transition-colors">
                    <Crown className="w-6 h-6 text-gold-400" />
                    <div className="flex-1">
                        <p className="font-playfair text-gold-400">Upgrade to Gold</p>
                        <p className="text-ivory-500 text-xs">From ₹499/mo · billed discreetly</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gold-400" />
                </Link>
            )}

            <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-ivory-600 mb-2 px-1">Looking for</p>
            <Link href="/onboarding" className="tryst-card p-4 mb-5 flex items-center gap-3">
                <User className="w-5 h-5 text-gold-400" />
                <span className="text-ivory-300 text-sm flex-1">
                    {me?.seeking || 'Everyone'} · {me?.agePrefMin || 18}–{me?.agePrefMax || 50} · {(me?.maxDistanceKm || 50) >= 100 ? 'Worldwide' : `${me?.maxDistanceKm || 50} km`}
                </span>
                <ChevronRight className="w-4 h-4 text-ivory-600" />
            </Link>

            <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-ivory-600 mb-2 px-1">Privacy</p>
            <div className="tryst-card overflow-hidden mb-5">
                {[
                    { key: 'blur', icon: Eye, title: 'Blur photos by default', sub: 'Only 2 photos clear' },
                    { key: 'incognito', icon: EyeOff, title: 'Incognito browsing', sub: 'Browse with zero footprint' },
                    { key: 'approx', icon: Shield, title: 'Approximate distance', sub: 'Never reveal exact location' },
                ].map((row, i, arr) => (
                    <button key={row.key} onClick={() => savePrivacy(row.key, !priv[row.key as keyof typeof priv])}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-tryst-card-2 transition-colors ${i < arr.length - 1 ? 'border-b border-tryst-border' : ''}`}>
                        <row.icon className={`w-5 h-5 ${priv[row.key as keyof typeof priv] ? 'text-crimson-300' : 'text-ivory-600'}`} />
                        <div className="flex-1">
                            <p className="text-ivory-200 text-sm">{row.title}</p>
                            <p className="text-ivory-600 text-xs">{row.sub}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors ${priv[row.key as keyof typeof priv] ? 'bg-crimson/60' : 'bg-tryst-border'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${priv[row.key as keyof typeof priv] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    </button>
                ))}
            </div>

            <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-ivory-600 mb-2 px-1">Safety</p>
            <div className="tryst-card overflow-hidden mb-5">
                <button onClick={() => disguiseModeEnabled ? exitDisguise() : openDisguisePicker()}
                    className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-tryst-border hover:bg-tryst-card-2">
                    <Newspaper className="w-5 h-5 text-gold-400" />
                    <div className="flex-1 text-left">
                        <p className="text-ivory-200 text-sm">Disguise Mode</p>
                        <p className="text-ivory-600 text-xs">
                            {disguiseModeEnabled
                                ? `Active · ${DISGUISE_SKIN_META.find(s => s.id === me?.activeDisguiseSkin)?.appName || 'The Morning Herald'}`
                                : 'Hide TRYST behind a normal-looking app'}
                        </p>
                    </div>
                    {disguiseModeEnabled ? (
                        <span className="text-[10px] text-crimson-300 font-mono tracking-wider">EXIT</span>
                    ) : (
                        <ChevronRight className="w-4 h-4 text-ivory-600" />
                    )}
                </button>
                <button onClick={toggleGhostMode}
                    className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-tryst-border hover:bg-tryst-card-2">
                    <Shield className="w-5 h-5 text-gold-400" />
                    <div className="flex-1 text-left">
                        <p className="text-ivory-200 text-sm">Ghost Mode</p>
                        <p className="text-ivory-600 text-xs">{isGhostMode ? 'Currently hidden' : 'Browse invisibly'}</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full ${isGhostMode ? 'bg-gold/60' : 'bg-tryst-border'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${isGhostMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                </button>
                <button onClick={toggleNightMode}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-tryst-card-2">
                    <Moon className="w-5 h-5 text-gold-400" />
                    <div className="flex-1 text-left">
                        <p className="text-ivory-200 text-sm">Night Mode</p>
                        <p className="text-ivory-600 text-xs">Dramatic dark interface</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full ${isNightMode ? 'bg-gold/60' : 'bg-tryst-border'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${isNightMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                </button>
            </div>

            <button onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 tryst-card text-ivory-500 hover:text-ivory-300 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign out discreetly</span>
            </button>

            <DisguisePickerModal
                open={showDisguise}
                onClose={() => setShowDisguise(false)}
                onSelect={activateDisguise}
            />
        </div>
    )
}
