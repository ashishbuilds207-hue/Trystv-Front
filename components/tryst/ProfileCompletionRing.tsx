'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { userApi } from '@/lib/api/auth'

export default function ProfileCompletionRing() {
    const { data } = useQuery({
        queryKey: ['profile-completion'],
        queryFn: async () => {
            const { data: res } = await userApi.getProfileCompletion()
            return res.data as {
                completion: { percent: number; filled: number; total: number; missing: string[] }
                dailyLikes: { remaining: number; limit: number; used: number; isGold: boolean }
            }
        },
        staleTime: 30 * 1000,
    })

    const percent = data?.completion?.percent ?? 0
    const missing = data?.completion?.missing ?? []
    const dailyLikes = data?.dailyLikes

    const circumference = 2 * Math.PI * 36
    const offset = circumference - (percent / 100) * circumference

    return (
        <div className="tryst-card p-5 mb-5">
            <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="36" fill="none" stroke="#2E1E1E" strokeWidth="6" />
                        <circle cx="40" cy="40" r="36" fill="none"
                            stroke="url(#grad)" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            className="transition-all duration-700" />
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#C0392B" />
                                <stop offset="100%" stopColor="#D4AF37" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-playfair text-xl font-bold text-ivory-100">{percent}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <p className="font-playfair text-lg text-ivory-100">Profile strength</p>
                    <p className="text-ivory-500 text-xs mt-0.5">
                        {data?.completion?.filled ?? 0}/{data?.completion?.total ?? 12} fields complete
                    </p>
                    {percent < 100 && missing.length > 0 && (
                        <p className="text-ivory-600 text-[10px] mt-1.5">
                            Add: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? '…' : ''}
                        </p>
                    )}
                    {percent < 80 && (
                        <Link href="/onboarding" className="text-crimson-300 text-xs mt-2 inline-block hover:underline">
                            Complete your profile →
                        </Link>
                    )}
                </div>
            </div>

            {dailyLikes && !dailyLikes.isGold && (
                <div className="mt-4 pt-4 border-t border-tryst-border flex items-center justify-between">
                    <div>
                        <p className="text-ivory-300 text-sm font-medium">Daily likes</p>
                        <p className="text-ivory-600 text-xs">{dailyLikes.remaining} of {dailyLikes.limit} remaining today</p>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: dailyLikes.limit }).map((_, i) => (
                            <div key={i} className={`w-2 h-6 rounded-full transition-colors ${
                                i < dailyLikes.used ? 'bg-crimson/80' : i < dailyLikes.used + dailyLikes.remaining ? 'bg-crimson/30' : 'bg-tryst-border'
                            }`} />
                        ))}
                    </div>
                    {dailyLikes.remaining === 0 && (
                        <Link href="/gold" className="text-gold-400 text-xs font-medium hover:underline ml-3">
                            Get Gold →
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
