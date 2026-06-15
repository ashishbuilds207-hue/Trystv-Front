import type { Metadata } from 'next'
import { Flame } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { LegalSections } from '@/components/tryst/marketing/LegalSections'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Terms of Service — TRYST',
    description: 'TRYST Terms of Service.',
}

const sections = [
    { title: '1. Eligibility', content: 'You must be 18 years or older to use TRYST. By creating an account, you confirm that you are legally an adult in your jurisdiction. TRYST reserves the right to terminate accounts found to violate this requirement.' },
    { title: '2. User Responsibility', content: 'TRYST is a platform for adults to make consensual connections. Users are solely responsible for their actions, interactions, and content. TRYST does not condone harassment, non-consensual sharing of information, or any form of abuse.' },
    { title: '3. No Adultery Facilitation Liability', content: 'TRYST is a communication platform. We do not facilitate, encourage, or endorse any specific relationship structure or arrangement. Users make their own choices. TRYST bears no legal or moral responsibility for the personal decisions of its members.' },
    { title: '4. Privacy & Data', content: 'We are committed to protecting your privacy. Please review our Privacy Policy for full details on data collection, storage, and deletion practices.' },
    { title: '5. Content Standards', content: 'Explicit sexual content is not permitted on profile photos or public areas of the app. AI moderation and human review actively monitor for violations. Accounts sharing illegal content will be permanently banned and reported to relevant authorities.' },
    { title: '6. Credits & Subscriptions', content: 'Message credits and subscription fees are non-refundable except as required by law. Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date via Settings → Subscription.' },
    { title: '7. Account Termination', content: 'TRYST reserves the right to suspend or terminate any account for violations of these Terms, fraudulent activity, harassment, or any conduct that compromises the safety of our community.' },
    { title: '8. Limitation of Liability', content: 'TRYST is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.' },
    { title: '9. Governing Law', content: 'These Terms are governed by the laws of India for users in India, and applicable local laws for users in other jurisdictions.' },
    { title: '10. Contact', content: 'Questions about these Terms: legal@tryst.app. We respond within 72 hours.' },
]

export default function TermsPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Last updated: January 2025"
                title="Terms of Service"
                subtitle="Please read these terms before using TRYST."
                icon={Flame}
                image={MARKETING_IMAGES.terms}
                imageAlt="Legal documents"
            />
            <LegalSections sections={sections} />
        </MarketingLayout>
    )
}
