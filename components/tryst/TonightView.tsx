'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Flame, Moon, Sun, TrendingUp, Lock, Loader2, Send, Ghost, Newspaper,
    Camera, Mic, Video, Heart, MessageCircle, Eye, EyeOff, Sparkles, ChevronRight,
} from 'lucide-react'
import {
    useEngagementHome, useStreakCheckIn, useSaveDiary, useCreateMoment,
} from '@/lib/hooks/useFeatures'
import { engagementApi } from '@/lib/api/auth'
import { useAppStore } from '@/lib/store/useAppStore'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useToast } from '@/lib/hooks/useToast'
import ProfileAvatar from './ProfileAvatar'
import DisguisePickerModal from './disguise/DisguisePickerModal'
import { DISGUISE_SKIN_META } from './disguise/skinMeta'
import type { DisguiseSkinId } from './disguise/skins'
import { userApi } from '@/lib/api/auth'

const MILESTONES = [['3', 'Boost'], ['7', '+10 pts'], ['14', '+20 pts'], ['30', 'Obsidian']]

export default function TonightView() {
    const { data: home, isLoading } = useEngagementHome()
    const streakMut = useStreakCheckIn()
    const diaryMut = useSaveDiary()
    const momentMut = useCreateMoment()
    const { isNightMode, toggleNightMode, isGhostMode, toggleGhostMode, disguiseModeEnabled, setDisguise, activeDisguiseSkin } = useAppStore()
    const toast = useToast()
    const qc = useQueryClient()

    const [diary, setDiary] = useState('')
    const [saved, setSaved] = useState(false)
    const [moment, setMoment] = useState('')
    const [showDisguisePicker, setShowDisguisePicker] = useState(false)
    const [visitorsUnlocked, setVisitorsUnlocked] = useState<{ alias: string; avatarUrl?: string; city?: string }[] | null>(null)
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [mediaInput, setMediaInput] = useState('')

    const unlockMut = useMutation({
        mutationFn: () => engagementApi.unlockVisitors(),
        onSuccess: ({ data }) => {
            setVisitorsUnlocked(data.data.visitors)
            qc.invalidateQueries({ queryKey: ['engagement-home'] })
            toast.success('Visitors revealed', `${data.data.visitors.length} people viewed your profile`)
        },
        onError: () => toast.error('Not enough points', 'Earn more via streaks & daily prompts'),
    })

    const mediaMut = useMutation({
        mutationFn: ({ type, content }: { type: string; content?: string }) =>
            engagementApi.postDailyMedia(type, content),
        onSuccess: ({ data }) => {
            qc.invalidateQueries({ queryKey: ['engagement-home'] })
            toast.success('Posted', `+${data.data.pointsEarned} points earned`)
            setMediaInput('')
        },
    })

    const night = isNightMode || home?.isNight
    const streak = home?.streak ?? 0
    const isGold = home?.isGold
    const points = home?.points ?? 0
    const greeting = home?.greeting ?? 'Good evening'

    const activateDisguise = async (skin: DisguiseSkinId) => {
        setShowDisguisePicker(false)
        await userApi.updateProfile({ disguiseModeEnabled: true, activeDisguiseSkin: skin })
        setDisguise(true, skin)
    }

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-28 page-transition max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 py-4 mb-1">
                <div className="min-w-0">
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400 mb-0.5">{greeting}</p>
                    <h1 className="font-playfair text-3xl font-bold text-ivory-100 truncate">{home?.alias}</h1>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/30">
                        <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                        <span className="font-playfair text-sm font-bold text-gold-300">{points}</span>
                        <span className="text-[9px] text-gold-500 uppercase tracking-wider">pts</span>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={toggleNightMode} title="Day / Night"
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                                night ? 'bg-gold/10 border-gold/40 text-gold-400' : 'bg-tryst-card border-tryst-border text-ivory-500'
                            }`}>
                            {night ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                        <button onClick={toggleGhostMode} title="Ghost mode"
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                                isGhostMode ? 'bg-gold/10 border-gold/40 text-gold-400' : 'bg-tryst-card border-tryst-border text-ivory-500'
                            }`}>
                            <Ghost className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Disguise toggle */}
            <div className="tryst-card p-3 mb-4 flex items-center gap-3">
                <Newspaper className="w-5 h-5 text-gold-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-ivory-200 text-sm font-medium">Disguise Mode</p>
                    <p className="text-ivory-600 text-xs truncate">
                        {disguiseModeEnabled
                            ? `Active · ${DISGUISE_SKIN_META.find(s => s.id === activeDisguiseSkin)?.appName || 'Newspaper'}`
                            : 'Editorial newspaper preselected · tap to enable'}
                    </p>
                </div>
                <button
                    onClick={async () => {
                        if (disguiseModeEnabled) {
                            setDisguise(false)
                            await userApi.updateProfile({ disguiseModeEnabled: false }).catch(() => {})
                        } else {
                            setShowDisguisePicker(true)
                        }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors ${disguiseModeEnabled ? 'bg-crimson/60' : 'bg-tryst-border'}`}
                >
                    <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${disguiseModeEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>

            {/* Daily media prompts */}
            <div className="mb-4">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-2 px-1">Daily prompts · earn points</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                        { type: 'photo', icon: Camera, label: 'Photo', pts: 5 },
                        { type: 'voice', icon: Mic, label: 'Voice', pts: 8 },
                        { type: 'video', icon: Video, label: 'Video', pts: 10 },
                    ].map(({ type, icon: Icon, label, pts }) => {
                        const done = home?.dailyMediaTasks?.find(t => t.type === type)?.done
                        return (
                            <button key={type} disabled={done || mediaMut.isPending}
                                onClick={() => mediaMut.mutate({ type, content: mediaInput || `${label} prompt for today` })}
                                className={`tryst-card p-3 text-left transition-all ${done ? 'opacity-50' : 'hover:border-crimson/30'}`}>
                                <Icon className="w-4 h-4 text-crimson-300 mb-1" />
                                <p className="text-ivory-200 text-sm">{label}</p>
                                <p className="text-ivory-600 text-xs">+{pts} pts {done && '· done'}</p>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Streak */}
            <div className="tryst-card p-5 mb-4 relative overflow-hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => streakMut.mutate()} className="relative w-14 h-14 flex items-center justify-center">
                        <Flame className="w-12 h-12 text-crimson drop-shadow-[0_0_10px_rgba(192,57,43,0.6)]" fill="currentColor" />
                        <span className="absolute font-playfair text-lg text-white mt-1">{streak}</span>
                    </button>
                    <div className="flex-1">
                        <h3 className="font-playfair text-lg font-bold text-ivory-100">{streak}-day Desire Streak</h3>
                        <p className="text-ivory-500 text-xs mt-0.5">Tap flame · Snapchat-style check-in · +2 pts daily</p>
                    </div>
                </div>
                <div className="flex gap-1.5 mt-4">
                    {MILESTONES.map(([d, reward], i) => {
                        const done = streak >= +d
                        const next = !done && (i === 0 || streak >= +MILESTONES[i - 1][0])
                        return (
                            <div key={d} className="flex-1 text-center">
                                <div className={`h-1 rounded-full ${done ? 'bg-crimson' : next ? 'bg-crimson/30' : 'bg-tryst-border'}`} />
                                <p className="font-mono text-[8px] text-ivory-600 mt-1.5">D{d}</p>
                                <p className="text-[8px] text-ivory-600">{reward}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Chemistry with matches */}
            {(home?.allChemistry?.length ?? 0) > 0 && (
                <div className="mb-4">
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-2 px-1">Chemistry</p>
                    <div className="space-y-2">
                        {home!.allChemistry!.map(c => (
                            <div key={c.partnerId} className="tryst-card p-3 flex items-center gap-3">
                                <ProfileAvatar seed={c.alias} src={c.avatarUrl} size={40} className="border border-crimson/40" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-ivory-300 text-sm truncate">{c.alias}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1 bg-tryst-border rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-crimson to-gold rounded-full" style={{ width: `${Math.min(c.score, 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-crimson-300 font-playfair">{c.score}%</span>
                                    </div>
                                </div>
                                <TrendingUp className="w-4 h-4 text-gold-400 shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Anonymous prompt replies */}
            {(home?.anonymousPrompts?.length ?? 0) > 0 && (
                <div className="mb-4">
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-2 px-1">Nearby voices · anonymous until match</p>
                    <div className="space-y-2">
                        {home!.anonymousPrompts!.map(p => (
                            <div key={p.id} className="tryst-card p-4">
                                <p className="text-ivory-400 text-xs mb-1 uppercase tracking-wider">{p.type} · hidden profile</p>
                                <p className="text-ivory-200 text-sm italic">&ldquo;{p.preview}&rdquo;</p>
                                <div className="flex items-center gap-3 mt-3">
                                    <button onClick={() => engagementApi.likePrompt(p.id).then(() => qc.invalidateQueries({ queryKey: ['engagement-home'] }))}
                                        className={`flex items-center gap-1 text-xs ${p.liked ? 'text-crimson-300' : 'text-ivory-500'}`}>
                                        <Heart className="w-3.5 h-3.5" /> {p.likeCount}
                                    </button>
                                    <button onClick={() => setReplyingTo(replyingTo === p.id ? null : p.id)}
                                        className="flex items-center gap-1 text-xs text-ivory-500">
                                        <MessageCircle className="w-3.5 h-3.5" /> {p.replyCount}
                                    </button>
                                </div>
                                {replyingTo === p.id && (
                                    <div className="flex gap-2 mt-2">
                                        <input value={replyText} onChange={e => setReplyText(e.target.value)}
                                            placeholder="Anonymous reply…" className="tryst-input flex-1 text-sm py-2" />
                                        <button onClick={async () => {
                                            await engagementApi.commentPrompt(p.id, replyText)
                                            setReplyText(''); setReplyingTo(null)
                                            qc.invalidateQueries({ queryKey: ['engagement-home'] })
                                        }} className="px-3 py-2 bg-crimson rounded-lg text-white text-sm">Send</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile visitors */}
            <div className="tryst-card p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="font-playfair text-ivory-100">Profile visitors</p>
                    <EyeOff className="w-4 h-4 text-ivory-600" />
                </div>
                {visitorsUnlocked ? (
                    <div className="space-y-2">
                        {visitorsUnlocked.map((v, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <ProfileAvatar seed={v.alias} src={v.avatarUrl} size={32} />
                                <span className="text-ivory-300 text-sm">{v.alias}</span>
                                <span className="text-ivory-600 text-xs ml-auto">{v.city}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <p className="text-ivory-500 text-sm mb-3">
                            <span className="font-bold text-ivory-300">{home?.profileVisitors?.count ?? 0}</span> people viewed you this week · hidden
                        </p>
                        <button onClick={() => unlockMut.mutate()} disabled={unlockMut.isPending || points < (home?.profileVisitors?.unlockCost ?? 15)}
                            className="w-full py-2.5 border border-gold/40 text-gold-300 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                            <Eye className="w-4 h-4" />
                            Reveal for {home?.profileVisitors?.unlockCost ?? 15} pts
                        </button>
                    </>
                )}
            </div>

            {/* Weekly pick */}
            <div className="tryst-card border-gold/30 mb-4 overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-3">
                    <p className="font-mono text-[9px] tracking-[0.18em] text-gold-400">✦ WEEKLY AI PICK</p>
                </div>
                <div className="flex gap-4 p-4 items-center">
                    {home?.weeklyPick ? (
                        <>
                            <div className="w-[72px] h-[90px] rounded-xl overflow-hidden border-2 border-gold flex-shrink-0">
                                <ProfileAvatar seed={home.weeklyPick.alias} src={home.weeklyPick.avatarUrl} size={90} blur={!isGold} className="!rounded-xl w-full h-full" />
                            </div>
                            <div className="flex-1">
                                {isGold ? (
                                    <>
                                        <h3 className="font-playfair text-lg text-ivory-100">{home.weeklyPick.alias}, {home.weeklyPick.age}</h3>
                                        <p className="text-ivory-500 text-xs mt-1">{home.weeklyPick.matchScore}% DesireIQ · {home.weeklyPick.city}</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-playfair text-lg text-ivory-100">Your pick is ready</h3>
                                        <p className="text-ivory-500 text-xs mt-1">Gold unlocks your highly compatible weekly match.</p>
                                    </>
                                )}
                                <Link href={isGold ? '/orbits' : '/gold'}
                                    className="inline-block mt-3 px-4 py-2 bg-gold-gradient text-black text-xs font-bold rounded-full">
                                    {isGold ? 'View pick' : 'Unlock pick'}
                                </Link>
                            </div>
                        </>
                    ) : (
                        <p className="text-ivory-500 text-sm p-2">Your weekly pick generates soon.</p>
                    )}
                </div>
            </div>

            {/* Diary */}
            <div className="tryst-card p-4 mb-4">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-2">Desire Diary</p>
                <p className="text-ivory-300 text-sm mb-3">{home?.diaryPrompt}</p>
                <textarea value={diary} onChange={e => { setDiary(e.target.value); setSaved(false) }}
                    placeholder="Two honest sentences..."
                    className="tryst-input min-h-[80px] resize-none text-sm mb-3" />
                <button onClick={async () => {
                    if (!diary.trim() || !home?.diaryPrompt) return
                    await diaryMut.mutateAsync({ prompt: home.diaryPrompt, answer: diary.trim() })
                    setSaved(true)
                }} disabled={!diary.trim() || diaryMut.isPending}
                    className="w-full py-2.5 bg-crimson-gradient text-white rounded-xl text-sm font-medium disabled:opacity-40">
                    {saved ? 'Saved ✓' : 'Save to diary'}
                </button>
            </div>

            {/* City moments */}
            <div className="mb-4">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-3 px-1">City Moments</p>
                <div className="flex gap-2 mb-3">
                    <input value={moment} onChange={e => setMoment(e.target.value)}
                        placeholder="Share a moment in your city..."
                        className="tryst-input flex-1 text-sm py-2" />
                    <button onClick={() => moment.trim() && momentMut.mutate(moment.trim())} disabled={!moment.trim() || momentMut.isPending}
                        className="w-10 h-10 rounded-xl bg-crimson flex items-center justify-center text-white flex-shrink-0">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-2">
                    {(home?.moments || []).map(m => (
                        <div key={m.id} className="tryst-card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ProfileAvatar seed={m.alias} src={m.avatarUrl} size={24} />
                                <span className="text-ivory-400 text-xs">{m.city}</span>
                            </div>
                            <p className="text-ivory-300 text-sm italic">&ldquo;{m.content}&rdquo;</p>
                        </div>
                    ))}
                </div>
            </div>

            {!isGold && (
                <Link href="/gold" className="tryst-card p-4 flex items-center gap-3 border-gold/30 hover:border-gold/50 transition-colors">
                    <Lock className="w-5 h-5 text-gold-400" />
                    <div className="flex-1">
                        <p className="font-playfair text-gold-400">Upgrade to Gold</p>
                        <p className="text-ivory-500 text-xs">Unlimited ignites, weekly picks & night mode perks</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gold-400" />
                </Link>
            )}

            <DisguisePickerModal open={showDisguisePicker} onClose={() => setShowDisguisePicker(false)} onSelect={activateDisguise} />
        </div>
    )
}
