import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Lock, EyeOff, Zap, MapPin, ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { MarketingCard } from '@/components/tryst/marketing/MarketingCard'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Privacy Vault — TRYST',
    description: 'Military-grade privacy tools built for people who cannot afford to be discovered.',
}

const tools = [
    { icon: EyeOff, title: 'Incognito Mode', desc: 'Browse with zero footprint. Profile views are never logged and seen receipts are disabled.' },
    { icon: Lock, title: 'Photo Blurring', desc: 'All photos stay blurred until you and a match both confirm mutual interest.' },
    { icon: Zap, title: 'Panic / Disguise Exit', desc: 'Instantly disguise the entire app as news, finance, or meditation. Triple-tap to return.' },
    { icon: MapPin, title: 'Location Fuzzing', desc: 'We show approximate area only — never your exact GPS coordinates.' },
    { icon: Shield, title: 'Encrypted Storage', desc: 'Messages and media encrypted at rest. TLS 1.3 on every API call.' },
    { icon: Lock, title: 'Auto-Delete Timers', desc: 'Set chats to vanish after 24 hours, 72 hours, or 7 days — permanently.' },
]

export default function PrivacyVaultPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Privacy Vault"
                title="Your privacy is our obsession"
                subtitle="Built from the ground up for people who can't afford to be discovered. Every decision starts with one question: is this private enough?"
                icon={Shield}
                image={MARKETING_IMAGES.privacyVault}
                imageAlt="Secure digital privacy concept"
            />
            <section className="pb-16 px-6">
                <div className="container max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map(t => (
                        <MarketingCard key={t.title} icon={t.icon} title={t.title} desc={t.desc} />
                    ))}
                </div>
            </section>
            <section className="pb-24 px-6">
                <div className="container max-w-3xl mx-auto text-center tryst-card p-8 border-gold/20">
                    <h2 className="font-playfair text-2xl font-bold text-ivory-100 mb-3">Read the full policy</h2>
                    <p className="text-ivory-500 text-sm mb-6">GDPR and PDPB compliant. Your data is never sold.</p>
                    <Link href="/privacy" className="tryst-button-gold inline-flex items-center gap-2">
                        Privacy Policy <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </MarketingLayout>
    )
}
