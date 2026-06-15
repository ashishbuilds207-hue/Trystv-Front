'use client'

import { Moon, BookOpen, Sun, Cloud, TrendingUp, TrendingDown, Clock, Star } from 'lucide-react'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import { useTripleTap } from '@/lib/hooks/useTripleTap'
import { DisguiseShell } from './DisguiseShell'
import { getDisguiseDates } from './disguiseDates'

type SkinProps = { alias?: string; onReveal: () => void }

function ReturnHint({ where }: { where: string }) {
    return (
        <p className="text-center text-[7.5px] tracking-[0.14em] uppercase opacity-35 mt-1 select-none">
            Tap {where} 3× to return
        </p>
    )
}

function Ripple({ show, className }: { show: boolean; className?: string }) {
    if (!show) return null
    return <div className={`absolute rounded-full border animate-pulse-ring pointer-events-none ${className}`} />
}

export function NewspaperSkin({ alias, onReveal }: SkinProps) {
    const { tap, ripple } = useTripleTap(onReveal)
    const d = getDisguiseDates()

    const headlines = [
        { section: 'Markets', title: 'Sensex gains 214 pts as IT and banking stocks rally', time: d.rel(0), read: '4 min' },
        { section: 'Property', title: 'Sea-facing Mumbai inventory tightens on renewed NRI demand', time: d.rel(0), read: '6 min' },
        { section: 'Tech', title: 'AI startups raise record seed rounds in Bengaluru and Hyderabad', time: d.rel(1), read: '5 min' },
        { section: 'Lifestyle', title: 'Five rooftop bars redefining after-hours conversation', time: d.rel(1), read: '3 min' },
        { section: 'Travel', title: 'Slow-travel west coast itinerary quietly trending this season', time: d.rel(2), read: '7 min' },
        { section: 'Wellness', title: 'Sleep clinics report surge in executive burnout consultations', time: d.rel(2), read: '4 min' },
        { section: 'Food', title: 'Regional grain bowls dominate urban lunch menus', time: d.rel(3), read: '3 min' },
        { section: 'Culture', title: 'Independent bookstores see revival among young professionals', time: d.rel(4), read: '5 min' },
    ]

    return (
        <DisguiseShell className="bg-[#f3efe6] text-[#1a1815] font-serif" bg="#f3efe6">
            <div className="pt-10 sm:pt-12">
                <button type="button" onClick={tap} className="relative w-full text-center border-b-[3px] border-double border-[#1a1815] pb-3 mb-1 cursor-pointer">
                    <Ripple show={ripple} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-[#999]" />
                    <p className="text-[9px] tracking-[0.3em] uppercase mb-1.5">Business &amp; Lifestyle Edition</p>
                    <h1 className="font-playfair text-[26px] sm:text-[32px] font-bold leading-tight">The Morning Herald</h1>
                    <div className="text-[9.5px] tracking-wider mt-2 flex flex-wrap justify-between gap-2 border-t border-[#1a1815] pt-1.5 px-1">
                        <span>{d.long}</span>
                        <span>No. {d.issueNo.toLocaleString()}</span>
                        <span>Updated {d.time}</span>
                    </div>
                </button>
                <ReturnHint where="masthead" />

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-inter text-[11px] border border-[#1a1815]/20 rounded-lg p-3 bg-white/40">
                    <div><span className="text-[#9a3b2e] font-semibold">Mumbai</span><br />28°C · Haze</div>
                    <div><span className="text-[#9a3b2e] font-semibold">Sensex</span><br />▲ 73,842 (+0.29%)</div>
                    <div><span className="text-[#9a3b2e] font-semibold">USD/INR</span><br />83.42</div>
                    <div><span className="text-[#9a3b2e] font-semibold">Gold 24K</span><br />₹7,240/g</div>
                </div>

                <p className="text-[10px] tracking-[0.16em] uppercase text-[#9a3b2e] mt-6 mb-1.5">Lead story · {d.short}</p>
                <h2 className="font-playfair text-[22px] sm:text-[28px] font-bold leading-tight mb-3 max-w-3xl">
                    {alias || 'Seraphine K.'}: On The Art Of The Quiet Room
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="w-28 h-28 rounded-full overflow-hidden border border-[#1a1815] flex-shrink-0 grayscale contrast-105 mx-auto sm:mx-0">
                        <ProfileAvatar seed={alias || 'Seraphine'} size={112} className="!rounded-full" />
                    </div>
                    <p className="text-[13.5px] sm:text-[15px] leading-relaxed text-justify flex-1">
                        In an era of constant notifications, professionals are redesigning their evenings around silence.
                        From late-evening strategy sessions to weekend travel along the western coast, colleagues describe
                        a rare combination of precision and warmth. &ldquo;The quiet room isn&apos;t escape,&rdquo; she notes.
                        &ldquo;It&apos;s where the best decisions are made.&rdquo;
                    </p>
                </div>

                <p className="text-[10px] tracking-[0.16em] uppercase text-[#9a3b2e] mb-3">Today&apos;s headlines</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {headlines.map(h => (
                        <article key={h.title} className="border-t border-[#1a1815]/30 pt-3">
                            <p className="text-[9px] tracking-wider uppercase text-[#9a3b2e] mb-1">{h.section}</p>
                            <p className="font-playfair text-sm sm:text-base font-bold leading-snug mb-2">{h.title}</p>
                            <p className="font-inter text-[10px] text-[#777]">{h.time} · {h.read} read</p>
                        </article>
                    ))}
                </div>

                <div className="border-t border-[#1a1815] pt-4 grid sm:grid-cols-2 gap-6 mb-4">
                    <div>
                        <p className="text-[9px] tracking-wider uppercase text-[#9a3b2e] mb-2">Opinion</p>
                        <p className="font-playfair font-bold text-lg leading-snug">Why hybrid work is reshaping suburban property demand</p>
                        <p className="text-xs text-[#777] mt-1 font-inter">By Editorial Board · {d.rel(0)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] tracking-wider uppercase text-[#9a3b2e] mb-2">Weekend</p>
                        <p className="font-playfair font-bold text-lg leading-snug">Twelve gallery openings worth your Saturday afternoon</p>
                        <p className="text-xs text-[#777] mt-1 font-inter">Weekend desk · {d.short}</p>
                    </div>
                </div>

                <p className="border-t border-[#1a1815] pt-3 text-[9px] tracking-wider text-center text-[#777]">
                    8 UNREAD ARTICLES · SUBSCRIBER EDITION · {d.long}
                </p>
            </div>
        </DisguiseShell>
    )
}

export function FinanceSkin({ onReveal }: SkinProps) {
    const { tap, ripple } = useTripleTap(onReveal)
    const d = getDisguiseDates()
    const spend = [42, 68, 55, 38, 92, 48, 61]
    const max = Math.max(...spend)

    const tx = [
        ['Greenleaf Grocers', 'Groceries', '−₹2,140', 0],
        ['Salary · Acme Corp', 'Income', '+₹1,84,000', 2],
        ['Metro Transit', 'Transport', '−₹560', 0],
        ['Aria Coffee', 'Dining', '−₹420', 0],
        ['Equity SIP', 'Investment', '−₹15,000', 1],
        ['Amazon India', 'Shopping', '−₹3,280', 0],
        ['Electricity Bill', 'Utilities', '−₹1,890', 3],
        ['Freelance · Design', 'Income', '+₹28,500', 4],
        ['Pharmacy', 'Health', '−₹640', 1],
        ['Netflix', 'Subscriptions', '−₹649', 5],
    ] as const

    const budgets = [
        ['Dining out', 8200, 12000],
        ['Groceries', 11400, 15000],
        ['Transport', 3200, 5000],
        ['Shopping', 6800, 8000],
    ] as const

    return (
        <DisguiseShell className="bg-[#f4f6f3] text-[#13241c] font-inter" bg="#f4f6f3">
            <div className="pt-10 sm:pt-12">
                <button type="button" onClick={tap} className="relative flex items-center gap-2.5 mb-1 w-full text-left">
                    <Ripple show={ripple} className="left-3.5 top-3.5 w-12 h-12 border-[#2f6f4f]" />
                    <div className="w-9 h-9 rounded-lg bg-[#1f8a5b] flex items-center justify-center text-white font-extrabold text-base">L</div>
                    <div>
                        <span className="text-lg font-bold block">LedgerPro</span>
                        <span className="text-[10px] text-[#5b7569]">{d.greet} · {d.short}</span>
                    </div>
                    <span className="ml-auto text-[11px] text-[#5b7569]">{d.monthYear}</span>
                </button>
                <ReturnHint where="logo" />

                <div className="bg-gradient-to-br from-[#1f8a5b] to-[#136b44] rounded-[18px] p-5 sm:p-6 text-white mt-4 shadow-lg">
                    <p className="text-[11px] opacity-85 tracking-wide">TOTAL BALANCE · {d.rel(0)}</p>
                    <p className="text-[30px] sm:text-[38px] font-extrabold mt-1.5">₹6,42,180</p>
                    <div className="flex flex-wrap gap-4 mt-3.5 text-xs">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Income ₹2.12L this month</span>
                        <span className="opacity-85 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Spend ₹49,320</span>
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    {[
                        ['Savings goal', '₹4.2L / ₹6L', '70%'],
                        ['Emergency fund', '₹1.8L', 'On track'],
                        ['Investments', '₹12.4L', '▲ 8.2% YTD'],
                    ].map(([l, v, s]) => (
                        <div key={l} className="bg-white rounded-xl p-3.5 border border-[#13241c]/8">
                            <p className="text-[10px] text-[#8aa295] uppercase tracking-wide">{l}</p>
                            <p className="text-base font-bold mt-1">{v}</p>
                            <p className="text-[11px] text-[#1f8a5b] mt-0.5">{s}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#13241c]/10 mt-4 mb-4">
                    <p className="text-sm font-semibold mb-1">Weekly spending</p>
                    <p className="text-[10px] text-[#8aa295] mb-3">Week of {d.weekDays[0].date} – {d.weekDays[6].date} {d.monthYear.split(' ')[0]}</p>
                    <div className="flex items-end gap-1.5 sm:gap-2 h-28">
                        {spend.map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className="w-full rounded-t-md transition-all" style={{
                                    height: `${(v / max) * 88}px`,
                                    background: d.weekDays[i]?.isToday ? '#1f8a5b' : '#bfe0cf',
                                }} />
                                <span className={`text-[9px] ${d.weekDays[i]?.isToday ? 'text-[#1f8a5b] font-bold' : 'text-[#8aa295]'}`}>
                                    {d.weekDays[i]?.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-sm font-semibold mb-2">Budgets · {d.monthYear}</p>
                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                    {budgets.map(([name, spent, cap]) => (
                        <div key={name} className="bg-white rounded-xl p-3.5 border border-[#13241c]/8">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">{name}</span>
                                <span className="text-[#8aa295]">₹{spent.toLocaleString()} / ₹{cap.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#eef4f0] overflow-hidden">
                                <div className="h-full bg-[#1f8a5b] rounded-full" style={{ width: `${Math.min(100, (spent / cap) * 100)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-sm font-semibold mb-2">Recent transactions</p>
                <div className="bg-white rounded-2xl px-4 py-1 border border-[#13241c]/10">
                    {tx.map(([name, cat, amt, daysAgo], i) => (
                        <div key={name} className={`flex items-center gap-3 py-3.5 ${i < tx.length - 1 ? 'border-b border-[#13241c]/5' : ''}`}>
                            <div className="w-9 h-9 rounded-[10px] bg-[#eef4f0] flex items-center justify-center text-sm font-bold text-[#1f8a5b]">₹</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-semibold truncate">{name}</p>
                                <p className="text-[11px] text-[#8aa295]">{cat} · {d.rel(daysAgo)}</p>
                            </div>
                            <p className={`text-[13px] font-bold flex-shrink-0 ${amt.startsWith('+') ? 'text-[#1f8a5b]' : ''}`}>{amt}</p>
                        </div>
                    ))}
                </div>
            </div>
        </DisguiseShell>
    )
}

export function MindfulSkin({ onReveal }: SkinProps) {
    const { tap, ripple } = useTripleTap(onReveal)
    const d = getDisguiseDates()

    const sessions = [
        ['Deep Sleep', '12 min', 'Sleep', Moon],
        ['Anxiety Release', '8 min', 'Calm', Cloud],
        ['Morning Clarity', '10 min', 'Focus', Sun],
        ['Body Scan', '15 min', 'Relax', Moon],
        ['Gratitude', '6 min', 'Mood', Sun],
        ['Midday Reset', '5 min', 'Break', Cloud],
    ] as const

    const journal = [
        ['Felt centred after morning walk', d.rel(0)],
        ['Work stress — breathing helped', d.rel(1)],
        ['Slept 7h, mood improved', d.rel(2)],
        ['Grateful for quiet evening', d.rel(3)],
    ] as const

    const moods = [3, 4, 3, 5, 4, 4, 5]

    return (
        <DisguiseShell className="bg-gradient-to-b from-[#eef1f6] to-[#dfe6f1] text-[#23304a] font-inter" bg="linear-gradient(180deg, #eef1f6, #dfe6f1)">
            <div className="pt-10 sm:pt-12 flex flex-col">
                <button type="button" onClick={tap} className="relative text-center w-full">
                    <Ripple show={ripple} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border-[#6b85b8]" />
                    <p className="text-[22px] font-semibold tracking-wide">Stillwell</p>
                    <p className="text-[11px] text-[#6b7894] mt-1">{d.greet} — {d.long}</p>
                </button>
                <ReturnHint where="title" />

                <div className="grid sm:grid-cols-3 gap-3 mt-5 mb-5">
                    {[
                        ['Day streak', '14 days', 'Personal best'],
                        ['Minutes today', '22 min', d.rel(0)],
                        ['Sessions', '47 total', 'This month'],
                    ].map(([l, v, s]) => (
                        <div key={l} className="bg-white/70 rounded-xl p-3.5 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-[#6b7894]">{l}</p>
                            <p className="text-xl font-semibold mt-1">{v}</p>
                            <p className="text-[10px] text-[#6b7894] mt-0.5">{s}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-5 py-6 mb-4">
                    <div className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex items-center justify-center">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="absolute inset-0 rounded-full border border-[#6b85b8]/40 animate-breathe"
                                style={{ animationDelay: `${i * 0.6}s` }} />
                        ))}
                        <div className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-full bg-gradient-to-br from-[#aebfe0] to-[#7d96c8] flex items-center justify-center text-white text-[15px] font-medium animate-breathe shadow-lg">
                            Breathe in
                        </div>
                    </div>
                    <p className="text-[28px] sm:text-[30px] font-light tracking-widest tabular-nums">04:32</p>
                    <p className="text-xs text-[#6b7894]">Evening Calm · Session 3 of 7 · {d.time}</p>
                </div>

                <p className="text-sm font-semibold mb-2">This week&apos;s mood</p>
                <div className="flex gap-2 mb-5 bg-white/60 rounded-xl p-3">
                    {d.weekDays.map((day, i) => (
                        <div key={day.label} className="flex-1 text-center">
                            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${day.isToday ? 'bg-[#6b85b8] text-white' : 'bg-[#cdd9ef] text-[#5a73a8]'}`}>
                                {moods[i]}
                            </div>
                            <span className="text-[9px] text-[#6b7894]">{day.label}</span>
                        </div>
                    ))}
                </div>

                <p className="text-sm font-semibold mb-2">Recommended sessions</p>
                <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
                    {sessions.map(([t, dur, tag, Icon]) => (
                        <div key={t} className="flex items-center gap-3 bg-white/70 rounded-[14px] p-3.5">
                            <div className="w-9 h-9 rounded-full bg-[#cdd9ef] flex items-center justify-center">
                                <Icon className="w-4 h-4 text-[#5a73a8]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{t}</p>
                                <p className="text-[10px] text-[#6b7894]">{tag}</p>
                            </div>
                            <p className="text-xs text-[#6b7894] flex items-center gap-1"><Clock className="w-3 h-3" />{dur}</p>
                        </div>
                    ))}
                </div>

                <p className="text-sm font-semibold mb-2">Journal</p>
                <div className="space-y-2">
                    {journal.map(([note, when]) => (
                        <div key={note} className="bg-white/60 rounded-xl px-4 py-3 text-sm">
                            <p>{note}</p>
                            <p className="text-[10px] text-[#6b7894] mt-1">{when}</p>
                        </div>
                    ))}
                </div>
            </div>
        </DisguiseShell>
    )
}

export function ReadSkin({ onReveal }: SkinProps) {
    const { tap, ripple } = useTripleTap(onReveal)
    const d = getDisguiseDates()

    const books = [
        ['The Quiet Room', 'A. Sereno', 72, '#c0392b', 'Fiction'],
        ['Architecture of Desire', 'M. Halcyon', 38, '#2f6f4f', 'Design'],
        ['Letters at Midnight', 'I. Solstice', 91, '#8a5a2b', 'Romance'],
        ['On Slow Cities', 'N. Ferro', 12, '#3a5a8a', 'Travel'],
        ['The Art of Discretion', 'V. Sable', 55, '#6b3a8a', 'Essays'],
        ['Collected Silences', 'R. Morrow', 24, '#5a4a3a', 'Poetry'],
        ['Night Trains East', 'K. Voss', 67, '#2a5a6a', 'Thriller'],
        ['Salt & Signal', 'L. Priya', 44, '#8a4a2a', 'Memoir'],
    ] as const

    return (
        <DisguiseShell className="bg-[#f6f1e9] text-[#2a211a] font-serif" bg="#f6f1e9">
            <div className="pt-10 sm:pt-12">
                <button type="button" onClick={tap} className="relative flex items-center gap-2.5 w-full text-left">
                    <Ripple show={ripple} className="left-3.5 top-3 w-12 h-12 border-[#b09575]" />
                    <BookOpen className="w-6 h-6 text-[#8a5a2b]" />
                    <div>
                        <span className="text-[22px] font-bold block">ReadStack</span>
                        <span className="text-[11px] text-[#8a7c6b] font-inter">{d.greet} · {d.short}</span>
                    </div>
                </button>
                <ReturnHint where="logo" />

                <div className="grid grid-cols-3 gap-3 mt-5 mb-6 font-inter">
                    {[
                        ['Reading', '4h 12m', 'This week'],
                        ['Books', '8 active', 'In library'],
                        ['Finished', '3', d.monthYear],
                    ].map(([l, v, s]) => (
                        <div key={l} className="bg-white/60 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-[#8a7c6b] uppercase">{l}</p>
                            <p className="text-lg font-bold mt-0.5">{v}</p>
                            <p className="text-[9px] text-[#8a7c6b]">{s}</p>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-[#8a7c6b] font-inter mb-3">Currently reading · updated {d.rel(0)}</p>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {books.map(([title, author, prog, c, genre]) => (
                        <div key={title} className="flex gap-3.5 items-center bg-white/40 rounded-xl p-3">
                            <div className="w-[52px] h-[72px] rounded flex-shrink-0 shadow-md flex flex-col justify-end p-1.5 text-white text-[7px] font-inter"
                                style={{ background: c }}>
                                <span className="opacity-80">{genre}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-bold leading-tight">{title}</p>
                                <p className="text-[11px] text-[#8a7c6b] font-inter mt-0.5">{author} · {prog}%</p>
                                <div className="h-1 rounded-sm bg-[#2a211a]/10 mt-2 overflow-hidden">
                                    <div className="h-full" style={{ width: `${prog}%`, background: c }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 rounded-xl bg-[#8a5a2b]/10 font-inter mb-4">
                    <p className="text-[10px] tracking-wider uppercase text-[#8a5a2b] mb-1">New recommendation · {d.short}</p>
                    <p className="text-sm font-semibold font-serif">&ldquo;The Glass Orchard&rdquo; — because you enjoyed The Quiet Room</p>
                </div>

                <p className="text-xs font-inter text-[#8a7c6b]">Audiobooks in progress: 2 · Last synced {d.time}</p>
            </div>
        </DisguiseShell>
    )
}

export function RecipeSkin({ onReveal }: SkinProps) {
    const { tap, ripple } = useTripleTap(onReveal)
    const d = getDisguiseDates()

    const mealPlan = d.weekDays.map((day, i) => ({
        day: day.label,
        date: day.date,
        isToday: day.isToday,
        meal: ['Dal & rice bowl', 'Saffron risotto', 'Thai basil stir-fry', 'Paneer tikka wrap', 'Miso salmon', 'Shakshuka', 'Slow lamb biryani'][i],
    }))

    const recipes = [
        { name: 'Saffron Midnight Risotto', time: '35 min', serves: 2, rating: 4.8, tag: 'Tonight' },
        { name: 'Charred Broccoli Tahini', time: '20 min', serves: 4, rating: 4.6, tag: 'Quick' },
        { name: 'Cardamom French Toast', time: '15 min', serves: 2, rating: 4.9, tag: 'Brunch' },
    ]

    const shopping = [
        'Arborio rice · 1 cup',
        'Saffron threads · pinch',
        'Vegetable stock · 4 cups',
        'White wine · ½ cup',
        'Parmesan · 80g',
        'Cherry tomatoes · 200g',
        'Fresh basil · 1 bunch',
    ]

    return (
        <DisguiseShell className="bg-[#fbf4ec] text-[#3a1f12] font-serif" bg="#fbf4ec">
            <div className="pt-10 sm:pt-12">
                <button type="button" onClick={tap} className="relative flex items-center gap-2.5 w-full text-left">
                    <Ripple show={ripple} className="left-8 top-12 w-11 h-11 border-[#c98a5a]" />
                    <div className="w-9 h-9 rounded-lg bg-[#c0392b] flex items-center justify-center text-white font-extrabold">R</div>
                    <div>
                        <span className="text-xl font-bold block">RecipeVault</span>
                        <span className="text-[11px] text-[#7a5a48] font-inter">{d.greet} · Meal plan for {d.short}</span>
                    </div>
                </button>
                <ReturnHint where="logo" />

                <p className="text-sm font-bold mt-5 mb-3 font-inter">This week&apos;s meals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6 font-inter">
                    {mealPlan.map(m => (
                        <div key={m.day} className={`rounded-xl p-2.5 text-center text-[11px] border ${m.isToday ? 'bg-[#c0392b]/10 border-[#c0392b]/40' : 'bg-white/50 border-[#3a1f12]/8'}`}>
                            <p className={`font-bold ${m.isToday ? 'text-[#c0392b]' : ''}`}>{m.day} {m.date}</p>
                            <p className="text-[10px] text-[#7a5a48] mt-1 leading-tight">{m.meal}</p>
                        </div>
                    ))}
                </div>

                <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-200 to-orange-400 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#281208]/75 via-transparent to-transparent" />
                    <div className="absolute left-4 sm:left-6 bottom-4 text-white">
                        <p className="text-[10px] tracking-wider uppercase font-inter opacity-90">Featured · {d.rel(0)}</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5">Saffron Midnight Risotto</p>
                        <p className="text-xs font-inter mt-1 opacity-90">⏱ 35 min · 🍽 Serves 2 · ★ 4.8</p>
                    </div>
                </div>

                <p className="text-sm font-bold mb-3 font-inter">More recipes</p>
                <div className="grid sm:grid-cols-3 gap-3 mb-6 font-inter">
                    {recipes.map(r => (
                        <div key={r.name} className="bg-white/60 rounded-xl p-3.5 border border-[#3a1f12]/8">
                            <span className="text-[9px] uppercase tracking-wide text-[#c0392b] font-semibold">{r.tag}</span>
                            <p className="font-bold text-sm mt-1 leading-snug">{r.name}</p>
                            <p className="text-[11px] text-[#7a5a48] mt-2 flex items-center gap-2">
                                <Clock className="w-3 h-3" />{r.time} · Serves {r.serves}
                            </p>
                            <p className="text-[11px] text-[#7a5a48] flex items-center gap-1 mt-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.rating}</p>
                        </div>
                    ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[15px] font-bold mb-2">Shopping list</p>
                        {shopping.map(s => (
                            <div key={s} className="flex items-center gap-2.5 py-2 font-inter text-[13px] border-b border-[#3a1f12]/5">
                                <span className="w-4 h-4 rounded border-[1.5px] border-[#c98a5a] flex-shrink-0" />
                                {s}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-[15px] font-bold mb-2">Method</p>
                        <p className="text-[13.5px] leading-relaxed text-[#5a3f2e] font-inter">
                            Warm the stock low and slow. Toast the rice until it sings, then add wine.
                            Ladle stock one cup at a time, stirring like a slow conversation, until creamy.
                            Finish with parmesan and a thread of saffron. Rest two minutes before serving.
                        </p>
                        <p className="text-[10px] text-[#7a5a48] font-inter mt-4">Saved {d.rel(2)} · Last cooked {d.rel(5)}</p>
                    </div>
                </div>
            </div>
        </DisguiseShell>
    )
}

export const SKIN_COMPONENTS = {
    newspaper: NewspaperSkin,
    finance: FinanceSkin,
    mindful: MindfulSkin,
    read: ReadSkin,
    recipe: RecipeSkin,
} as const

export type DisguiseSkinId = keyof typeof SKIN_COMPONENTS
