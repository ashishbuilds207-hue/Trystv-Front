import Link from 'next/link'
import { Flame } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg' | 'hero'

const SIZE = {
    sm: { icon: 'w-5 h-5', text: 'text-lg', gap: 'gap-1.5', stackedGap: 'gap-0' },
    md: { icon: 'w-6 h-6', text: 'text-2xl', gap: 'gap-2', stackedGap: 'gap-0' },
    lg: { icon: 'w-10 h-10', text: 'text-4xl', gap: 'gap-3', stackedGap: 'gap-1' },
    hero: { icon: 'w-16 h-16', text: 'text-6xl', gap: 'gap-4', stackedGap: 'gap-0' },
} as const

interface Props {
    href?: string
    size?: Size
    showText?: boolean
    layout?: 'inline' | 'stacked'
    tone?: 'ivory' | 'gold'
    className?: string
    iconClassName?: string
    onClick?: () => void
}

export function TrystLogo({
    href,
    size = 'md',
    showText = true,
    layout = 'inline',
    tone = 'ivory',
    className = '',
    iconClassName = '',
    onClick,
}: Props) {
    const s = SIZE[size]
    const isStacked = layout === 'stacked'

    const textTone = tone === 'gold'
        ? 'text-gold-400 group-hover:text-gold-300'
        : 'text-ivory-100 group-hover:text-ivory-50'

    const inner = (
        <span
            className={`inline-flex ${isStacked ? `flex-col items-center ${s.stackedGap}` : `items-center ${s.gap}`} group ${href || onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
        >
            <span className={`relative inline-flex ${isStacked && size === 'hero' ? 'mb-8' : ''}`}>
                <Flame
                    className={`${s.icon} text-crimson group-hover:text-crimson-400 transition-colors ${iconClassName}`}
                    strokeWidth={size === 'hero' ? 1 : 1.5}
                    style={size === 'hero' ? { animation: 'float 4s ease-in-out infinite' } : undefined}
                />
            </span>
            {showText && (
                <span className={`font-playfair ${s.text} font-bold ${isStacked ? 'text-center tracking-tight' : 'tracking-widest'} ${textTone} transition-colors ${isStacked && size === 'hero' ? 'mb-0' : ''}`}>
                    TRYST
                </span>
            )}
        </span>
    )

    if (href) {
        return (
            <Link href={href} className="inline-flex no-underline" aria-label="TRYST home">
                {inner}
            </Link>
        )
    }

    return inner
}

/** Compact mark — same flame as nav logo */
export function TrystMark({ className = '' }: { className?: string }) {
    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-tryst-card border border-tryst-border ${className}`}>
            <Flame className="w-4 h-4 text-crimson" strokeWidth={1.5} />
        </span>
    )
}
