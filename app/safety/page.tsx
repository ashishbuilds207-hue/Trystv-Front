import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, AlertTriangle, Ban, Eye, ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MarketingCard } from '@/components/tryst/marketing/MarketingCard'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Safety — TRYST',
    description: 'Reporting, blocking, verification, and community safety on TRYST.',
}

const safetyFeatures = [
    { icon: Ban, title: 'Block & Report', desc: 'Block any user instantly. Reports are reviewed by our safety team within 24 hours. Repeat offenders are permanently banned.' },
    { icon: Shield, title: 'Photo Verification', desc: 'Optional selfie verification badge helps you trust who you are meeting. Verified profiles are clearly marked.' },
    { icon: Eye, title: 'AI Moderation', desc: 'Profile photos and messages are scanned for policy violations. Illegal content is removed and reported to authorities.' },
    { icon: AlertTriangle, title: 'Panic Tools', desc: 'Disguise Mode and quick-exit let you hide TRYST instantly if someone is looking over your shoulder.' },
]

const sections = [
    {
        title: 'If you feel unsafe',
        content: 'If you are in immediate danger, contact local emergency services first. Then report the user in-app and email safety@tryst.app with screenshots if helpful.',
    },
    {
        title: 'Meeting in person',
        content: 'Meet in public places. Tell a trusted friend where you are. Use your own transport. TRYST never asks you to share your home address.',
    },
    {
        title: 'Underage users',
        content: 'TRYST is 18+ only. If you suspect a minor is using the platform, report immediately. We cooperate with law enforcement.',
    },
]

export default function SafetyPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Safety Center"
                title="Your safety comes first"
                subtitle="Tools, policies, and a dedicated team to keep TRYST a respectful space for adults."
                icon={Shield}
                image={MARKETING_IMAGES.safety}
                imageAlt="Woman feeling safe and confident"
            />
            <section className="pb-12 px-6">
                <div className="container max-w-6xl mx-auto grid sm:grid-cols-2 gap-6">
                    {safetyFeatures.map(s => (
                        <MarketingCard key={s.title} icon={s.icon} title={s.title} desc={s.desc} />
                    ))}
                </div>
            </section>
            <section className="pb-16 px-6">
                <div className="container max-w-3xl mx-auto space-y-4">
                    {sections.map(s => (
                        <div key={s.title} className="bg-tryst-card border border-tryst-border rounded-2xl p-6">
                            <h2 className="font-playfair text-lg font-bold text-ivory-100 mb-2">{s.title}</h2>
                            <p className="text-ivory-500 text-sm leading-relaxed">{s.content}</p>
                        </div>
                    ))}
                </div>
            </section>
            <section className="pb-24 px-6 text-center">
                <p className="text-ivory-400 text-sm mb-2">Safety team: safety@tryst.app</p>
                <Link href="/contact" className="tryst-button-gold inline-flex items-center gap-2 mt-4">
                    Contact Safety <ArrowRight className="w-4 h-4" />
                </Link>
            </section>
        </MarketingLayout>
    )
}
