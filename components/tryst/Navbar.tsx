'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { TrystLogo } from '@/components/tryst/TrystLogo'

interface NavbarProps {
    marketing?: boolean
}

const NAV_LINKS = [
    { label: 'Features', href: '/features' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Privacy', href: '/privacy-vault' },
    { label: 'Pricing', href: '/pricing' },
]

export function Navbar({ marketing = false }: NavbarProps) {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    const linkClass = (href: string) => {
        const active = href.startsWith('/#') ? false : pathname === href
        if (marketing) {
            return active
                ? 'text-sm text-gold-400 font-medium transition-colors tracking-wide'
                : 'text-sm text-ivory-300 hover:text-gold-400 transition-colors tracking-wide'
        }
        return 'text-sm text-ivory-400 hover:text-ivory-100 transition-colors tracking-wide'
    }

    const signInClass = marketing
        ? 'text-sm text-ivory-300 hover:text-gold-400 transition-colors px-4 py-2'
        : 'text-sm text-ivory-300 hover:text-ivory-100 transition-colors px-4 py-2'

    const menuIconClass = marketing
        ? 'md:hidden text-ivory-300 hover:text-gold-400 transition-colors'
        : 'md:hidden text-ivory-300 hover:text-ivory-100 transition-colors'

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <nav className={`site-fixed-bar top-0 transition-all duration-500 ${
            scrolled ? 'bg-glass border-b border-tryst-border' : 'bg-transparent'
        }`}>
            <div className="w-full max-w-site mx-auto flex items-center justify-between px-6 py-4">
                <TrystLogo href="/" size="md" tone="ivory" />

                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map((item) => (
                        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                            {item.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <Link href="/login" className={signInClass}>
                        Sign In
                    </Link>
                    <Link href="/register" className="tryst-button-primary text-sm">
                        Begin Your Story
                    </Link>
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} className={menuIconClass}>
                    {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            <div className={`md:hidden transition-all duration-300 overflow-hidden ${
                menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="bg-tryst-bg-2 border-t border-tryst-border px-6 py-4 flex flex-col gap-4">
                    {NAV_LINKS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={linkClass(item.href)}
                            onClick={() => setMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <div className="pt-2 border-t border-tryst-border flex flex-col gap-2">
                        <Link href="/login" className={`${signInClass} py-2`}>
                            Sign In
                        </Link>
                        <Link href="/register" className="tryst-button-primary text-sm text-center">
                            Begin Your Story
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
