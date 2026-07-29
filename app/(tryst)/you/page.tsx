'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
    Edit3, Shield, Crown, ChevronRight, LogOut, Loader2,
    Moon, Sun, Eye, EyeOff, Newspaper, User, Check, Instagram, LayoutGrid,
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
import { AccountActions } from '@/components/tryst/AccountActions'
import type { DisguiseSkinId } from '@/components/tryst/disguise/skins'
import { scrollAppToTop } from '@/lib/scroll'

const ARCHETYPES: Record<string, { name: string; glyph: string }> = {
    WANDERER: { name: 'Wanderer', glyph: '✦' },
    FLAME: { name: 'Flame', glyph: '🔥' },
    GHOST: { name: 'Ghost', glyph: '👻' },
    SPARK: { name: 'Spark', glyph: '⚡' },
    STORY: { name: 'Story', glyph: '📖' },
}

function ToggleSwitch({ on }: { on: boolean }) {
    return (
        <div className={`tryst-toggle ${on ? 'tryst-toggle--on' : 'tryst-toggle--off'}`}>
            <div className={`tryst-toggle-knob ${on ? 'tryst-toggle-knob--on' : 'tryst-toggle-knob--off'}`} />
        </div>
    )
}

export default function YouPage() {
    const { isNightMode, toggleNightMode, disguiseModeEnabled, setDisguise } = useAppStore()
    const signOut = useSignOut()
    const toast = useToast()
    const qc = useQueryClient()
    const { data: authData } = useAuthUser()
    const { data: profile, isLoading } = useUserProfile()

    const [showDisguise, setShowDisguise] = useState(false)
    const [saving, setSaving] = useState(false)
    const [priv, setPriv] = useState({ blur: true, incognito: false, approx: true, readReceipts: true })
    const [showIcons, setShowIcons] = useState(false)
    const [appIcon, setAppIcon] = useState('tryst')

    const APP_ICONS = [
        { id: 'tryst', label: 'TRYST', emoji: '🔥' },
        { id: 'notes', label: 'Notes', emoji: '📝' },
        { id: 'weather', label: 'Weather', emoji: '☁️' },
        { id: 'finance', label: 'Finance', emoji: '📊' },
        { id: 'books', label: 'Books', emoji: '📚' },
        { id: 'recipes', label: 'Recipes', emoji: '🍳' },
    ]

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
                readReceipts: { readReceiptsEnabled: val },
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

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="you-page page-content pb-24 page-transition max-w-lg mx-auto">
            <div className="flex items-center gap-4 py-6">
                <ProfileAvatar seed={me?.alias || 'You'} src={me?.avatarUrl} size={74} className="border-2 border-crimson shadow-crimson" />
                <div className="flex-1">
                    <h1 className="font-playfair text-2xl font-bold text-tryst-text">{me?.alias}</h1>
                    <p className="text-tryst-muted text-xs mt-1">
                        {[me?.age, me?.profession, me?.city].filter(Boolean).join(' · ')}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold-400 text-[10px]">
                        {arch.glyph} {arch.name}
                    </span>
                </div>
                <Link href="/onboarding" className="w-9 h-9 rounded-full border border-tryst-border flex items-center justify-center text-tryst-muted hover:text-tryst-text transition-colors">
                    <Edit3 className="w-4 h-4" />
                </Link>
            </div>

            <Link href="/onboarding" className="you-card you-row p-4 mb-4 flex items-center gap-3 hover:border-crimson/20 transition-colors">
                <User className="w-5 h-5 you-icon" />
                <div className="flex-1">
                    <p className="you-ink text-sm font-medium">Edit profile</p>
                    <p className="you-muted text-xs">Alias, bio, basics, photos & who you&apos;re looking for</p>
                </div>
                <ChevronRight className="w-4 h-4 you-subtle" />
            </Link>

            <ProfileCompletionRing />

            <div className="mb-5">
                <ProfilePhotoUpload photos={me?.photoUrls || []} avatarUrl={me?.avatarUrl} />
            </div>

            {isGold ? (
                <div className="tryst-card p-4 mb-4 border-gold/40 bg-gold/5 flex items-center gap-3">
                    <Crown className="w-6 h-6 text-gold-400" />
                    <div className="flex-1">
                        <p className="font-playfair text-gold-400">TRYST Gold</p>
                        <p className="text-tryst-muted text-xs">Active subscription</p>
                    </div>
                </div>
            ) : (
                <Link href="/gold" className="tryst-card p-4 mb-4 border-gold/40 bg-gold/5 flex items-center gap-3 hover:border-gold/60 transition-colors">
                    <Crown className="w-6 h-6 text-gold-400" />
                    <div className="flex-1">
                        <p className="font-playfair text-gold-400">Upgrade to Gold</p>
                        <p className="text-tryst-muted text-xs">From ₹499/mo · billed discreetly</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gold-400" />
                </Link>
            )}

            <p className="you-section-label">Looking for</p>
            <Link href="/onboarding" className="you-card you-row p-4 mb-5 flex items-center gap-3">
                <User className="w-5 h-5 you-icon" />
                <span className="you-ink text-sm flex-1">
                    {me?.seeking || 'Everyone'} · {me?.agePrefMin || 18}–{me?.agePrefMax || 50} · {(me?.maxDistanceKm || 50) >= 100 ? 'Worldwide' : `${me?.maxDistanceKm || 50} km`}
                </span>
                <Edit3 className="w-4 h-4 you-subtle" />
            </Link>

            <p className="you-section-label">Privacy</p>
            <div className="you-card overflow-hidden mb-5">
                {[
                    { key: 'blur', icon: Eye, title: 'Blur photos by default', sub: 'Only 2 photos clear' },
                    { key: 'incognito', icon: EyeOff, title: 'Incognito browsing', sub: 'Browse with zero footprint' },
                    { key: 'approx', icon: Shield, title: 'Approximate distance', sub: 'Never reveal exact location' },
                    { key: 'readReceipts', icon: Check, title: 'Read receipts', sub: 'Gold privacy control' },
                ].map((row, i, arr) => (
                    <button key={row.key} onClick={() => savePrivacy(row.key, !priv[row.key as keyof typeof priv])}
                        disabled={saving}
                        className={`you-row w-full flex items-center gap-3 px-4 py-3.5 text-left ${i < arr.length - 1 ? 'border-b you-divider' : ''}`}>
                        <row.icon className={`w-5 h-5 ${priv[row.key as keyof typeof priv] ? 'you-icon' : 'you-subtle'}`} />
                        <div className="flex-1">
                            <p className="you-ink text-sm">{row.title}</p>
                            <p className="you-muted text-xs">{row.sub}</p>
                        </div>
                        <ToggleSwitch on={priv[row.key as keyof typeof priv]} />
                    </button>
                ))}
            </div>

            <p className="you-section-label">Discretion</p>
            <div className="you-card overflow-hidden mb-5">
                <button onClick={openDisguisePicker}
                    className="you-row w-full flex items-center gap-3 px-4 py-3.5 border-b you-divider">
                    <Newspaper className="w-5 h-5 you-icon" />
                    <div className="flex-1 text-left">
                        <p className="you-ink text-sm">Disguise Mode</p>
                        <p className="you-muted text-xs">
                            {disguiseModeEnabled
                                ? `${DISGUISE_SKIN_META.find(s => s.id === me?.activeDisguiseSkin)?.appName || 'The Morning Herald'} · active`
                                : 'Editorial newspaper, budget dashboard, meditation & more'}
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 you-subtle" />
                </button>
                <button onClick={toggleNightMode}
                    className="you-row w-full flex items-center gap-3 px-4 py-3.5 border-b you-divider">
                    {isNightMode ? <Moon className="w-5 h-5 you-icon" /> : <Sun className="w-5 h-5 you-icon" />}
                    <div className="flex-1 text-left">
                        <p className="you-ink text-sm font-medium">{isNightMode ? 'Dark mode' : 'Light mode'}</p>
                        <p className="you-muted text-xs">
                            {isNightMode ? 'Deep brown TRYST · cream accent cards' : 'Warm cream paper · brown accents'}
                        </p>
                    </div>
                    <ToggleSwitch on={isNightMode} />
                </button>
                <button onClick={() => setShowIcons(!showIcons)}
                    className="you-row w-full flex items-center gap-3 px-4 py-3.5 border-b you-divider">
                    <LayoutGrid className="w-5 h-5 you-icon" />
                    <div className="flex-1 text-left">
                        <p className="you-ink text-sm">App icon</p>
                        <p className="you-muted text-xs">Choose an innocent-looking launcher icon</p>
                    </div>
                    <span className="text-lg">{APP_ICONS.find(i => i.id === appIcon)?.emoji}</span>
                </button>
                {showIcons && (
                    <div className="grid grid-cols-3 gap-2 p-4 border-b you-divider">
                        {APP_ICONS.map(icon => (
                            <button key={icon.id} onClick={() => { setAppIcon(icon.id); localStorage.setItem('tryst_app_icon', icon.id) }}
                                className={`p-3 rounded-xl border text-center transition-colors ${appIcon === icon.id ? 'you-chip--selected' : 'you-divider border'}`}>
                                <span className="text-2xl block mb-1">{icon.emoji}</span>
                                <span className="text-[10px] you-muted">{icon.label}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="w-full flex items-center gap-3 px-4 py-3.5">
                    <Instagram className="w-5 h-5 you-icon" />
                    <div className="flex-1 text-left">
                        <p className="you-ink text-sm">Connected accounts</p>
                        <p className="you-muted text-xs">Interest signal only · token discarded</p>
                    </div>
                    <button className="px-3 py-1 rounded-full border you-chip text-xs font-medium">CONNECT</button>
                </div>
            </div>

            <p className="you-footer-tagline">TRYST · YOUR SECRET. YOUR STORY.</p>

            <p className="you-section-label mt-6">Account & billing</p>
            <div className="you-card overflow-hidden mb-4">
                <AccountActions />
            </div>

            <button onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 tryst-card text-tryst-muted hover:text-tryst-text transition-colors">
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
