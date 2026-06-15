'use client'

import Link from 'next/link'
import { Flame, Orbit, Map, MessageCircle, User, Ghost, Shield, LogOut, Sparkles, Crown, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store/useAppStore'
import { useSignOut } from '@/lib/hooks/useAuth'
import { useAuthUser } from '@/lib/hooks/useAuth'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'

const navItems = [
    { href: '/tonight', icon: Sparkles, label: 'Tonight' },
    { href: '/orbits', icon: Orbit, label: 'Orbits' },
    { href: '/pulse', icon: Map, label: 'Pulse' },
    { href: '/chat', icon: MessageCircle, label: 'Chats' },
    { href: '/you', icon: User, label: 'You' },
]

interface AppSidebarProps {
    unreadCount: number
}

export default function AppSidebar({ unreadCount }: AppSidebarProps) {
    const pathname = usePathname()
    const { isGhostMode, toggleGhostMode } = useAppStore()
    const signOut = useSignOut()

    return (
        <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col app-sidebar app-sidebar-left sticky top-0 h-screen z-40">
            <div className="p-5 border-b border-tryst-border/80">
                <Link href="/tonight" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-xl bg-crimson/15 border border-crimson/25 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-crimson" strokeWidth={1.5} />
                    </div>
                    <div>
                        <span className="font-playfair text-lg font-bold tracking-widest text-ivory-100 block leading-tight">TRYST</span>
                        <span className="text-[10px] text-ivory-600 font-mono tracking-wider uppercase">Desire Portal</span>
                    </div>
                </Link>
            </div>

            <div className="px-3 py-3 border-b border-tryst-border/80">
                <button
                    onClick={toggleGhostMode}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isGhostMode
                            ? 'bg-gold/10 border border-gold/30 text-gold-400'
                            : 'text-ivory-500 hover:text-ivory-300 hover:bg-tryst-card/80'
                    }`}
                >
                    <Ghost className="w-4 h-4" />
                    <span>{isGhostMode ? 'Ghost: ON' : 'Ghost Mode'}</span>
                    <div className={`ml-auto w-8 h-4 rounded-full transition-all ${isGhostMode ? 'bg-gold/60' : 'bg-tryst-border'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${isGhostMode ? 'translate-x-4 ml-0.5' : 'ml-0.5'}`} />
                    </div>
                </button>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const isChat = item.href === '/chat'
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'nav-item-active shadow-sm'
                                    : 'text-ivory-500 hover:text-ivory-200 hover:bg-tryst-card/60'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-crimson-300' : ''}`} />
                            <span>{item.label}</span>
                            {isChat && unreadCount > 0 && (
                                <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-crimson text-white text-xs flex items-center justify-center font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                    )
                })}
                <Link href="/gold"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        pathname === '/gold' ? 'nav-item-active' : 'text-ivory-500 hover:text-ivory-200 hover:bg-tryst-card/60'
                    }`}>
                    <Crown className="w-5 h-5 text-gold-400" />
                    <span>Gold</span>
                </Link>
            </nav>

            <div className="p-3 border-t border-tryst-border/80 space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ivory-500 hover:text-ivory-200 hover:bg-tryst-card/60 text-sm transition-all">
                    <Shield className="w-4 h-4" />
                    <span>Safety Center</span>
                </button>
                <button onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ivory-600 hover:text-ivory-400 hover:bg-tryst-card/60 text-sm transition-all">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}

export function AppRightRail() {
    const { data: me } = useAuthUser()
    const { isGhostMode, isNightMode } = useAppStore()

    return (
        <aside className="hidden xl:flex w-64 flex-shrink-0 flex-col app-sidebar app-sidebar-right sticky top-0 h-screen z-30">
            <div className="p-5 border-b border-tryst-border/80">
                <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-ivory-600 mb-3">Your pulse</p>
                {me ? (
                    <div className="flex items-center gap-3">
                        <ProfileAvatar seed={me.alias} src={me.avatarUrl} size={44} className="border-2 border-crimson/40" />
                        <div className="min-w-0">
                            <p className="text-ivory-100 font-medium text-sm truncate">{me.alias}</p>
                            <p className="text-ivory-600 text-xs truncate">{me.city || 'Worldwide'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-11 rounded-xl bg-tryst-card/50 animate-pulse" />
                )}
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="tryst-card p-4 border-tryst-border/80 bg-tryst-card/40">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-ivory-500">Status</span>
                        {isGhostMode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold-400 border border-gold/25">Ghost</span>}
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-ivory-400">
                            <span>Mode</span>
                            <span className="text-ivory-200">{isNightMode ? 'Night' : 'Standard'}</span>
                        </div>
                        <div className="flex justify-between text-ivory-400">
                            <span>Membership</span>
                            <span className={me?.isGold ? 'text-gold-400' : 'text-ivory-300'}>{me?.isGold ? 'Gold' : 'Free'}</span>
                        </div>
                    </div>
                </div>

                {!me?.isGold && (
                    <Link href="/gold" className="block tryst-card p-4 border-gold/25 bg-gradient-to-br from-gold/10 to-transparent hover:border-gold/40 transition-colors group">
                        <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-4 h-4 text-gold-400" />
                            <span className="text-sm font-medium text-gold-300">Upgrade to Gold</span>
                        </div>
                        <p className="text-[11px] text-ivory-500 leading-relaxed">Unlimited connects, worldwide pulse, disguise skins.</p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gold-400 mt-2 group-hover:gap-2 transition-all">
                            Explore <ChevronRight className="w-3 h-3" />
                        </span>
                    </Link>
                )}

                <div className="tryst-card p-4 border-tryst-border/60 bg-tryst-card/30">
                    <p className="text-[10px] font-mono tracking-wider uppercase text-ivory-600 mb-2">Quick links</p>
                    <div className="space-y-1">
                        {[
                            { href: '/pulse', label: 'World map' },
                            { href: '/orbits', label: 'Spark orbits' },
                            { href: '/you', label: 'Disguise mode' },
                        ].map(link => (
                            <Link key={link.href} href={link.href}
                                className="flex items-center justify-between py-2 text-xs text-ivory-400 hover:text-ivory-200 transition-colors border-b border-tryst-border/40 last:border-0">
                                {link.label}
                                <ChevronRight className="w-3 h-3 opacity-50" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-tryst-border/80">
                <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-ivory-700 text-center leading-relaxed">
                    Your secret · Your story
                </p>
            </div>
        </aside>
    )
}
