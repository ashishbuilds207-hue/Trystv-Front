import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, EyeOff, MessageSquare, Shield, Lock, Zap, ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MarketingCard } from '@/components/tryst/marketing/MarketingCard'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Features — TRYST',
    description: 'DesireIQ matching, Ghost Mode, encrypted chat, Disguise Mode, and more.',
}

const features = [
    { icon: Sparkles, title: 'DesireIQ™ Matching', desc: 'AI learns your emotional preferences and surfaces connections that resonate — not random swipes.' },
    { icon: EyeOff, title: 'Ghost Mode', desc: 'Browse with zero footprint. No seen receipts, no profile views logged. You are invisible.' },
    { icon: MessageSquare, title: 'Encrypted Chat', desc: 'End-to-end encrypted messages with auto-delete timers: 24h, 72h, or 7 days.' },
    { icon: Shield, title: 'Disguise Mode', desc: 'One tap transforms TRYST into a news, finance, or wellness app. Your secret stays yours.' },
    { icon: Lock, title: 'Photo Vault', desc: 'Photos blurred by default until mutual interest. Share selectively, always.' },
    { icon: Zap, title: 'Mutual Spark', desc: 'When both hearts align, a memorable spark animation celebrates the moment.' },
]

export default function FeaturesPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Built Different"
                title="Where Desire Meets Discretion"
                subtitle="Every feature is engineered around one principle: your connection should feel safe, elegant, and entirely your own."
                icon={Sparkles}
                image={MARKETING_IMAGES.features}
                imageAlt="People connecting in an elegant setting"
            />
            <section className="pb-16 px-6">
                <div className="container max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map(f => (
                        <MarketingCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                </div>
            </section>
            <section className="pb-24 px-6 text-center">
                <p className="text-ivory-400 mb-6">Ready to experience TRYST?</p>
                <Link href="/register" className="tryst-button-primary inline-flex items-center gap-2">
                    Begin Your Story <ArrowRight className="w-4 h-4" />
                </Link>
            </section>
        </MarketingLayout>
    )
}
