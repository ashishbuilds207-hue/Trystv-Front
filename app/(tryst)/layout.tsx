'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Flame, Bell, Ghost, Home, Orbit, Map, MessageCircle, User } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { useMatches } from '@/lib/hooks/useDiscover'
import MatchModal from '@/components/tryst/MatchModal'
import DisguiseOverlay from '@/components/tryst/DisguiseOverlay'
import { TonightDisguiseBoot } from '@/components/tryst/TonightDisguiseBoot'
import AppSidebar, { AppRightRail } from '@/components/tryst/AppSidebar'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useSocket } from '@/lib/hooks/useSocket'
import { useEffect } from 'react'

const mobileNavItems = [
    { href: '/tonight', label: 'Tonight', icon: Home },
    { href: '/orbits', label: 'Orbits', icon: Orbit },
    { href: '/pulse', label: 'Pulse', icon: Map },
    { href: '/chat', label: 'Chats', icon: MessageCircle },
    { href: '/you', label: 'You', icon: User },
]

const PAGE_TITLES: Record<string, string> = {
    '/tonight': 'Tonight',
    '/orbits': 'Spark Orbits',
    '/pulse': 'Pulse Map',
    '/chat': 'Messages',
    '/you': 'You',
    '/gold': 'TRYST Gold',
    '/onboarding': 'Desire DNA',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isGhostMode, isNightMode, setDisguise } = useAppStore()
    const { data: matches = [] } = useMatches()
    const { data: me } = useAuthUser()
    useSocket()

    useEffect(() => {
        if (!me) return
        if (me.disguiseModeEnabled) {
            setDisguise(true, me.activeDisguiseSkin || 'newspaper')
        }
    }, [me?.disguiseModeEnabled, me?.activeDisguiseSkin, me, setDisguise])

    const unreadCount = matches.reduce((acc: number, m: { unreadCount: number }) => acc + m.unreadCount, 0)
    const pageTitle = PAGE_TITLES[pathname] || 'TRYST'

    return (
        <div className={`app-frame min-h-screen ${isNightMode ? 'night-mode' : ''}`}>
            <MatchModal />
            <DisguiseOverlay />
            <TonightDisguiseBoot />

            <div className="app-frame-outer">
                <div className="app-frame-inner">
                    <AppSidebar unreadCount={unreadCount} />

                    <main className="site-shell app-main relative flex flex-col min-h-screen min-w-0 flex-1 pb-20 lg:pb-0">
                        <header className="sticky top-0 z-30 app-main-header px-5 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0">
                            <div className="lg:hidden flex items-center gap-2">
                                <Flame className="w-5 h-5 text-crimson" strokeWidth={1.5} />
                                <span className="font-playfair text-lg font-bold tracking-widest text-ivory-100">TRYST</span>
                            </div>
                            <div className="hidden lg:block">
                                <h1 className="text-ivory-100 font-semibold font-playfair text-lg">{pageTitle}</h1>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                {isGhostMode && (
                                    <div className="hidden md:flex items-center gap-1.5 bg-gold/10 border border-gold/30 rounded-full px-3 py-1">
                                        <Ghost className="w-3 h-3 text-gold-400" />
                                        <span className="text-gold-400 text-xs font-medium">Ghost</span>
                                    </div>
                                )}
                                {isNightMode && (
                                    <div className="hidden md:flex items-center gap-1.5 bg-crimson/10 border border-crimson/30 rounded-full px-3 py-1">
                                        <span className="text-crimson-300 text-xs font-medium">Night</span>
                                    </div>
                                )}
                                <span className="hidden sm:inline-flex text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/25">
                                    Active
                                </span>
                                <button className="relative w-9 h-9 rounded-xl bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors">
                                    <Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crimson rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </header>

                        <div className="app-canvas flex-1 min-h-0">
                            {children}
                        </div>
                    </main>

                    <AppRightRail />
                </div>
            </div>

            <div className="app-mobile-nav-wrap lg:hidden">
                <nav className="mobile-nav flex items-center justify-around px-2 py-3">
                    {mobileNavItems.map((item) => {
                        const isActive = pathname === item.href
                        const isChat = item.href === '/chat'
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all relative ${
                                    isActive ? 'text-crimson-400' : 'text-ivory-600 hover:text-ivory-400'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-xs">{item.label}</span>
                                {isChat && unreadCount > 0 && (
                                    <span className="absolute -top-0.5 right-1 w-4 h-4 bg-crimson rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
