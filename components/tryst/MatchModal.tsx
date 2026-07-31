'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, Sparkles, MessageCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { avatarUrl } from './ProfileAvatar'
import { useAuthUser } from '@/lib/hooks/useAuth'

function ConfettiBurst() {
    const pieces = useMemo(
        () =>
            Array.from({ length: 48 }, (_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                delay: Math.random() * 0.45,
                duration: 1.4 + Math.random() * 1.2,
                color: ['#C0392B', '#D4AF37', '#F6F1EA', '#922B21', '#E8C547', '#fff'][i % 6],
                rotate: Math.random() * 360,
                size: 6 + Math.random() * 8,
                x: (Math.random() - 0.5) * 220,
            })),
        [],
    )

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {pieces.map((p) => (
                <motion.span
                    key={p.id}
                    className="absolute top-1/3 rounded-sm"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size * 0.55,
                        background: p.color,
                    }}
                    initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
                    animate={{
                        opacity: [1, 1, 0],
                        y: [0, -40, 280],
                        x: [0, p.x * 0.4, p.x],
                        rotate: [0, p.rotate, p.rotate + 180],
                        scale: [1, 1.1, 0.6],
                    }}
                    transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                />
            ))}
        </div>
    )
}

export default function MatchModal() {
    const { showMatchAnimation, matchedProfile, dismissMatchAnimation } = useAppStore()
    const { data: me } = useAuthUser()

    useEffect(() => {
        if (!showMatchAnimation) return
        // Auto-dismiss after long celebration if user ignores
        const t = setTimeout(() => dismissMatchAnimation(), 14000)
        return () => clearTimeout(t)
    }, [showMatchAnimation, dismissMatchAnimation])

    if (!showMatchAnimation || !matchedProfile) return null

    const theirImg = avatarUrl(matchedProfile.alias, matchedProfile.avatarUrl)
    const myImg = avatarUrl(me?.alias || 'You', me?.avatarUrl)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={dismissMatchAnimation}
            />
            <ConfettiBurst />

            <motion.div
                className="relative bg-tryst-card border border-gold/40 rounded-3xl p-8 max-w-sm w-full text-center shadow-gold-lg overflow-hidden"
                initial={{ opacity: 0, scale: 0.86, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                <div className="absolute inset-0 pointer-events-none opacity-40"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.25), transparent 55%)' }}
                />

                <motion.div
                    className="relative mb-5"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                >
                    <Sparkles className="w-12 h-12 text-gold mx-auto animate-pulse" />
                </motion.div>

                <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-gold-400 mb-2">It&apos;s a match</p>
                <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-2">Party&apos;s on 🎉</h2>
                <p className="text-ivory-400 text-sm mb-7">
                    You and <span className="text-crimson-300 font-semibold">{matchedProfile.alias}</span> both felt it.
                </p>

                <div className="flex items-center justify-center gap-3 mb-8">
                    <motion.div
                        className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold shadow-gold"
                        initial={{ x: -40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                    >
                        <Image src={myImg} alt="You" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                    </motion.div>
                    <motion.div
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-crimson shadow-crimson"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                        <Heart className="w-5 h-5 text-white fill-white" />
                    </motion.div>
                    <motion.div
                        className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold shadow-gold"
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                    >
                        <Image src={theirImg} alt={matchedProfile.alias} width={80} height={80} className="object-cover w-full h-full" unoptimized />
                    </motion.div>
                </div>

                <div className="flex gap-3 relative z-10">
                    <button
                        type="button"
                        onClick={dismissMatchAnimation}
                        className="flex-1 py-3 border border-tryst-border text-ivory-400 rounded-xl hover:border-tryst-border-2 transition-all text-sm"
                    >
                        Keep exploring
                    </button>
                    <Link
                        href="/chat"
                        onClick={dismissMatchAnimation}
                        className="flex-1 tryst-button-primary py-3 rounded-xl text-sm text-center inline-flex items-center justify-center gap-1.5"
                    >
                        <MessageCircle className="w-4 h-4" /> Say hi
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
