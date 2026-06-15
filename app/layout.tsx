import type { Metadata } from 'next'
import '@/app/globals.css'
import { Providers } from '@/lib/providers'

export const metadata: Metadata = {
    title: 'TRYST — Your Secret. Your Story.',
    description: 'The global discreet dating app for adults who value intelligence, elegance, and privacy.',
    keywords: 'discreet dating, private dating app, TRYST, adult dating',
    icons: {
        icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
        shortcut: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
        apple: [{ url: '/apple-touch-icon.svg', type: 'image/svg+xml' }],
    },
    openGraph: {
        title: 'TRYST — Your Secret. Your Story.',
        description: 'Desire has no rules.',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className="bg-tryst-bg font-inter text-ivory antialiased">
                <div className="site-viewport">
                    <Providers>
                        {children}
                    </Providers>
                </div>
            </body>
        </html>
    )
}
