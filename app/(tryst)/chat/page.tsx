'use client'

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react'
import Image from 'next/image'
import {
    Send, Timer, Lock, Mic, ArrowLeft, MoreVertical, Check, CheckCheck, CheckCircle2,
    MapPin, AlertTriangle, Flame, Loader2, Phone, PhoneOff, Smile, X, Clock, RotateCcw, Video,
} from 'lucide-react'
import { useMatches, useMessages, useSendMessage, type Message } from '@/lib/hooks/useDiscover'
import { useCallConsent, useSetCallConsent } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { joinChat, leaveChat, emitTyping } from '@/lib/hooks/useSocket'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format, isToday, isYesterday, differenceInMinutes } from 'date-fns'
import { DEFAULT_AVATAR } from '@/components/tryst/ProfileAvatar'
import { OnlineDot } from '@/components/tryst/OnlineStatus'
import { useAppStore } from '@/lib/store/useAppStore'
import { messageApi } from '@/lib/api/auth'
import ChatPartnerProfile from '@/components/tryst/ChatPartnerProfile'
import CallOverlay from '@/components/tryst/CallOverlay'
import { useSupabaseCall } from '@/lib/hooks/useSupabaseCall'
import { useToast } from '@/lib/hooks/useToast'

const TIMER_LABELS: Record<string, string> = { '24h': '24 hours', '72h': '72 hours', '7d': '7 days', never: 'Never' }

/** Same-time cluster: hide timestamp unless hover (Instagram-style) */
const CLUSTER_MINUTES = 60

function msgTime(d: string) {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }) } catch { return '' }
}

function clockTime(d: string) {
    try { return format(new Date(d), 'h:mm a') } catch { return '' }
}

/** Center divider when gap is large — like Instagram */
function dividerLabel(d: string) {
    try {
        const date = new Date(d)
        const time = format(date, 'h:mm a')
        if (isToday(date)) return `Today ${time}`
        if (isYesterday(date)) return `Yesterday ${time}`
        return format(date, 'MMM d, yyyy · h:mm a')
    } catch {
        return ''
    }
}

function shouldShowTimeDivider(curr: Message, prev: Message | null) {
    if (!prev) return true
    try {
        return differenceInMinutes(new Date(curr.createdAt), new Date(prev.createdAt)) >= CLUSTER_MINUTES
    } catch {
        return true
    }
}

function isSameCluster(curr: Message, next: Message | null, meId: string | null, partnerId: string) {
    if (!next) return false
    const currSent = meId ? curr.senderId === meId : curr.senderId !== partnerId
    const nextSent = meId ? next.senderId === meId : next.senderId !== partnerId
    if (currSent !== nextSent) return false
    try {
        return differenceInMinutes(new Date(next.createdAt), new Date(curr.createdAt)) < CLUSTER_MINUTES
    } catch {
        return false
    }
}

/** ✓ sending → ✓ sent → ✓✓ delivered → ✓✓ read (blue) */
function MessageTicks({ msg }: { msg: Message }) {
    if (msg.status === 'sending') {
        return <Clock className="w-3.5 h-3.5 text-ivory-600 animate-pulse" aria-label="Sending" />
    }
    if (msg.status === 'failed') {
        return <span className="text-[10px] text-crimson-300 font-medium">Failed</span>
    }
    if (msg.isRead) {
        return <span title="Seen"><CheckCheck className="w-3.5 h-3.5 text-blue-400" aria-label="Seen" /></span>
    }
    if (msg.deliveredAt || msg.status === 'sent') {
        return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-ivory-500" aria-label="Delivered" /></span>
    }
    return <span title="Sent"><Check className="w-3.5 h-3.5 text-ivory-600" aria-label="Sent" /></span>
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <Loader2 className="w-7 h-7 text-crimson animate-spin" />
                </div>
            }
        >
            <ChatPageContent />
        </Suspense>
    )
}

function ChatPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const qc = useQueryClient()
    const currentUserId = useAppStore((s) => s.currentUserId)
    const { data: me } = useAuthUser()

    const { data: matches = [], isLoading: matchesLoading } = useMatches()
    const [activeMatchId, setActiveMatchId] = useState<string | null>(searchParams.get('match'))
    const [inputText, setInputText] = useState('')
    const [partnerTyping, setPartnerTyping] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [showDeleteMenu, setShowDeleteMenu] = useState(false)
    const [showPartnerProfile, setShowPartnerProfile] = useState(false)
    const toast = useToast()
    const EMOJIS = ['😊', '🔥', '❤️', '😉', '🌹', '✨', '😂', '🥂', '💋', '🌙']
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const activeMatch = matches.find(m => m.id === activeMatchId) ?? null
    const { data: chatData, isLoading: messagesLoading } = useMessages(activeMatchId)
    // One message once — drop duplicate ids (realtime + refetch)
    const messages: Message[] = useMemo(() => {
        const list = chatData?.messages ?? []
        const seen = new Set<string>()
        return list.filter((m) => {
            if (!m?.id || seen.has(m.id)) return false
            seen.add(m.id)
            return true
        })
    }, [chatData?.messages])
    const deleteTimer = chatData?.deleteTimer ?? 'never'
    const sendMessage = useSendMessage()
    const { data: callConsent } = useCallConsent(activeMatchId)
    const setCallConsent = useSetCallConsent()
    const partnerName = activeMatch?.alias || 'Them'
    const myId = currentUserId || me?.id || null

    const call = useSupabaseCall(
        activeMatchId,
        activeMatch
            ? {
                alias: activeMatch.alias,
                avatarUrl: activeMatch.avatarUrl,
                partnerId: activeMatch.partnerId,
                myAlias: me?.alias || undefined,
            }
            : null,
    )

    // Deep-link from push / global banner: /chat?match=…&call=audio|video
    useEffect(() => {
        const mode = searchParams.get('call')
        if (!mode || !activeMatchId || !callConsent?.canCall) return
        if (mode !== 'audio' && mode !== 'video') return
        if (call.phase !== 'idle') return
        void call.answerFromDeepLink(mode)
        router.replace(`/chat?match=${activeMatchId}`, { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMatchId, callConsent?.canCall, searchParams])

    const openPartnerProfile = () => setShowPartnerProfile(true)

    const startAudioCall = () => {
        if (!callConsent?.canCall) {
            toast.warning('Call locked', 'Both of you must agree to calls first')
            return
        }
        void call.startCall('audio')
    }

    const startVideoCall = () => {
        if (!callConsent?.canCall) {
            toast.warning('Call locked', 'Both of you must agree to calls first')
            return
        }
        void call.startCall('video')
    }

    // Auto-scroll on new messages / typing
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, partnerTyping])

    // Mark partner messages as read when chat is open (updates their ✓✓ to blue)
    useEffect(() => {
        if (!activeMatchId) return
        void messageApi.markConversationRead(activeMatchId).then(() => {
            qc.invalidateQueries({ queryKey: ['matches'] })
        })
    }, [activeMatchId, messages.length, qc])

    // Realtime: messages + typing (other person only)
    useEffect(() => {
        if (!activeMatchId) return
        setPartnerTyping(false)
        joinChat(
            activeMatchId,
            {
                onNewMessage: ({ matchId, senderId, message }) => {
                    if (matchId && matchId !== activeMatchId) return

                    // Partner sent → stop their typing indicator
                    if (senderId && activeMatch?.partnerId && senderId === activeMatch.partnerId) {
                        setPartnerTyping(false)
                    }

                    // Merge single message into cache (avoid duplicate bubbles)
                    if (message?.id) {
                        const incoming: Message = {
                            id: String(message.id),
                            senderId: String(message.sender_id || senderId || ''),
                            content: String(message.content || ''),
                            type: String(message.type || 'text'),
                            isRead: !!message.is_read,
                            isDeleted: false,
                            expiresAt: (message.expires_at as string) || null,
                            deliveredAt: (message.delivered_at as string) || null,
                            createdAt: String(message.created_at || new Date().toISOString()),
                            senderAlias: '',
                            senderAvatar: '',
                            status: 'sent',
                        }
                        qc.setQueryData(
                            ['messages', activeMatchId],
                            (old: { messages: Message[]; convId: string; deleteTimer: string } | undefined) => {
                                if (!old) {
                                    return { messages: [incoming], convId: String(message.conversation_id || ''), deleteTimer: 'never' }
                                }
                                if (old.messages.some((m) => m.id === incoming.id)) return old
                                // Drop matching optimistic temp bubble from me
                                const withoutTemp = old.messages.filter(
                                    (m) => !(m.id.startsWith('temp-') && m.content === incoming.content && m.senderId === incoming.senderId),
                                )
                                return { ...old, messages: [...withoutTemp, incoming] }
                            },
                        )
                    } else {
                        qc.invalidateQueries({ queryKey: ['messages', activeMatchId] })
                    }
                    qc.invalidateQueries({ queryKey: ['matches'] })
                    if (senderId && myId && senderId !== myId) {
                        void messageApi.markConversationRead(activeMatchId)
                    }
                },
                onTyping: ({ isTyping, userId }) => {
                    // Only the other person in this chat — never myself
                    if (userId && myId && userId === myId) return
                    if (userId && activeMatch?.partnerId && userId !== activeMatch.partnerId) return
                    setPartnerTyping(isTyping)
                },
            },
            activeMatch?.convId || chatData?.convId,
        )
        return () => {
            leaveChat(activeMatchId)
            setPartnerTyping(false)
        }
    }, [activeMatchId, activeMatch?.convId, activeMatch?.partnerId, chatData?.convId, qc, myId])

    const stopTyping = useCallback(() => {
        if (!activeMatchId) return
        emitTyping(activeMatchId, false, { userId: myId || undefined, alias: me?.alias })
        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current)
            typingTimerRef.current = null
        }
    }, [activeMatchId, myId, me?.alias])

    const handleInputChange = (val: string) => {
        setInputText(val)
        if (!activeMatchId) return
        const meta = { userId: myId || undefined, alias: me?.alias || undefined }
        if (val.length > 0) {
            emitTyping(activeMatchId, true, meta)
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
            typingTimerRef.current = setTimeout(() => {
                emitTyping(activeMatchId, false, meta)
            }, 1800)
        } else {
            stopTyping()
        }
    }

    /** Clear draft — cancel send (message not stored) */
    const cancelDraft = () => {
        setInputText('')
        stopTyping()
        inputRef.current?.focus()
    }

    /** Instant optimistic send — input clears immediately; can keep typing next */
    const handleSend = useCallback(() => {
        if (!inputText.trim() || !activeMatchId) return
        const text = inputText.trim()
        setInputText('')
        stopTyping()
        // Fire-and-forget so user can send continuously
        sendMessage.mutate({ matchId: activeMatchId, content: text })
        inputRef.current?.focus()
    }, [inputText, activeMatchId, sendMessage, stopTyping])

    const retryFailed = (msg: Message) => {
        if (!activeMatchId || msg.status !== 'failed') return
        // Remove failed bubble then re-send
        qc.setQueryData(['messages', activeMatchId], (old: { messages: Message[]; convId: string; deleteTimer: string } | undefined) => {
            if (!old) return old
            return { ...old, messages: old.messages.filter((m) => m.id !== msg.id) }
        })
        sendMessage.mutate({ matchId: activeMatchId, content: msg.content })
    }

    const selectMatch = (id: string) => {
        setInputText('')
        stopTyping()
        setPartnerTyping(false)
        setShowPartnerProfile(false)
        setActiveMatchId(id)
        router.replace(`/chat?match=${id}`, { scroll: false })
    }

    if (matchesLoading) return (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <Loader2 className="w-7 h-7 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className={`flex w-full ${activeMatchId ? 'h-[100dvh] lg:h-[calc(100vh-80px)]' : 'h-[calc(100vh-80px)]'}`}>
            {/* Sidebar */}
            <div className={`w-full lg:w-80 flex-shrink-0 border-r border-tryst-border flex flex-col ${activeMatchId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-tryst-border">
                    <h2 className="text-ivory-100 font-semibold font-playfair">Messages</h2>
                    <p className="text-ivory-500 text-xs mt-0.5">{matches.length} active conversation{matches.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {matches.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-ivory-500 text-sm">No matches yet.</p>
                            <a href="/orbits" className="text-crimson-400 text-sm mt-2 block hover:underline">Explore orbits →</a>
                        </div>
                    ) : matches.map((match) => (
                        <button key={match.id} onClick={() => selectMatch(match.id)}
                            className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-tryst-card transition-all border-b border-tryst-border/50 ${activeMatchId === match.id ? 'bg-tryst-card border-l-2 border-l-crimson' : ''}`}>
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-tryst-border">
                                    <Image src={match.avatarUrl || match.photoUrls?.[0] || DEFAULT_AVATAR} alt={match.alias} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                </div>
                                <OnlineDot
                                    online={!!match.isOnline}
                                    size="md"
                                    className="absolute bottom-0 right-0"
                                    borderClass="border-tryst-bg"
                                />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-ivory-200 text-sm font-medium">{match.alias}</span>
                                    {match.lastMessageAt && <span className="text-ivory-600 text-xs">{msgTime(match.lastMessageAt)}</span>}
                                </div>
                                <p className="text-ivory-500 text-xs truncate mt-0.5">
                                    {match.isOnline ? 'Online' : match.lastMessage ?? 'Start a conversation...'}
                                </p>
                            </div>
                            {match.unreadCount > 0 && (
                                <span className="w-5 h-5 bg-crimson rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                    {match.unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat window */}
            <div className={`flex-1 flex flex-col ${!activeMatchId ? 'hidden lg:flex' : 'flex'}`}>
                {!activeMatch ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <Flame className="w-16 h-16 text-crimson/20 mb-4" strokeWidth={1} />
                        <h3 className="font-playfair text-xl font-bold text-ivory-300 mb-2">Select a conversation</h3>
                        <p className="text-ivory-500 text-sm">Choose a match from the left to begin.</p>
                    </div>
                ) : (
                    <>
                        {/* Header — sticky so partner name stays visible on mobile */}
                        <div className="sticky top-0 z-40 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-tryst-border bg-tryst-bg-2 safe-top">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveMatchId(null)
                                    router.replace('/chat', { scroll: false })
                                }}
                                className="lg:hidden flex-shrink-0 text-ivory-400 hover:text-ivory-200 p-1"
                                aria-label="Back to chats"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={openPartnerProfile}
                                className="relative flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson/60"
                                title={`View ${activeMatch.alias}'s profile`}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-tryst-border hover:border-crimson/50 transition-colors">
                                    <Image src={activeMatch.avatarUrl || activeMatch.photoUrls?.[0] || DEFAULT_AVATAR} alt={activeMatch.alias} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                </div>
                                <OnlineDot
                                    online={!!activeMatch.isOnline}
                                    size="md"
                                    className="absolute bottom-0 right-0"
                                    borderClass="border-tryst-bg-2"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={openPartnerProfile}
                                className="flex-1 min-w-0 text-left overflow-hidden"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <h3 className="text-ivory-100 font-semibold text-base sm:text-sm truncate">
                                        {activeMatch.alias || 'Chat'}
                                    </h3>
                                    {activeMatch.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-crimson flex-shrink-0" />}
                                </div>
                                <p className={`text-xs truncate flex items-center gap-1 ${
                                    partnerTyping ? 'text-crimson-300' : activeMatch.isOnline ? 'text-emerald-400' : 'text-ivory-500'
                                }`}>
                                    {partnerTyping
                                        ? `${partnerName} is typing…`
                                        : activeMatch.isOnline
                                            ? 'Online now'
                                            : <><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{activeMatch.city}</span></>}
                                </p>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={startAudioCall}
                                    disabled={!callConsent?.canCall}
                                    title={callConsent?.canCall ? 'Audio call' : 'Mutual consent required'}
                                    className="w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-crimson-300 hover:border-crimson/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={startVideoCall}
                                    disabled={!callConsent?.canCall}
                                    title={callConsent?.canCall ? 'Video call' : 'Mutual consent required'}
                                    className="w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-crimson-300 hover:border-crimson/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Video className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={openPartnerProfile}
                                    className="hidden sm:flex w-9 h-9 rounded-full bg-tryst-card border border-tryst-border items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors"
                                    title="More"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Call consent banner */}
                        <div className="px-4 py-3 bg-tryst-card border-b border-tryst-border">
                            {callConsent?.canCall ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                                        <Phone className="w-4 h-4 text-success" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-ivory-200 text-sm font-medium">Voice call unlocked</p>
                                        <p className="text-ivory-500 text-xs">You both agreed to connect by voice</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={startAudioCall}
                                        className="px-4 py-2 bg-crimson rounded-xl text-white text-xs font-medium hover:opacity-90"
                                    >
                                        Call
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                                        <PhoneOff className="w-4 h-4 text-gold-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-ivory-200 text-sm font-medium">Mutual call consent</p>
                                        <p className="text-ivory-500 text-xs">
                                            {callConsent?.myConsent
                                                ? 'Waiting for your match to agree'
                                                : 'Both must agree before voice calls'}
                                        </p>
                                    </div>
                                    {!callConsent?.myConsent && (
                                        <button
                                            onClick={() => activeMatchId && setCallConsent.mutate(activeMatchId)}
                                            disabled={setCallConsent.isPending}
                                            className="px-4 py-2 border border-gold/40 text-gold-400 rounded-xl text-xs font-medium hover:bg-gold/10">
                                            I agree
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Delete timer banner */}
                        <div className="relative px-4 py-2 bg-gold/5 border-b border-gold/10 flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-gold-400" />
                            <span className="text-gold-400 text-xs">
                                Messages auto-delete: {TIMER_LABELS[deleteTimer] ?? deleteTimer}
                            </span>
                            <button onClick={() => setShowDeleteMenu(p => !p)} className="ml-auto text-gold-500 text-xs hover:text-gold-300 underline">Change</button>
                            {showDeleteMenu && (
                                <div className="absolute top-full right-4 mt-1 bg-tryst-card border border-tryst-border rounded-xl overflow-hidden shadow-card-hover z-10">
                                    {['24h', '72h', '7d', 'never'].map((opt) => (
                                        <button key={opt} onClick={() => setShowDeleteMenu(false)}
                                            className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${deleteTimer === opt ? 'text-gold-400 bg-gold/10' : 'text-ivory-400 hover:bg-tryst-card-2'}`}>
                                            {TIMER_LABELS[opt]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Messages — Instagram-style time: hide when same cluster, show on hover */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            <div className="flex items-center gap-2 justify-center py-2 mb-2">
                                <div className="h-px flex-1 bg-tryst-border" />
                                <div className="flex items-center gap-1.5 text-ivory-600 text-xs">
                                    <Lock className="w-3 h-3" /> End-to-end encrypted
                                </div>
                                <div className="h-px flex-1 bg-tryst-border" />
                            </div>

                            {messagesLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-crimson animate-spin" /></div>
                            ) : messages.map((msg, i) => {
                                const prev = i > 0 ? messages[i - 1] : null
                                const next = i < messages.length - 1 ? messages[i + 1] : null
                                const isSent = myId
                                    ? msg.senderId === myId
                                    : msg.senderId !== activeMatch.partnerId
                                const showDivider = shouldShowTimeDivider(msg, prev)
                                const clusteredWithNext = isSameCluster(msg, next, myId, activeMatch.partnerId)
                                const clusteredWithPrev = prev
                                    ? isSameCluster(prev, msg, myId, activeMatch.partnerId)
                                    : false
                                const isClusterTail = !clusteredWithNext

                                return (
                                    <div key={msg.id}>
                                        {showDivider && (
                                            <div className="flex justify-center py-3">
                                                <span className="text-[11px] text-ivory-500 font-medium px-3 py-1 rounded-full bg-tryst-card/60 border border-tryst-border/50">
                                                    {dividerLabel(msg.createdAt)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`group flex ${isSent ? 'justify-end' : 'justify-start'} gap-2 ${
                                                clusteredWithPrev ? 'mt-0.5' : 'mt-2'
                                            }`}
                                        >
                                            {!isSent && (
                                                <button
                                                    type="button"
                                                    onClick={openPartnerProfile}
                                                    className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-auto ${
                                                        clusteredWithNext ? 'invisible pointer-events-none' : 'hover:ring-2 hover:ring-crimson/40'
                                                    }`}
                                                    title={`View ${partnerName}`}
                                                >
                                                    <Image src={activeMatch.avatarUrl || DEFAULT_AVATAR} alt="" width={28} height={28} className="object-cover w-full h-full" unoptimized />
                                                </button>
                                            )}
                                            <div className={`max-w-xs lg:max-w-sm flex flex-col gap-0.5 ${isSent ? 'items-end' : 'items-start'}`}>
                                                <div className={`relative px-4 py-2.5 text-sm leading-relaxed ${
                                                    isSent ? 'chat-bubble-sent' : 'chat-bubble-received'
                                                } ${msg.status === 'failed' ? 'opacity-70 ring-1 ring-crimson/40' : ''} ${
                                                    msg.status === 'sending' ? 'opacity-80' : ''
                                                }`}>
                                                    {msg.content}
                                                    {/* Hover time — Instagram style */}
                                                    <span
                                                        className={`pointer-events-none absolute ${
                                                            isSent ? 'right-full mr-2' : 'left-full ml-2'
                                                        } top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-ivory-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                                                    >
                                                        {msg.status === 'sending' ? 'Sending…' : clockTime(msg.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Under-bubble: ticks only on last of cluster; full time on hover (Instagram) */}
                                                {(isClusterTail || msg.status === 'sending' || msg.status === 'failed') && (
                                                    <div
                                                        className={`flex items-center gap-1.5 text-ivory-600 text-[10px] ${
                                                            isSent ? 'flex-row-reverse' : ''
                                                        }`}
                                                    >
                                                        {(msg.status === 'sending' || msg.status === 'failed') && (
                                                            <span>{msg.status === 'sending' ? 'Sending…' : clockTime(msg.createdAt)}</span>
                                                        )}
                                                        {msg.status !== 'sending' && msg.status !== 'failed' && (
                                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {clockTime(msg.createdAt)}
                                                            </span>
                                                        )}
                                                        {isSent && <MessageTicks msg={msg} />}
                                                        {isSent && msg.status === 'failed' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => retryFailed(msg)}
                                                                className="inline-flex items-center gap-0.5 text-crimson-300 hover:text-crimson-200"
                                                                title="Retry"
                                                            >
                                                                <RotateCcw className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        {msg.expiresAt && (
                                                            <div className="flex items-center gap-0.5 text-gold-600">
                                                                <Timer className="w-2.5 h-2.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {!isClusterTail && msg.status !== 'sending' && msg.status !== 'failed' && (
                                                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-ivory-600 ${isSent ? 'flex-row-reverse' : ''}`}>
                                                        <span>{clockTime(msg.createdAt)}</span>
                                                        {isSent && <MessageTicks msg={msg} />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {partnerTyping && (
                                <div className="flex items-end gap-2 mt-3 mb-1 animate-fade-in">
                                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-tryst-border">
                                        <Image
                                            src={activeMatch.avatarUrl || DEFAULT_AVATAR}
                                            alt={partnerName}
                                            width={28}
                                            height={28}
                                            className="object-cover w-full h-full"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="flex flex-col items-start gap-1 max-w-xs">
                                        <span className="text-[11px] font-medium text-crimson-300 px-1">
                                            {partnerName} is typing…
                                        </span>
                                        <div className="chat-bubble-received px-4 py-2.5 flex items-center gap-1.5">
                                            {[0, 0.15, 0.3].map((d) => (
                                                <div
                                                    key={d}
                                                    className="w-1.5 h-1.5 bg-ivory-400 rounded-full animate-typing"
                                                    style={{ animationDelay: `${d}s` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-tryst-border bg-tryst-bg-2">
                            {showEmoji && (
                                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-tryst-card rounded-xl border border-tryst-border">
                                    {EMOJIS.map(e => (
                                        <button key={e} type="button" onClick={() => handleInputChange(inputText + e)} className="text-xl hover:scale-110 transition-transform">{e}</button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button type="button" onClick={() => setShowEmoji(p => !p)} className="w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200 flex-shrink-0">
                                    <Smile className="w-4 h-4" />
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => handleInputChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSend()
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault()
                                                cancelDraft()
                                            }
                                        }}
                                        placeholder={`Message ${activeMatch.alias}...`}
                                        className="tryst-input py-2.5 text-sm pr-10"
                                    />
                                    {inputText.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={cancelDraft}
                                            title="Cancel (Esc) — don’t send"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-ivory-500 hover:text-ivory-200 hover:bg-tryst-bg"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <button type="button" className="hidden sm:flex w-9 h-9 rounded-full bg-tryst-card border border-tryst-border items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors flex-shrink-0">
                                    <Mic className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!inputText.trim()}
                                    className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center text-white shadow-crimson hover:shadow-crimson-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    title="Send"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 justify-center">
                                <AlertTriangle className="w-3 h-3 text-ivory-600" />
                                <p className="text-ivory-600 text-xs">Hover a message for time · Esc cancels draft</p>
                            </div>
                        </div>

                        <ChatPartnerProfile
                            partner={activeMatch}
                            open={showPartnerProfile}
                            onClose={() => setShowPartnerProfile(false)}
                            canCall={!!callConsent?.canCall}
                            onAudioCall={startAudioCall}
                            onVideoCall={startVideoCall}
                        />

                        <CallOverlay
                            open={call.phase !== 'idle' && call.phase !== 'ended'}
                            phase={call.phase}
                            mode={call.mode}
                            partnerName={partnerName}
                            partnerAvatar={activeMatch.avatarUrl || activeMatch.photoUrls?.[0]}
                            muted={call.muted}
                            onHold={call.onHold}
                            cameraOff={call.cameraOff}
                            speakerOn={call.speakerOn}
                            elapsed={call.elapsed}
                            onAccept={() => void call.acceptCall()}
                            onDecline={call.declineCall}
                            onEnd={() => call.endCall(true)}
                            onToggleMute={call.toggleMute}
                            onToggleHold={call.toggleHold}
                            onToggleCamera={call.toggleCamera}
                            onToggleSpeaker={call.toggleSpeaker}
                            setLocalVideoEl={call.setLocalVideoEl}
                            setRemoteVideoEl={call.setRemoteVideoEl}
                            setRemoteAudioEl={call.setRemoteAudioEl}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
