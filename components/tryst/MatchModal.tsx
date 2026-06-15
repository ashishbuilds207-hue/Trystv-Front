'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, Zap } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { avatarUrl } from './ProfileAvatar'

export default function MatchModal() {
    const { showMatchAnimation, matchedProfile, dismissMatchAnimation } = useAppStore()
    if (!showMatchAnimation || !matchedProfile) return null

    const img = avatarUrl(matchedProfile.alias, matchedProfile.avatarUrl)

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-tryst-card border border-gold/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-gold-lg match-animate">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="absolute w-2 h-2 bg-gold rounded-full animate-spark"
                                style={{ transform: `rotate(${i * 45}deg) translateX(60px)`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                    <Zap className="w-16 h-16 text-gold mx-auto animate-heartbeat" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400 mb-2">It&apos;s a TRYST!</p>
                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Connection ignited</h2>
                <p className="text-ivory-400 text-sm mb-6">
                    You and <span className="text-crimson-300 font-semibold">{matchedProfile.alias}</span> felt the spark.
                </p>
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold">
                        <Image src={img} alt={matchedProfile.alias} width={80} height={80} className="object-cover" unoptimized />
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-crimson shadow-crimson">
                        <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold">
                        <Image src={img} alt={matchedProfile.alias} width={80} height={80} className="object-cover" unoptimized />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={dismissMatchAnimation}
                        className="flex-1 py-3 border border-tryst-border text-ivory-400 rounded-xl hover:border-tryst-border-2 transition-all text-sm">
                        Keep exploring
                    </button>
                    <Link href="/chat" onClick={dismissMatchAnimation}
                        className="flex-1 tryst-button-primary py-3 rounded-xl text-sm text-center">
                        Say something
                    </Link>
                </div>
            </div>
        </div>
    )
}
