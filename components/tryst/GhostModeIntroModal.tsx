'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Ghost, EyeOff, WifiOff, Shield, X, Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { scrollAppToTop } from '@/lib/scroll'

const INTRO_STEPS = [
    {
        icon: Ghost,
        title: 'What is Ghost Mode?',
        body: 'Browse TRYST without leaving a footprint. When Ghost is on, you stay private — others won’t see you as online or discover you the usual way.',
    },
    {
        icon: EyeOff,
        title: 'You’re hidden from discovery',
        body: 'Your profile is kept out of Tonight and Orbits feeds while Ghost Mode is active. You can still look around on your terms.',
    },
    {
        icon: WifiOff,
        title: 'No online presence',
        body: 'Your online status goes quiet. Matches won’t see a live “online” badge from you until you turn Ghost Mode off.',
    },
    {
        icon: Shield,
        title: 'You’re in control',
        body: 'Turn Ghost Mode on or off anytime from the Ghost button. Nothing changes until you choose to enable it.',
    },
] as const

interface Props {
    open: boolean
    onClose: () => void
    onEnable: () => void | Promise<void>
}

export default function GhostModeIntroModal({ open, onClose, onEnable }: Props) {
    const markGhostIntroSeen = useAppStore((s) => s.markGhostIntroSeen)
    const [step, setStep] = useState(0)
    const [mounted, setMounted] = useState(false)
    const [enabling, setEnabling] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => setMounted(true), [])

    useEffect(() => {
        if (!open) return
        setStep(0)
        setEnabling(false)
        scrollAppToTop('auto')

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const t = requestAnimationFrame(() => {
            modalRef.current?.scrollTo({ top: 0, behavior: 'auto' })
        })

        return () => {
            cancelAnimationFrame(t)
            document.body.style.overflow = prevOverflow
        }
    }, [open])

    if (!open || !mounted) return null

    const current = INTRO_STEPS[step]
    const StepIcon = current.icon
    const isLast = step >= INTRO_STEPS.length - 1

    const finishAndEnable = async () => {
        if (enabling) return
        setEnabling(true)
        markGhostIntroSeen()
        try {
            await onEnable()
        } finally {
            setEnabling(false)
            onClose()
        }
    }

    const skipIntro = () => {
        void finishAndEnable()
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Ghost Mode intro"
        >
            <button
                type="button"
                className="absolute inset-0 z-0 bg-black/80 backdrop-blur-[2px]"
                aria-label="Close"
                onClick={onClose}
            />

            <motion.div
                ref={modalRef}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 bg-tryst-card border border-tryst-border rounded-2xl w-full max-w-md max-h-[min(88vh,640px)] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-gold/10 to-transparent pointer-events-none rounded-t-2xl" />

                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-tryst-card-2 border border-tryst-border flex items-center justify-center text-ivory-500 hover:text-ivory-200"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative p-6 pt-8">
                    <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-gold-400 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        First time · Step {step + 1} of {INTRO_STEPS.length}
                    </p>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.22 }}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 shadow-[0_0_24px_-8px_rgba(212,175,55,0.45)]">
                                <StepIcon className="w-7 h-7 text-gold-400" />
                            </div>
                            <h3 className="font-playfair text-xl text-ivory-100 mb-2 pr-8">{current.title}</h3>
                            <p className="text-ivory-500 text-sm leading-relaxed mb-6">{current.body}</p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex gap-1.5 mb-6">
                        {INTRO_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                    i <= step ? 'bg-gold-400' : 'bg-tryst-border'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => setStep((s) => s - 1)}
                                className="flex-1 py-3 rounded-xl border border-tryst-border text-ivory-400 text-sm hover:bg-tryst-card-2 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={enabling}
                            onClick={() => (isLast ? void finishAndEnable() : setStep((s) => s + 1))}
                            className="flex-1 py-3 rounded-xl bg-gold/90 text-tryst-bg text-sm font-semibold hover:bg-gold disabled:opacity-60 transition-colors"
                        >
                            {isLast ? (enabling ? 'Enabling…' : 'Turn Ghost Mode on') : 'Next'}
                        </button>
                    </div>

                    <button
                        type="button"
                        disabled={enabling}
                        onClick={() => void skipIntro()}
                        className="w-full mt-3 text-[11px] text-ivory-600 hover:text-ivory-400 transition-colors"
                    >
                        Skip intro & enable
                    </button>

                    <p className="mt-4 text-center text-[10px] text-ivory-600 leading-relaxed">
                        Ghost stays off until you enable it. You can turn it off anytime.
                    </p>
                </div>
            </motion.div>
        </div>,
        document.body,
    )
}
