import type { Metadata } from 'next'
import Link from 'next/link'
import { Crown, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'TRYST Gold — Premium Membership',
    description: 'Unlimited likes, Ghost Mode, read receipts, priority placement, and more.',
}

const perks = [
    'Everything in Free membership',
    'Unlimited likes & matches',
    'Read receipts on messages',
    'Ghost Mode browsing',
    'Advanced desire filters',
    'Priority placement in feeds',
    'Profile Boost 3× per week',
    'Relationship Journey Mode',
    'Incognito browsing',
    'Discreet billing descriptor',
]

export default function TrystGoldPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="TRYST Gold"
                title="Premium, without compromise"
                subtitle="The full TRYST experience — unlimited connection, deeper filters, and priority visibility. Discreet billing always."
                icon={Crown}
                image={MARKETING_IMAGES.gold}
                imageAlt="Luxury gold aesthetic"
            />
            <section className="pb-16 px-6">
                <div className="container max-w-4xl mx-auto">
                    <div className="relative bg-tryst-card border border-gold/30 rounded-2xl p-8 shadow-gold overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold-gradient" />
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-gold-400 mb-2">
                                    <Crown className="w-5 h-5" />
                                    <span className="text-sm font-medium">Most Popular</span>
                                </div>
                                <h2 className="font-playfair text-3xl font-bold text-ivory-100">TRYST Gold</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-bold text-gold-400">$9.99</p>
                                <p className="text-ivory-500 text-sm">/month · or $79.99/year</p>
                            </div>
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                            {perks.map(p => (
                                <li key={p} className="flex items-center gap-2 text-ivory-400 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0" />
                                    {p}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/register" className="flex-1 text-center py-3 bg-gold-gradient text-black font-semibold rounded-lg hover:opacity-90 transition-all text-sm">
                                Start with Gold
                            </Link>
                            <Link href="/pricing" className="flex-1 text-center py-3 border border-gold/40 text-gold-400 rounded-lg hover:bg-gold/10 transition-all text-sm">
                                Compare all plans
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <section className="pb-24 px-6 text-center">
                <Sparkles className="w-8 h-8 text-gold-400 mx-auto mb-4" />
                <p className="text-ivory-500 text-sm max-w-md mx-auto mb-6">
                    Women are always free on TRYST. Gold unlocks the premium layer for members who want more.
                </p>
                <Link href="/register" className="tryst-button-primary inline-flex items-center gap-2">
                    Join TRYST <ArrowRight className="w-4 h-4" />
                </Link>
            </section>
        </MarketingLayout>
    )
}
