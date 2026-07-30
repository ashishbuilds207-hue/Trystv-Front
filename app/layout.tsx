import type { Metadata } from 'next'
import Script from 'next/script'
import '@/app/globals.css'
import { Providers } from '@/lib/providers'

const themeBootScript = `(function(){try{var s=JSON.parse(localStorage.getItem('tryst-store')||'{}');var dark=s.state&&typeof s.state.isNightMode==='boolean'?s.state.isNightMode:true;document.documentElement.dataset.theme=dark?'dark':'light';if(dark)document.documentElement.classList.add('night-mode');}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.classList.add('night-mode');}})();`

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
        <html lang="en" className="scroll-smooth night-mode" data-theme="dark" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
            </head>
            <body className="bg-tryst-bg font-inter text-tryst-text antialiased">
                <Script
                    src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
                    strategy="afterInteractive"
                />
                <div className="site-viewport">
                    <Providers>
                        {children}
                    </Providers>
                </div>
            </body>
        </html>
    )
}
