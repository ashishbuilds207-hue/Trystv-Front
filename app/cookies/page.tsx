import type { Metadata } from 'next'
import { Cookie } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { LegalSections } from '@/components/tryst/marketing/LegalSections'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Cookie Policy — TRYST',
    description: 'How TRYST uses cookies and similar technologies.',
}

const sections = [
    {
        title: '1. What We Use',
        content: 'TRYST uses only essential session cookies to keep you signed in and remember your preferences (such as Disguise Mode settings). We do not use third-party advertising cookies or cross-site tracking pixels.',
    },
    {
        title: '2. Analytics',
        content: 'We may use privacy-respecting, first-party analytics to understand feature usage in aggregate. No personally identifiable information is shared with analytics providers. You can opt out in Settings → Privacy.',
    },
    {
        title: '3. Local Storage',
        content: 'We store authentication tokens and UI preferences in your browser local storage. This data never leaves your device except when sent to our encrypted API for authentication.',
    },
    {
        title: '4. Your Choices',
        content: 'You can clear cookies and local storage at any time via your browser settings. Note that clearing session data will sign you out of TRYST.',
    },
    {
        title: '5. Updates',
        content: 'We may update this Cookie Policy as our practices evolve. Material changes will be announced in-app. Last updated: January 2025.',
    },
    {
        title: '6. Contact',
        content: 'Questions: privacy@tryst.app',
    },
]

export default function CookiesPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Cookie Policy"
                title="Minimal cookies. Maximum privacy."
                subtitle="We don't track you across the web. Here's exactly what we store on your device."
                icon={Cookie}
                image={MARKETING_IMAGES.cookies}
                imageAlt="Minimal digital privacy"
            />
            <LegalSections sections={sections} />
        </MarketingLayout>
    )
}
