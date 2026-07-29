'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Heart, Flame, MessageCircle, Radio, Sparkles } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotifications, type AppNotification } from '@/lib/hooks/useDiscover'
import { userApi } from '@/lib/api/auth'
import { formatDistanceToNow } from 'date-fns'

function iconFor(type: string) {
    if (type === 'spark' || type === 'match') return Flame
    if (type === 'like' || type === 'pull' || type === 'ignite') return Heart
    if (type === 'echo_like' || type === 'echo_react') return Radio
    if (type === 'message') return MessageCircle
    return Sparkles
}

export default function NotificationsBell() {
    const { data: notifications = [] } = useNotifications()
    const [open, setOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const qc = useQueryClient()

    const unread = notifications.filter((n) => !n.isRead).length

    const markRead = useMutation({
        mutationFn: (id: string) => userApi.markNotificationRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    })

    useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    const openItem = async (n: AppNotification) => {
        if (!n.isRead) markRead.mutate(n.id)
        setOpen(false)
        const matchId = n.data?.matchId || n.data?.match_id
        if (n.type === 'spark' || n.type === 'match' || n.type === 'message') {
            router.push(matchId ? `/chat?match=${matchId}` : '/chat')
            return
        }
        if (n.type === 'like' || n.type === 'pull' || n.type === 'ignite') {
            router.push('/likes')
            return
        }
        if (n.type?.startsWith('echo')) {
            router.push('/echoes')
        }
    }

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                aria-label="Notifications"
                onClick={() => setOpen((v) => !v)}
                className="relative w-9 h-9 rounded-xl bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors"
            >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-crimson rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-tryst-border bg-tryst-card shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-tryst-border flex items-center justify-between">
                        <p className="text-sm font-medium text-ivory-100">Notifications</p>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-ivory-600">
                            Live
                        </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-center text-ivory-500 text-sm py-10 px-4">
                                No notifications yet
                            </p>
                        ) : (
                            notifications.slice(0, 20).map((n) => {
                                const Icon = iconFor(n.type)
                                return (
                                    <button
                                        key={n.id}
                                        type="button"
                                        onClick={() => openItem(n)}
                                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-tryst-bg/60 transition-colors border-b border-tryst-border/40 last:border-0 ${
                                            !n.isRead ? 'bg-crimson/5' : ''
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                            !n.isRead ? 'bg-crimson/15 text-crimson-300' : 'bg-tryst-bg text-ivory-500'
                                        }`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-ivory-100 truncate">{n.title || 'Update'}</p>
                                            {n.body && (
                                                <p className="text-xs text-ivory-500 line-clamp-2 mt-0.5">{n.body}</p>
                                            )}
                                            <p className="text-[10px] text-ivory-600 mt-1">
                                                {n.createdAt
                                                    ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                                                    : ''}
                                            </p>
                                        </div>
                                        {!n.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-crimson shrink-0 mt-1.5" />
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
