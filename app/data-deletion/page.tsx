import type { Metadata } from 'next'
import Link from 'next/link'
import { Trash2, ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/tryst/marketing/MarketingLayout'
import { MarketingHero } from '@/components/tryst/marketing/MarketingHero'
import { LegalSections } from '@/components/tryst/marketing/LegalSections'
import { MARKETING_IMAGES } from '@/lib/marketingImages'

export const metadata: Metadata = {
    title: 'Data Deletion — TRYST',
    description: 'How to permanently delete your TRYST account and all associated data.',
}

const sections = [
    {
        title: '1. Your Right to Delete',
        content: "You have the right to permanently delete your account and all personal data at any time. Under GDPR and India's PDPB, deletion requests must be honoured without undue delay.",
    },
    {
        title: '2. In-App Deletion',
        content: 'Go to You → Settings → Delete Account. Confirm with your phone OTP. Your profile, photos, messages, matches, and preferences are queued for permanent deletion within 48 hours.',
    },
    {
        title: '3. What Gets Deleted',
        content: 'All profile data, uploaded photos, chat history, match records, desire preferences, location data, and authentication tokens. Backups are purged within 30 days per our retention policy.',
    },
    {
        title: '4. What May Be Retained',
        content: 'Anonymised aggregate statistics (e.g. total user count) and legally required fraud-prevention hashes (phone number one-way hash, retained 90 days to prevent ban evasion) may be kept as permitted by law.',
    },
    {
        title: '5. Email Request',
        content: 'You may also email privacy@tryst.app with subject "Delete My Account" from your registered email. We verify identity before processing. Response within 48 hours.',
    },
    {
        title: '6. Subscription Cancellation',
        content: 'Deleting your account does not automatically cancel App Store or Play Store subscriptions. Cancel subscriptions in your device settings before deleting if needed.',
    },
]

export default function DataDeletionPage() {
    return (
        <MarketingLayout>
            <MarketingHero
                badge="Data Deletion"
                title="Leave no trace"
                subtitle="When you're done with TRYST, your data goes with you — permanently and completely."
                icon={Trash2}
                image={MARKETING_IMAGES.dataDeletion}
                imageAlt="Secure data deletion"
            />
            <LegalSections sections={sections} />
            <section className="pb-24 px-6 text-center">
                <Link href="/privacy" className="text-ivory-400 hover:text-gold-400 text-sm inline-flex items-center gap-2">
                    Full Privacy Policy <ArrowRight className="w-4 h-4" />
                </Link>
            </section>
        </MarketingLayout>
    )
}
