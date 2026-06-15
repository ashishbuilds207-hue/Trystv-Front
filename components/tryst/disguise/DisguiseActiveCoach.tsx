'use client'

import { Hand, MousePointerClick } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'

export default function DisguiseActiveCoach() {
    const { hasSeenDisguiseActiveCoach, markDisguiseActiveCoachSeen } = useAppStore()

    if (hasSeenDisguiseActiveCoach) return null

    return (
        <div className="absolute inset-0 z-[210] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 text-[#1a1815]">
                <p className="font-semibold text-base mb-1">You&apos;re in disguise</p>
                <p className="text-sm text-[#555] leading-relaxed mb-4">
                    This screen looks like a normal app. TRYST is completely hidden.
                </p>

                <div className="space-y-3 mb-5">
                    <div className="flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-xl bg-[#eef1f6] flex items-center justify-center flex-shrink-0">
                            <MousePointerClick className="w-4 h-4 text-[#6b85b8]" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Exit disguise</p>
                            <p className="text-xs text-[#777] leading-snug">Triple-tap the top header or logo.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-xl bg-[#eef4f0] flex items-center justify-center flex-shrink-0">
                            <Hand className="w-4 h-4 text-[#1f8a5b]" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Switch look</p>
                            <p className="text-xs text-[#777] leading-snug">Tap the app icons along the bottom.</p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={markDisguiseActiveCoachSeen}
                    className="w-full py-3 rounded-xl bg-[#1a1815] text-white text-sm font-semibold"
                >
                    Got it
                </button>
            </div>
        </div>
    )
}
