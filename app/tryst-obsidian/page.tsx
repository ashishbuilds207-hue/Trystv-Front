import type { Metadata } from 'next'
import Link from 'next/link'
import { Diamond, CheckCircle2, ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'TRYST Obsidian — VIP Membership',
    description: 'Concierge matching, elite verification, Inner Circle access, and white-glove support.',
}

const perks = [
    'Everything in TRYST Gold',
    'Concierge AI matching',
    'Verified elite profile badge',
    'Priority ID verification',
    'Dedicated support line',
    'Exclusive Inner Circle access',
    '200 bonus credits monthly',
    'White-glove onboarding',
    'Invitation-only events',
    'Neutral VIP billing descriptor',
]

export default function TrystObsidianPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="TRYST Obsidian"
                title="The VIP experience"
                subtitle="For members who expect discretion, curation, and a standard of connection that matches their world."
                icon={Diamond}
                image={MARKETING_IMAGES.obsidian}
                imageAlt="Dark luxury VIP aesthetic"
            />
            <section className="pb-16 px-6">
                <div className="container max-w-4xl mx-auto">
                    <div className="relative bg-tryst-card border border-gold-700/40 rounded-2xl p-8 overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.4) 0%, transparent 60%)' }}
                        />
                        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-ivory-200 mb-2">
                                    <Diamond className="w-5 h-5" />
                                    <span className="text-sm font-medium">Elite Tier</span>
                                </div>
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100">TRYST Obsidian</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-bold text-ivory-100">$49.99</p>
                                <p className="text-ivory-500 text-sm">/month</p>
                            </div>
                        </div>
                        <ul className="relative z-10 grid sm:grid-cols-2 gap-3 mb-8">
                            {perks.map(p => (
                                <li key={p} className="flex items-center gap-2 text-ivory-400 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-ivory-200 flex-shrink-0" />
                                    {p}
                                </li>
                            ))}
                        </ul>
                        <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                            <Link href="/register" className="flex-1 text-center py-3 bg-tryst-card-2 border border-gold-600 text-ivory-200 font-semibold rounded-lg hover:border-gold-400 transition-all text-sm">
                                Request Obsidian Access
                            </Link>
                            <Link href="/tryst-gold" className="flex-1 text-center py-3 border border-tryst-border text-ivory-400 rounded-lg hover:border-gold/30 transition-all text-sm">
                                Compare with Gold
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <section className="pb-24 px-6 text-center">
                <p className="text-ivory-500 text-sm mb-6">Limited onboarding each month to preserve quality.</p>
                <Link href="/contact" className="tryst-button-gold inline-flex items-center gap-2">
                    Contact Concierge <ArrowRight className="w-4 h-4" />
                </Link>
            </section>
        </MarketingLayout>
    )
}
