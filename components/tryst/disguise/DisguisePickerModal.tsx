'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    EyeOff, ChevronRight, X, Shield, Newspaper, Wallet, Brain,
    BookOpen, ChefHat, Hand, Layers, MousePointerClick,
} from 'lucide-react'
import { DISGUISE_SKIN_META } from './skinMeta'
import type { DisguiseSkinId } from './skins'
import { useAppStore } from '@/lib/store/useAppStore'
import { scrollAppToTop } from '@/lib/scroll'

const SKIN_ICONS: Record<string, typeof Newspaper> = {
    newspaper: Newspaper,
    finance: Wallet,
    mindful: Brain,
    read: BookOpen,
    recipe: ChefHat,
}

const INTRO_STEPS = [
    {
        icon: Shield,
        title: 'What is Disguise Mode?',
        body: 'TRYST vanishes behind a normal-looking app — news, finance, meditation, books, or recipes. Anyone glancing at your screen will not know you are on a dating app.',
    },
    {
        icon: Layers,
        title: 'Pick your cover',
        body: 'Choose one of five innocent skins. Each looks like a real app you might already have on your phone.',
    },
    {
        icon: MousePointerClick,
        title: 'How to come back',
        body: 'Triple-tap the top header or logo on the disguise screen. There is no obvious exit button — that is intentional.',
    },
    {
        icon: Hand,
        title: 'Switch anytime',
        body: 'Use the small app icons at the bottom to jump between disguises without leaving cover.',
    },
] as const

interface Props {
    open: boolean
    onClose: () => void
    onSelect: (skinId: DisguiseSkinId) => void
}

export default function DisguisePickerModal({ open, onClose, onSelect }: Props) {
    const { hasSeenDisguiseIntro, markDisguiseIntroSeen } = useAppStore()
    const [phase, setPhase] = useState<'intro' | 'pick'>('intro')
    const [introStep, setIntroStep] = useState(0)
    const [mounted, setMounted] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => setMounted(true), [])

    const scrollModalTop = () => {
        modalRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    }

    useEffect(() => {
        if (!open) return

        scrollAppToTop('auto')
        setPhase(hasSeenDisguiseIntro ? 'pick' : 'intro')
        setIntroStep(0)

        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const t1 = requestAnimationFrame(() => {
            scrollAppToTop('auto')
            scrollModalTop()
        })
        const t2 = window.setTimeout(() => {
            scrollAppToTop('auto')
            scrollModalTop()
        }, 50)

        return () => {
            cancelAnimationFrame(t1)
            window.clearTimeout(t2)
            document.body.style.overflow = prevOverflow
        }
    }, [open, hasSeenDisguiseIntro])

    useEffect(() => {
        if (!open) return
        scrollModalTop()
    }, [open, phase, introStep])

    if (!open || !mounted) return null

    const finishIntro = () => {
        markDisguiseIntroSeen()
        setPhase('pick')
        scrollAppToTop('auto')
        requestAnimationFrame(scrollModalTop)
    }

    const step = INTRO_STEPS[introStep]
    const StepIcon = step?.icon ?? Shield
    const isLastIntro = introStep >= INTRO_STEPS.length - 1

    return createPortal(
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Disguise mode"
        >
            <button
                type="button"
                className="absolute inset-0 z-0 bg-black/80"
                aria-label="Close"
                onClick={onClose}
            />

            <div
                ref={modalRef}
                className="relative z-10 bg-tryst-card border border-tryst-border rounded-2xl w-full max-w-xl max-h-[min(88vh,680px)] overflow-y-auto shadow-2xl opacity-100"
                onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-tryst-card-2 border border-tryst-border flex items-center justify-center text-ivory-500 hover:text-ivory-200"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {phase === 'intro' ? (
                    <div className="p-6 pt-8">
                        <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-gold-400 mb-3">
                            First time · Step {introStep + 1} of {INTRO_STEPS.length}
                        </p>
                        <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center mb-4">
                            <StepIcon className="w-6 h-6 text-gold-400" />
                        </div>
                        <h3 className="font-playfair text-xl text-ivory-100 mb-2 pr-8">{step.title}</h3>
                        <p className="text-ivory-500 text-sm leading-relaxed mb-6">{step.body}</p>

                        <div className="flex gap-1.5 mb-6">
                            {INTRO_STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= introStep ? 'bg-gold-400' : 'bg-tryst-border'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {introStep > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIntroStep(s => s - 1)}
                                    className="flex-1 py-3 rounded-xl border border-tryst-border text-ivory-400 text-sm hover:bg-tryst-card-2"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => isLastIntro ? finishIntro() : setIntroStep(s => s + 1)}
                                className="flex-1 py-3 rounded-xl bg-gold/90 text-tryst-bg text-sm font-semibold hover:bg-gold"
                            >
                                {isLastIntro ? 'Choose a disguise' : 'Next'}
                            </button>
                        </div>

                        {!hasSeenDisguiseIntro && (
                            <button
                                type="button"
                                onClick={finishIntro}
                                className="w-full mt-3 text-[11px] text-ivory-600 hover:text-ivory-400"
                            >
                                Skip intro
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-5 pt-7">
                        <div className="flex items-center gap-2 mb-1 pr-8">
                            <EyeOff className="w-5 h-5 text-gold-400" />
                            <h3 className="font-playfair text-lg text-ivory-100">Pick a disguise</h3>
                        </div>
                        <p className="text-ivory-600 text-xs mb-4 leading-relaxed">
                            Tap one to open it full screen. Triple-tap the top header when you want TRYST back.
                        </p>

                        <div className="grid gap-2.5">
                            {DISGUISE_SKIN_META.map(skin => {
                                const Icon = SKIN_ICONS[skin.id] || Newspaper
                                return (
                                    <button
                                        key={skin.id}
                                        type="button"
                                        onClick={() => onSelect(skin.id as DisguiseSkinId)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-tryst-border hover:border-gold/40 hover:bg-tryst-card-2/50 transition-colors text-left group"
                                    >
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                            style={{ background: skin.bg, color: skin.accent }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: skin.accent }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-ivory-200 text-sm font-medium">{skin.appName}</p>
                                            <p className="text-ivory-600 text-[11px] truncate">{skin.tagline}</p>
                                            <p className="text-[10px] mt-0.5 font-mono tracking-wide" style={{ color: `${skin.accent}cc` }}>
                                                {skin.notif}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-ivory-600 group-hover:text-gold-400 flex-shrink-0" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    )
}
