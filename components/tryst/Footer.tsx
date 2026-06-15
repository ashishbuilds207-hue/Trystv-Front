'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram, Twitter, Shield } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'

interface FooterProps {
    marketing?: boolean
}

const PRODUCT_LINKS = [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Privacy Vault', href: '/privacy-vault' },
    { label: 'TRYST Gold', href: '/tryst-gold' },
    { label: 'TRYST Obsidian', href: '/tryst-obsidian' },
]

const LEGAL_LINKS = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Data Deletion', href: '/data-deletion' },
    { label: 'Safety', href: '/safety' },
]

function FooterLink({ href, label, marketing }: { href: string; label: string; marketing: boolean }) {
    const pathname = usePathname()
    const active = pathname === href

    if (!marketing) {
        return (
            <Link href={href} className="text-ivory-400 text-sm hover:text-ivory-100 transition-colors">
                {label}
            </Link>
        )
    }

    return (
        <Link
            href={href}
            className={`text-sm transition-colors ${active ? 'text-gold-400 font-medium' : 'text-ivory-400 hover:text-gold-400'}`}
        >
            {label}
        </Link>
    )
}

export function Footer({ marketing = false }: FooterProps) {
    const bodyText = marketing ? 'text-ivory-400' : 'text-ivory-400'
    const headingText = marketing ? 'text-ivory-100' : 'text-ivory-100'
    const mutedText = marketing ? 'text-ivory-500' : 'text-ivory-500'
    const socialClass = marketing
        ? 'w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-gold-400 hover:border-gold/40 transition-all'
        : 'w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-crimson hover:border-crimson/40 transition-all'

    return (
        <footer className="bg-tryst-bg-2 border-t border-tryst-border">
            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="mb-4">
                            <TrystLogo href="/" size="md" tone="ivory" />
                        </div>
                        <p className={`${bodyText} text-sm leading-relaxed max-w-xs mb-6`}>
                            A safe, elegant, emotionally resonant platform that acknowledges the complexity of human desire — without judgment.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#" className={socialClass} aria-label="Instagram">
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a href="#" className={socialClass} aria-label="Twitter">
                                <Twitter className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className={`${headingText} text-sm font-semibold tracking-wider uppercase mb-4`}>Product</h4>
                        <ul className="space-y-3">
                            {PRODUCT_LINKS.map(item => (
                                <li key={item.href}>
                                    <FooterLink href={item.href} label={item.label} marketing={marketing} />
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className={`${headingText} text-sm font-semibold tracking-wider uppercase mb-4`}>Legal</h4>
                        <ul className="space-y-3">
                            {LEGAL_LINKS.map(item => (
                                <li key={item.href}>
                                    <FooterLink href={item.href} label={item.label} marketing={marketing} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="neon-divider mb-6" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className={`${mutedText} text-xs`}>
                        © 2025 TRYST. All rights reserved. For adults 18+ only.
                    </p>
                    <div className={`flex items-center gap-2 ${mutedText} text-xs`}>
                        <Shield className="w-3 h-3" />
                        <span>End-to-end encrypted · GDPR compliant · 100% discreet</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
