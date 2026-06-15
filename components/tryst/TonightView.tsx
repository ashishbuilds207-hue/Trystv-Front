'use client'

import { useState } from 'react'
import { Flame, Moon, TrendingUp, Lock, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import {
    useEngagementHome, useStreakCheckIn, useSaveDiary, useCreateMoment,
} from '@/lib/hooks/useFeatures'
import { useAppStore } from '@/lib/store/useAppStore'
import ProfileAvatar from './ProfileAvatar'

const MILESTONES = [['3', 'Boost'], ['7', '+5 Ignites'], ['14', '1wk Gold'], ['30', 'Obsidian']]

export default function TonightView() {
    const { data: home, isLoading } = useEngagementHome()
    const streakMut = useStreakCheckIn()
    const diaryMut = useSaveDiary()
    const momentMut = useCreateMoment()
    const { isNightMode, toggleNightMode } = useAppStore()

    const [diary, setDiary] = useState('')
    const [saved, setSaved] = useState(false)
    const [moment, setMoment] = useState('')

    const night = isNightMode || home?.isNight
    const streak = home?.streak ?? 0
    const isGold = home?.isGold

    const handleStreak = () => streakMut.mutate()
    const handleDiary = async () => {
        if (!diary.trim() || !home?.diaryPrompt) return
        await diaryMut.mutateAsync({ prompt: home.diaryPrompt, answer: diary.trim() })
        setSaved(true)
    }
    const handleMoment = async () => {
        if (!moment.trim()) return
        await momentMut.mutateAsync(moment.trim())
        setMoment('')
    }

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="page-content pb-24 page-transition">
            <div className="flex items-center justify-between py-4 mb-2">
                <div>
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400">
                        {night ? 'After dark' : 'Good evening'}
                    </p>
                    <h1 className="font-playfair text-3xl text-ivory-100">{home?.alias}</h1>
                </div>
                <button onClick={toggleNightMode}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-mono tracking-wider transition-all ${
                        night ? 'bg-gold/10 border-gold/40 text-gold-400' : 'bg-tryst-card border-tryst-border text-ivory-500'
                    }`}>
                    <Moon className="w-4 h-4" /> {night ? 'NIGHT' : 'DAY'}
                </button>
            </div>

            {/* Streak */}
            <div className="tryst-card p-5 mb-4 relative overflow-hidden">
                <div className="flex items-center gap-4">
                    <button onClick={handleStreak} className="relative w-14 h-14 flex items-center justify-center">
                        <Flame className="w-12 h-12 text-crimson drop-shadow-[0_0_10px_rgba(192,57,43,0.6)]" fill="currentColor" />
                        <span className="absolute font-playfair text-lg text-white mt-1">{streak}</span>
                    </button>
                    <div className="flex-1">
                        <h3 className="font-playfair text-lg text-ivory-100">{streak}-day Desire Streak</h3>
                        <p className="text-ivory-500 text-xs mt-0.5">Tap flame to check in · <span className="text-gold-400">+5 Ignites</span> at day 7</p>
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

            {/* Chemistry */}
            {home?.chemistry && (
                <div className="tryst-card p-4 mb-4 flex items-center gap-4">
                    <ProfileAvatar seed={home.chemistry.alias} src={home.chemistry.avatarUrl} size={46} className="border-2 border-crimson" />
                    <div className="flex-1">
                        <p className="text-ivory-500 text-sm">Chemistry with <b className="text-ivory-200">{home.chemistry.alias}</b></p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-tryst-border rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-crimson to-gold rounded-full transition-all"
                                    style={{ width: `${Math.min(home.chemistry.score, 100)}%` }} />
                            </div>
                            <span className="font-playfair text-crimson-300">{home.chemistry.score}%</span>
                        </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
            )}

            {/* Diary */}
            <div className="tryst-card p-4 mb-4">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-2">Desire Diary</p>
                <p className="text-ivory-300 text-sm mb-3">{home?.diaryPrompt}</p>
                <textarea value={diary} onChange={e => { setDiary(e.target.value); setSaved(false) }}
                    placeholder="Two honest sentences..."
                    className="tryst-input min-h-[80px] resize-none text-sm mb-3" />
                <button onClick={handleDiary} disabled={!diary.trim() || diaryMut.isPending}
                    className="w-full py-2.5 bg-crimson-gradient text-white rounded-xl text-sm font-medium disabled:opacity-40">
                    {saved ? 'Saved ✓' : 'Save to diary'}
                </button>
            </div>

            {/* Moments */}
            <div className="mb-4">
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold-400 mb-3 px-1">City Moments</p>
                <div className="flex gap-2 mb-3">
                    <input value={moment} onChange={e => setMoment(e.target.value)}
                        placeholder="Share a moment in your city..."
                        className="tryst-input flex-1 text-sm py-2" />
                    <button onClick={handleMoment} disabled={!moment.trim() || momentMut.isPending}
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
                    <div>
                        <p className="font-playfair text-gold-400">Upgrade to Gold</p>
                        <p className="text-ivory-500 text-xs">Unlimited ignites, weekly picks & night mode perks</p>
                    </div>
                </Link>
            )}
        </div>
    )
}
