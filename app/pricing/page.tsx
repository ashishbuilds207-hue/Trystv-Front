import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Crown, Diamond, Flame, Zap } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Pricing — TRYST',
    description: 'Three tiers. One promise: absolute discretion. Women always free.',
}

const plans = [
    {
        name: 'Free', tagline: 'For women, always', price: '$0', period: '/forever',
        color: 'border-tryst-border', badge: null, href: '/register',
        features: ['Browse all profiles', 'Receive messages for free', 'Basic DesireIQ™ matching', 'Safety features & reporting', 'Ghost Mode browsing'],
        cta: 'Join Free', ctaStyle: 'border border-tryst-border-2 text-ivory-300 hover:border-crimson/40 hover:text-ivory-100',
    },
    {
        name: 'TRYST Gold', tagline: 'Premium membership', price: '$9.99', period: '/month',
        altPrice: '$79.99/year', color: 'border-gold/30', badge: 'Most Popular', href: '/tryst-gold',
        features: ['Everything in Free', 'Send unlimited messages', 'Read receipts', 'Advanced desire filters', 'Priority placement', 'Profile Boost 3×/week', 'Incognito browsing'],
        cta: 'Start with Gold', ctaStyle: 'bg-gold-gradient text-black font-semibold hover:opacity-90',
    },
    {
        name: 'TRYST Obsidian', tagline: 'The VIP experience', price: '$49.99', period: '/month',
        color: 'border-gold-700/40', badge: 'Elite', href: '/tryst-obsidian',
        features: ['Everything in Gold', 'Concierge AI matching', 'Verified elite badge', 'ID verification priority', 'Dedicated support', 'Inner Circle access'],
        cta: 'Join Obsidian', ctaStyle: 'bg-tryst-card-2 border border-gold-600 text-ivory-200 hover:border-gold-400',
    },
]

const addons = [
    { name: 'Message Credits', desc: '50 credits for sending messages', price: '$4.99', icon: <Zap className="w-4 h-4" /> },
    { name: 'Profile Boost', desc: '30 minutes at top of local feed', price: '$1.99', icon: <Flame className="w-4 h-4" /> },
    { name: 'Incognito Week', desc: 'Browse with zero footprint for 7 days', price: '$2.99', icon: <Crown className="w-4 h-4" /> },
]

export default function PricingPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Membership Tiers"
                title="Choose Your Experience"
                subtitle="Three tiers. One promise: absolute discretion at every level. Women are always free on TRYST."
                icon={Crown}
                image={MARKETING_IMAGES.pricing}
                imageAlt="Premium membership concept"
            />

            <section className="pb-16 px-6">
                <div className="container max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div key={plan.name} className={`relative bg-tryst-card border ${plan.color} rounded-2xl p-6 flex flex-col`}>
                            {plan.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-gold/10 border border-gold/30 text-gold-400 text-xs font-medium px-3 py-1 rounded-full">{plan.badge}</span>
                                </div>
                            )}
                            <div className="mb-6">
                                <p className="text-ivory-500 text-sm mb-1">{plan.tagline}</p>
                                <h3 className={`text-xl font-bold font-playfair ${plan.badge ? 'text-gold-400' : 'text-ivory-100'}`}>{plan.name}</h3>
                                <p className="text-3xl font-bold mt-3">
                                    <span className={plan.badge ? 'text-gold-400' : 'text-ivory-100'}>{plan.price}</span>
                                    <span className="text-ivory-500 text-base font-normal">{plan.period}</span>
                                </p>
                                {plan.altPrice && <p className="text-ivory-500 text-xs mt-1">or {plan.altPrice} (save 33%)</p>}
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-center gap-2 text-ivory-400 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-crimson flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link href={plan.href} className={`block text-center py-3 rounded-lg transition-all text-sm ${plan.ctaStyle}`}>{plan.cta}</Link>
                        </div>
                    ))}
                </div>
            </section>

            <section className="py-16 bg-tryst-bg-2 px-6">
                <div className="container max-w-4xl mx-auto">
                    <h2 className="font-playfair text-2xl font-bold text-ivory-100 text-center mb-10">Add-ons & Credits</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {addons.map(a => (
                            <div key={a.name} className="tryst-card p-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson flex-shrink-0">{a.icon}</div>
                                <div className="flex-1">
                                    <p className="text-ivory-100 text-sm font-semibold">{a.name}</p>
                                    <p className="text-ivory-500 text-xs">{a.desc}</p>
                                </div>
                                <span className="text-ivory-200 font-bold text-sm">{a.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 px-6 text-center">
                <div className="container max-w-2xl mx-auto">
                    <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-4">Questions about plans?</h2>
                    <p className="text-ivory-500 mb-6">We're here. Discreetly.</p>
                    <Link href="/contact" className="tryst-button-gold inline-flex items-center gap-2">Contact Us</Link>
                </div>
            </section>
        </MarketingLayout>
    )
}
