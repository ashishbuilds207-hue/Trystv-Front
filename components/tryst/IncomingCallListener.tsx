'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/useAppStore'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { getActiveChatMatchId } from '@/lib/onesignal/activeChat'
import { callNotifyCopy } from '@/lib/onesignal/callNotify'
import { useToast } from '@/lib/hooks/useToast'
import { Phone, PhoneOff, Video } from 'lucide-react'

type IncomingMeta = {
    matchId: string
    callId: string
    mode: 'audio' | 'video'
    fromUserId: string
    fromAlias?: string
}

function showBrowserCallNotification(meta: IncomingMeta) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
        const copy = callNotifyCopy(meta.mode, meta.fromAlias)
        const n = new Notification(copy.title, {
            body: copy.body,
            tag: `tryst-call-${meta.callId}`,
            requireInteraction: true,
            data: {
                matchId: meta.matchId,
                mode: meta.mode,
                kind: copy.kind,
            },
        })
        n.onclick = () => {
            window.focus()
            window.location.href = `/chat?match=${meta.matchId}&call=${meta.mode}`
            n.close()
        }
    } catch {
        /* ignore */
    }
}

/**
 * Global incoming call banner + toast + browser notification
 * when the match chat is not already open.
 * Audio vs video copy/icons differ.
 */
export default function IncomingCallListener() {
    const router = useRouter()
    const toast = useToast()
    const myId = useAppStore((s) => s.currentUserId)
    const { data: me } = useAuthUser()
    const userId = myId || me?.id || null
    const [incoming, setIncoming] = useState<IncomingMeta | null>(null)
    const lastCallIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (!userId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`calls:user:${userId}`, { config: { broadcast: { self: false } } })
            .on('broadcast', { event: 'call' }, ({ payload }) => {
                const p = payload as IncomingMeta & { type?: string; toUserId?: string }
                if (p?.type !== 'invite') return
                if (p.toUserId && p.toUserId !== userId) return
                if (p.fromUserId === userId) return
                // Same chat open → CallOverlay on chat page handles it (no duplicate banner)
                if (getActiveChatMatchId() === p.matchId) return
                if (p.callId && lastCallIdRef.current === p.callId) return
                lastCallIdRef.current = p.callId || null

                const mode = p.mode === 'video' ? 'video' : 'audio'
                const meta: IncomingMeta = {
                    matchId: p.matchId,
                    callId: p.callId,
                    mode,
                    fromUserId: p.fromUserId,
                    fromAlias: p.fromAlias,
                }
                setIncoming(meta)

                const copy = callNotifyCopy(mode, p.fromAlias)
                toast.info(copy.shortLabel, copy.toastBody)
                showBrowserCallNotification(meta)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [toast, userId])

    const onAccept = useCallback(() => {
        if (!incoming) return
        const { mode, matchId } = incoming
        setIncoming(null)
        router.push(`/chat?match=${matchId}&call=${mode}`)
    }, [incoming, router])

    const onDecline = useCallback(() => {
        setIncoming(null)
    }, [])

    if (!incoming) return null

    const isVideo = incoming.mode === 'video'
    const copy = callNotifyCopy(incoming.mode, incoming.fromAlias)

    return (
        <div className="fixed inset-x-0 top-0 z-[210] flex justify-center p-4 pointer-events-none">
            <div
                className={`pointer-events-auto w-full max-w-md rounded-2xl border shadow-2xl px-4 py-3.5 flex items-center gap-3 animate-in slide-in-from-top duration-200 backdrop-blur-md ${
                    isVideo
                        ? 'border-crimson/40 bg-gradient-to-r from-tryst-card via-tryst-card to-crimson/10'
                        : 'border-gold/30 bg-gradient-to-r from-tryst-card via-tryst-card to-gold/10'
                }`}
            >
                <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse ${
                        isVideo ? 'bg-crimson/25' : 'bg-gold/20'
                    }`}
                >
                    {isVideo
                        ? <Video className="w-5 h-5 text-crimson-300" />
                        : <Phone className="w-5 h-5 text-gold-400" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-ivory-100 text-sm font-semibold truncate">
                        {incoming.fromAlias || 'Match'}
                    </p>
                    <p className={`text-xs font-medium ${isVideo ? 'text-crimson-300' : 'text-gold-400'}`}>
                        {copy.shortLabel}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onDecline}
                    className="w-10 h-10 rounded-full border border-tryst-border flex items-center justify-center text-ivory-400 hover:bg-tryst-bg"
                    aria-label="Decline"
                >
                    <PhoneOff className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onAccept}
                    className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center text-white shadow-crimson"
                    aria-label={isVideo ? 'Accept video call' : 'Accept audio call'}
                >
                    {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}
