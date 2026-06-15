'use client'

import { DISGUISE_SKIN_META } from './skinMeta'
import type { DisguiseSkinId } from './skins'

interface Props {
    active: DisguiseSkinId
    onSelect: (id: DisguiseSkinId) => void
}

export default function DisguiseSkinDock({ active, onSelect }: Props) {
    const meta = DISGUISE_SKIN_META.find(s => s.id === active)

    return (
        <div
            className="flex-shrink-0 border-t px-2 py-2 safe-area-pb"
            style={{
                background: meta?.bg ?? '#f4f4f4',
                borderColor: 'rgba(0,0,0,0.08)',
            }}
        >
            <div className="mx-auto w-full max-w-[1650px] px-4 sm:px-6 flex gap-2 overflow-x-auto scrollbar-hide justify-center py-2">
                {DISGUISE_SKIN_META.map(skin => {
                    const on = skin.id === active
                    return (
                        <button
                            key={skin.id}
                            type="button"
                            onClick={() => onSelect(skin.id as DisguiseSkinId)}
                            aria-label={skin.appName}
                            className="flex-shrink-0 rounded-2xl transition-all p-0.5"
                            style={{
                                boxShadow: on ? `0 2px 12px ${skin.accent}35` : 'none',
                            }}
                        >
                            <div
                                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-sm font-bold"
                                style={{
                                    background: on ? skin.accent : `${skin.accent}20`,
                                    color: on ? '#fff' : skin.accent,
                                }}
                            >
                                {skin.appName.charAt(0)}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
