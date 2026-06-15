import type { LucideIcon } from 'lucide-react'

interface Props {
    icon: LucideIcon
    title: string
    desc: string
    highlight?: boolean
}

export function MarketingCard({ icon: Icon, title, desc, highlight }: Props) {
    return (
        <div className={`tryst-card p-6 group transition-colors ${highlight ? 'border-gold/35' : 'hover:border-gold/20'}`}>
            <div className="w-12 h-12 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson mb-4 group-hover:bg-crimson group-hover:text-white transition-all">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className={`font-semibold text-base mb-2 ${highlight ? 'text-gold-400' : 'text-ivory-100'}`}>{title}</h3>
            <p className="text-ivory-400 text-sm leading-relaxed">{desc}</p>
        </div>
    )
}
