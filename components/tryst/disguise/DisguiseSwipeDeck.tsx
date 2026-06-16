'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from 'framer-motion'
import { Heart, X, MapPin, Briefcase, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { useDiscoverProfiles, useSwipe, type DiscoverProfile } from '@/lib/hooks/useDiscover'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import { useTripleTap } from '@/lib/hooks/useTripleTap'
import { DISGUISE_THEMES } from './themes'
import type { DisguiseSkinId } from './skins'

import { publicConfig } from '@/lib/config'

const API_BASE = publicConfig.apiOrigin
const SWIPE_THRESHOLD = 90

function photoUrl(p: DiscoverProfile) {
    const url = p.avatarUrl || p.photoUrls?.[0]
    if (!url) return null
    return url.startsWith('http') ? url : `${API_BASE}${url}`
}

function ProfileCard({
    profile, theme, style, dragProps, stamp,
}: {
    profile: DiscoverProfile
    theme: typeof DISGUISE_THEMES.newspaper
    style?: React.CSSProperties
    dragProps?: Record<string, unknown>
    stamp?: 'like' | 'pass' | null
}) {
    const url = photoUrl(profile)

    return (
        <motion.div
            {...dragProps}
            style={style}
            className="swipe-card absolute inset-0 shadow-2xl"
        >
            <div
                className="w-full h-full rounded-[22px] overflow-hidden border-2 flex flex-col"
                style={{ background: theme.card, borderColor: theme.border }}
            >
                <div className="relative flex-1 min-h-0 bg-black/5">
                    {url ? (
                        <Image
                            src={url}
                            alt={profile.alias}
                            fill
                            className="object-cover"
                            unoptimized
                            draggable={false}
                        />
                    ) : (
                        <ProfileAvatar seed={profile.alias} size={400} className="w-full h-full !rounded-none" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {stamp === 'like' && (
                        <div className="absolute top-8 left-6 px-4 py-2 border-4 border-green-500 rounded-xl rotate-[-18deg] animate-fade-in">
                            <span className="text-green-400 font-black text-2xl tracking-widest">{theme.likeLabel.toUpperCase()}</span>
                        </div>
                    )}
                    {stamp === 'pass' && (
                        <div className="absolute top-8 right-6 px-4 py-2 border-4 border-red-500 rounded-xl rotate-[18deg] animate-fade-in">
                            <span className="text-red-400 font-black text-2xl tracking-widest">{theme.passLabel.toUpperCase()}</span>
                        </div>
                    )}

                    {profile.isOnline && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Live
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                        <div className="flex items-end gap-2">
                            <h2 className={`text-3xl font-bold ${theme.font}`}>{profile.alias}</h2>
                            <span className="text-2xl font-light opacity-90 mb-0.5">{profile.age}</span>
                            {profile.isVerified && (
                                <Sparkles className="w-5 h-5 text-amber-300 mb-1" />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/85">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {profile.city}{profile.country ? `, ${profile.country}` : ''}
                            </span>
                            {profile.profession && (
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {profile.profession}
                                </span>
                            )}
                        </div>
                        {profile.bio && (
                            <p className="mt-3 text-sm text-white/80 line-clamp-2 italic leading-relaxed">
                                &ldquo;{profile.bio}&rdquo;
                            </p>
                        )}
                        {profile.desireTags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {profile.desireTags.slice(0, 4).map(tag => (
                                    <span
                                        key={tag}
                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur"
                                        style={{ background: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.accent}40` }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function SwipeableTopCard({
    profile, theme, onSwipe, index,
}: {
    profile: DiscoverProfile
    theme: typeof DISGUISE_THEMES.newspaper
    onSwipe: (dir: 'like' | 'pass') => void
    index: number
}) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-220, 220], [-22, 22])
    const likeOpacity = useTransform(x, [20, 100], [0, 1])
    const passOpacity = useTransform(x, [-100, -20], [1, 0])
    const [stamp, setStamp] = useState<'like' | 'pass' | null>(null)

    const finish = useCallback((dir: 'like' | 'pass') => {
        setStamp(dir)
        setTimeout(() => onSwipe(dir), 280)
    }, [onSwipe])

    const onDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) finish('like')
        else if (info.offset.x < -SWIPE_THRESHOLD) finish('pass')
    }

    return (
        <motion.div
            className="absolute inset-0"
            style={{ zIndex: 10 + index }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: stamp === 'like' ? 400 : stamp === 'pass' ? -400 : 0, transition: { duration: 0.35 } }}
        >
            <motion.div
                className="absolute top-8 left-6 z-20 pointer-events-none px-3 py-1.5 border-4 border-green-500 rounded-xl rotate-[-18deg]"
                style={{ opacity: likeOpacity }}
            >
                <span className="text-green-500 font-black text-xl tracking-widest">{theme.likeLabel.toUpperCase()}</span>
            </motion.div>
            <motion.div
                className="absolute top-8 right-6 z-20 pointer-events-none px-3 py-1.5 border-4 border-red-500 rounded-xl rotate-[18deg]"
                style={{ opacity: passOpacity }}
            >
                <span className="text-red-500 font-black text-xl tracking-widest">{theme.passLabel.toUpperCase()}</span>
            </motion.div>

            <ProfileCard
                profile={profile}
                theme={theme}
                stamp={stamp}
                dragProps={{
                    drag: 'x',
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.9,
                    onDragEnd,
                    style: { x, rotate },
                    whileTap: { cursor: 'grabbing' },
                }}
            />
        </motion.div>
    )
}

interface Props {
    skinId: DisguiseSkinId
    alias?: string
    onReveal: () => void
}

export default function DisguiseSwipeDeck({ skinId, alias, onReveal }: Props) {
    const theme = DISGUISE_THEMES[skinId] || DISGUISE_THEMES.newspaper
    const { tap, ripple } = useTripleTap(onReveal)
    const { data, isLoading, fetchNextPage, hasNextPage } = useDiscoverProfiles()
    const swipeMut = useSwipe()

    const [index, setIndex] = useState(0)
    const [matchFlash, setMatchFlash] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const profiles = useMemo(
        () => data?.pages.flatMap(p => p) ?? [],
        [data],
    )

    const current = profiles[index]
    const next = profiles[index + 1]
    const third = profiles[index + 2]

    const advance = useCallback(() => {
        setIndex(i => {
            const nextIdx = i + 1
            if (nextIdx >= profiles.length - 3 && hasNextPage) fetchNextPage()
            return nextIdx
        })
    }, [profiles.length, hasNextPage, fetchNextPage])

    const handleSwipe = useCallback(async (dir: 'like' | 'pass') => {
        if (!current || busy) return
        setBusy(true)
        try {
            const { data: res } = await swipeMut.mutateAsync({
                targetId: current.id,
                direction: dir === 'like' ? 'like' : 'pass',
            })
            if (res.data.matched) {
                setMatchFlash(current.alias)
                setTimeout(() => setMatchFlash(null), 2200)
            }
        } catch { /* still advance */ }
        setBusy(false)
        advance()
    }, [current, busy, swipeMut, advance])

    const resetDeck = () => setIndex(0)

    return (
        <div
            className={`h-full flex flex-col overflow-hidden ${theme.font}`}
            style={{ background: theme.bg, color: theme.text }}
        >
            {/* themed header — triple tap to exit */}
            <button
                type="button"
                onClick={tap}
                className="relative flex-shrink-0 px-5 pt-14 pb-3 text-left w-full"
            >
                {ripple && (
                    <div
                        className="absolute left-1/2 top-16 -translate-x-1/2 w-14 h-14 rounded-full border animate-pulse-ring pointer-events-none"
                        style={{ borderColor: theme.accent }}
                    />
                )}
                <p className="text-[10px] tracking-[0.22em] uppercase font-mono" style={{ color: theme.muted }}>
                    {theme.headerSub}
                </p>
                <h1 className="text-2xl font-bold mt-0.5">{theme.headerTitle}</h1>
                <p className="text-[9px] tracking-widest uppercase mt-1 opacity-50">
                    Tap title 3× to return{alias ? ` · ${alias}` : ''}
                </p>
            </button>

            <div className="px-5 pb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide" style={{ color: theme.accent }}>
                    {theme.sectionLabel}
                </p>
                <span className="text-[10px] font-mono" style={{ color: theme.muted }}>
                    {profiles.length ? `${Math.min(index + 1, profiles.length)} / ${profiles.length}` : '—'}
                </span>
            </div>

            {/* card stack */}
            <div className="flex-1 relative mx-4 mb-3 min-h-[340px] max-h-[52vh] sm:max-h-[58vh]">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.accent }} />
                    </div>
                )}

                {!isLoading && !current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[22px] border-2 border-dashed"
                        style={{ borderColor: theme.border }}>
                        <p className="text-sm" style={{ color: theme.muted }}>No more profiles nearby</p>
                        <button
                            onClick={resetDeck}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                            style={{ background: theme.accentSoft, color: theme.accent }}
                        >
                            <RotateCcw className="w-4 h-4" /> Start over
                        </button>
                    </div>
                )}

                {third && (
                    <div className="absolute inset-0 scale-[0.92] translate-y-3 opacity-40 pointer-events-none">
                        <ProfileCard profile={third} theme={theme} />
                    </div>
                )}
                {next && (
                    <div className="absolute inset-0 scale-[0.96] translate-y-1.5 opacity-70 pointer-events-none">
                        <ProfileCard profile={next} theme={theme} />
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {current && (
                        <SwipeableTopCard
                            key={current.id}
                            profile={current}
                            theme={theme}
                            onSwipe={handleSwipe}
                            index={0}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* action buttons */}
            <div className="flex-shrink-0 px-6 pb-28 pt-2 flex items-center justify-center gap-6 sm:gap-10">
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                    disabled={!current || busy}
                    onClick={() => handleSwipe('pass')}
                    className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center border-2 shadow-lg disabled:opacity-40 transition-colors"
                    style={{ borderColor: '#ef4444', background: theme.card }}
                    aria-label={theme.passLabel}
                >
                    <X className="w-8 h-8 text-red-500" strokeWidth={2.5} />
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.08 }}
                    disabled={!current || busy}
                    onClick={() => handleSwipe('like')}
                    className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl disabled:opacity-40"
                    style={{
                        background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                        boxShadow: `0 8px 32px ${theme.accent}55`,
                    }}
                    aria-label={theme.likeLabel}
                >
                    <Heart className="w-9 h-9 text-white" fill="white" />
                </motion.button>
            </div>

            {/* match flash */}
            <AnimatePresence>
                {matchFlash && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[220] px-6 py-3 rounded-2xl bg-crimson text-white font-playfair text-lg shadow-2xl flex items-center gap-2"
                    >
                        <Sparkles className="w-5 h-5 text-gold-300" />
                        It&apos;s a match with {matchFlash}!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
