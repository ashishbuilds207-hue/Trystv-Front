import type { Metadata } from 'next'
import { Shield } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { LegalSections } from '@/components/tryst/marketing/LegalSections'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Privacy Policy — TRYST',
    description: 'How TRYST protects your data and privacy.',
}

const sections = [
    {
        title: '1. Information We Collect',
        content: 'We collect minimal information: your phone number (for verification only), the alias you choose, your age and general preferences. We never collect your real name, address, or social media accounts. Photos you upload are encrypted at rest. We do not store GPS coordinates — only approximate city-level location.',
    },
    {
        title: '2. How We Use Your Information',
        content: 'Your data is used solely to: operate the matching and discovery features, send you verification codes, enable encrypted communication with your matches, and improve our AI compatibility engine. We never use your data for advertising, never sell it to third parties, and never share it with anyone outside TRYST.',
    },
    {
        title: '3. Data Encryption',
        content: 'All chat messages are end-to-end encrypted. Your photos are encrypted at rest on AWS S3. All API communications use TLS 1.3. Your phone number is stored as a one-way hash. We cannot read your messages.',
    },
    {
        title: '4. Auto-Delete & Data Retention',
        content: 'Messages set with auto-delete timers (24h, 72h, 7d) are permanently and irrecoverably deleted when the timer expires. You may request permanent deletion of your entire account at any time via Settings → Delete Account. All your data is removed within 48 hours.',
    },
    {
        title: '5. Ghost Mode & Incognito',
        content: 'When Ghost Mode is active, your profile is hidden from discovery feeds. When Incognito Mode is active, your profile views are not logged and seen receipts are not sent. No browsing metadata is stored in either mode.',
    },
    {
        title: '6. Cookies & Analytics',
        content: 'We use minimal, privacy-respecting analytics (no cross-site tracking). No third-party advertising cookies are ever placed. You may opt out of anonymous analytics in Settings.',
    },
    {
        title: '7. GDPR & PDPB Compliance',
        content: 'Users in the EU and UK are covered by GDPR. Users in India are covered by the Personal Data Protection Bill (PDPB). You have the right to access, correct, or delete your data at any time. Contact privacy@tryst.app to exercise these rights.',
    },
    {
        title: '8. Contact',
        content: 'For privacy-related requests: privacy@tryst.app. For safety concerns: safety@tryst.app. We respond within 48 hours.',
    },
]

export default function PrivacyPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Last updated: January 2025"
                title="Privacy Policy"
                subtitle="Your privacy isn't a feature. It's a foundation."
                icon={Shield}
                image={MARKETING_IMAGES.privacy}
                imageAlt="Digital privacy and security"
            />
            <LegalSections sections={sections} />
        </MarketingLayout>
    )
}
