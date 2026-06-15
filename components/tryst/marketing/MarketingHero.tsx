import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'

interface Props {
    badge: string
    title: string
    subtitle: string
    icon?: LucideIcon
    image?: string
    imageAlt?: string
}

export function MarketingHero({ badge, title, subtitle, icon: Icon, image, imageAlt }: Props) {
    return (
        <section className="pt-28 pb-14 px-6 relative overflow-hidden">
            <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 70% 20%, rgba(192,57,43,0.12) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(212,175,55,0.08) 0%, transparent 50%)' }}
            />
            <div className="container max-w-6xl mx-auto relative z-10">
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 rounded-full px-4 py-2 mb-6">
                            {Icon && <Icon className="w-3.5 h-3.5 text-gold-400" />}
                            <span className="text-gold-400 text-xs font-medium tracking-wide">{badge}</span>
                        </div>
                        <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-ivory-100 mb-4 leading-tight">
                            {title}
                        </h1>
                        <p className="text-ivory-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {subtitle}
                        </p>
                    </div>
                    {image && (
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-tryst-border shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                            <Image src={image} alt={imageAlt || title} fill className="object-cover" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-tryst-bg/80 via-transparent to-transparent" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
