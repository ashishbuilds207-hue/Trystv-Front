'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Flame, Ghost, Home, Orbit, MessageCircle, User, Heart, Radio, EyeOff } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'
import { useMatches, useLikes } from '@/lib/hooks/useDiscover'
import MatchModal from '@/components/tryst/MatchModal'
import DisguiseOverlay from '@/components/tryst/DisguiseOverlay'
import { TonightDisguiseBoot } from '@/components/tryst/TonightDisguiseBoot'
import AppSidebar, { AppRightRail } from '@/components/tryst/AppSidebar'
import ThemeToggle from '@/components/tryst/ThemeToggle'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { useSocket } from '@/lib/hooks/useSocket'
import { useAutoLocation } from '@/lib/hooks/useGeoLocation'
import { SelfOnlineBadge } from '@/components/tryst/OnlineStatus'
import NotificationsBell from '@/components/tryst/NotificationsBell'
import OneSignalProvider from '@/components/tryst/OneSignalProvider'
import IncomingCallListener from '@/components/tryst/IncomingCallListener'
import { Suspense, useEffect, useRef } from 'react'
import GhostModeIntroModal from '@/components/tryst/GhostModeIntroModal'
import { useGhostMode } from '@/lib/hooks/useGhostMode'

const mobileNavItems = [
    { href: '/tonight', label: 'Tonight', icon: Home },
    { href: '/echoes', label: 'Echoes', icon: Radio },
    { href: '/orbits', label: 'Orbits', icon: Orbit },
    { href: '/likes', label: 'Likes', icon: Heart },
    { href: '/chat', label: 'Chats', icon: MessageCircle },
    { href: '/you', label: 'You', icon: User },
]

const PAGE_TITLES: Record<string, string> = {
    '/tonight': 'Tonight',
    '/echoes': 'Echoes',
    '/echoes/new': 'New Echo',
    '/echoes/mine': 'My Echoes',
    '/orbits': 'Spark Orbits',
    '/pulse': 'Pulse Map',
    '/likes': 'Likes',
    '/chat': 'Messages',
    '/you': 'You',
    '/hide': 'Hide from',
    '/gold': 'TRYST Gold',
    '/onboarding': 'Edit profile',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div className="app-frame min-h-screen" />}>
            <AppLayoutInner>{children}</AppLayoutInner>
        </Suspense>
    )
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isGhostMode, isNightMode, setDisguise, setGhostMode } = useAppStore()
    const { ghostIntroOpen, confirmEnableFromIntro, closeGhostIntro } = useGhostMode()
    const { data: matches = [] } = useMatches()
    const { data: likes = [] } = useLikes()
    const { data: me } = useAuthUser()
    const ghostSyncedFor = useRef<string | null>(null)
    useSocket()
    useAutoLocation()

    useEffect(() => {
        if (!me) return
        if (me.disguiseModeEnabled) {
            setDisguise(true, me.activeDisguiseSkin || 'newspaper')
        }
    }, [me?.disguiseModeEnabled, me?.activeDisguiseSkin, me, setDisguise])

    // New / returning sessions: Ghost starts from profile (default OFF), not a stale local toggle.
    useEffect(() => {
        if (!me?.id) {
            ghostSyncedFor.current = null
            return
        }
        if (ghostSyncedFor.current === me.id) return
        ghostSyncedFor.current = me.id
        setGhostMode(!!me.isGhostMode)
    }, [me?.id, me?.isGhostMode, setGhostMode])

    const unreadCount = matches.reduce((acc: number, m: { unreadCount: number }) => acc + m.unreadCount, 0)
    const pageTitle = PAGE_TITLES[pathname] || (pathname.startsWith('/echoes') ? 'Echoes' : 'TRYST')
    const isEchoImmersive = pathname === '/echoes'
    // Mobile open-chat: hide shell chrome so partner name in chat header is visible
    const isOpenChatMobile = pathname === '/chat' && !!searchParams.get('match')

    return (
        <div className="app-frame min-h-screen">
            <OneSignalProvider />
            <IncomingCallListener />
            <MatchModal />
            <DisguiseOverlay />
            <TonightDisguiseBoot />
            <GhostModeIntroModal
                open={ghostIntroOpen}
                onClose={closeGhostIntro}
                onEnable={confirmEnableFromIntro}
            />

            <div className="app-frame-outer">
                <div className="app-frame-inner">
                    <AppSidebar unreadCount={unreadCount} />

                    <main className={`site-shell app-main relative flex flex-col min-h-screen min-w-0 flex-1 ${isOpenChatMobile ? 'pb-0' : 'pb-20'} lg:pb-0 ${isEchoImmersive ? 'app-main--echo' : ''}`}>
                        {!isEchoImmersive && !isOpenChatMobile && (
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
                                        <span className="text-crimson-300 text-xs font-medium">Dark</span>
                                    </div>
                                )}
                                <ThemeToggle compact />
                                <SelfOnlineBadge className="hidden sm:inline-flex" />
                                <Link
                                    href="/hide"
                                    title="Hide from"
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                                        pathname === '/hide'
                                            ? 'border-crimson/40 bg-crimson/15 text-crimson-300'
                                            : 'border-tryst-border text-ivory-500 hover:text-ivory-200 hover:border-crimson/30'
                                    }`}
                                >
                                    <EyeOff className="w-4 h-4" />
                                </Link>
                                <NotificationsBell />
                            </div>
                        </header>
                        )}

                        <div className={`app-canvas flex-1 min-h-0 ${isEchoImmersive ? 'app-canvas--echo' : ''}`}>
                            {children}
                        </div>
                    </main>

                    {!isEchoImmersive && <AppRightRail />}
                </div>
            </div>

            {!isOpenChatMobile && (
            <div className={`app-mobile-nav-wrap lg:hidden ${isEchoImmersive ? 'app-mobile-nav-wrap--echo' : ''}`}>
                <nav className="mobile-nav flex items-center justify-around px-2 py-3">
                    {mobileNavItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/echoes' && pathname.startsWith('/echoes'))
                        const isChat = item.href === '/chat'
                        const isLikes = item.href === '/likes'
                        const badge = isChat ? unreadCount : isLikes ? likes.length : 0
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
                                {badge > 0 && (
                                    <span className="absolute -top-0.5 right-1 w-4 h-4 bg-crimson rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                                        {badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            )}
        </div>
    )
}
