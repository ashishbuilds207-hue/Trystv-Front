'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Send, Timer, Lock, Mic, ArrowLeft, MoreVertical, CheckCircle2, MapPin, AlertTriangle, Flame, Loader2, Phone, PhoneOff } from 'lucide-react'
import { useMatches, useMessages, useSendMessage, type Message } from '@/lib/hooks/useDiscover'
import { useCallConsent, useSetCallConsent } from '@/lib/hooks/useFeatures'
import { getSocket } from '@/lib/hooks/useSocket'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

const TIMER_LABELS: Record<string, string> = { '24h': '24 hours', '72h': '72 hours', '7d': '7 days', never: 'Never' }

function msgTime(d: string) {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }) } catch { return '' }
}

export default function ChatPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const qc = useQueryClient()

    const { data: matches = [], isLoading: matchesLoading } = useMatches()
    const [activeMatchId, setActiveMatchId] = useState<string | null>(searchParams.get('match'))
    const [inputText, setInputText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [showDeleteMenu, setShowDeleteMenu] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const activeMatch = matches.find(m => m.id === activeMatchId) ?? null
    const { data: chatData, isLoading: messagesLoading } = useMessages(activeMatchId)
    const messages: Message[] = chatData?.messages ?? []
    const deleteTimer = chatData?.deleteTimer ?? 'never'
    const sendMessage = useSendMessage()
    const { data: callConsent } = useCallConsent(activeMatchId)
    const setCallConsent = useSetCallConsent()

    // Auto-scroll
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    // Join socket room when match selected
    useEffect(() => {
        const socket = getSocket()
        if (!socket || !activeMatchId) return
        socket.emit('join_chat', activeMatchId)
        socket.on('new_message', ({ matchId }: { matchId: string }) => {
            if (matchId === activeMatchId) qc.invalidateQueries({ queryKey: ['messages', matchId] })
            qc.invalidateQueries({ queryKey: ['matches'] })
        })
        socket.on('partner_typing', ({ isTyping: t }: { isTyping: boolean }) => setIsTyping(t))
        return () => {
            socket.emit('leave_chat', activeMatchId)
            socket.off('new_message')
            socket.off('partner_typing')
        }
    }, [activeMatchId, qc])

    // Emit typing indicator
    const handleInputChange = (val: string) => {
        setInputText(val)
        const socket = getSocket()
        if (socket && activeMatchId) {
            socket.emit('typing', { matchId: activeMatchId, isTyping: val.length > 0 })
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
            typingTimerRef.current = setTimeout(() => {
                socket.emit('typing', { matchId: activeMatchId, isTyping: false })
            }, 2000)
        }
    }

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || !activeMatchId) return
        const text = inputText.trim()
        setInputText('')
        const socket = getSocket()
        if (socket) socket.emit('typing', { matchId: activeMatchId, isTyping: false })
        await sendMessage.mutateAsync({ matchId: activeMatchId, content: text })
    }, [inputText, activeMatchId, sendMessage])

    const selectMatch = (id: string) => {
        setActiveMatchId(id)
        router.replace(`/chat?match=${id}`, { scroll: false })
    }

    if (matchesLoading) return (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <Loader2 className="w-7 h-7 text-crimson animate-spin" />
        </div>
    )

    return (
        <div className="flex h-[calc(100vh-80px)] w-full">
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
                                    <Image src={match.avatarUrl || match.photoUrls?.[0]} alt={match.alias} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-tryst-bg" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-ivory-200 text-sm font-medium">{match.alias}</span>
                                    {match.lastMessageAt && <span className="text-ivory-600 text-xs">{msgTime(match.lastMessageAt)}</span>}
                                </div>
                                <p className="text-ivory-500 text-xs truncate mt-0.5">
                                    {match.lastMessage ?? 'Start a conversation...'}
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
                        {/* Header */}
                        <div className="flex items-center gap-4 px-4 py-3 border-b border-tryst-border bg-tryst-bg-2">
                            <button onClick={() => setActiveMatchId(null)} className="lg:hidden text-ivory-400 hover:text-ivory-200">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full overflow-hidden">
                                    <Image src={activeMatch.avatarUrl || activeMatch.photoUrls?.[0]} alt={activeMatch.alias} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-tryst-bg-2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-ivory-100 font-semibold text-sm">{activeMatch.alias}</h3>
                                    {activeMatch.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-crimson" />}
                                </div>
                                <p className="text-ivory-500 text-xs flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />{activeMatch.city}
                                </p>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                            </button>
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
                                    <button className="px-4 py-2 bg-crimson rounded-xl text-white text-xs font-medium">Call</button>
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

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="flex items-center gap-2 justify-center py-2">
                                <div className="h-px flex-1 bg-tryst-border" />
                                <div className="flex items-center gap-1.5 text-ivory-600 text-xs">
                                    <Lock className="w-3 h-3" /> End-to-end encrypted
                                </div>
                                <div className="h-px flex-1 bg-tryst-border" />
                            </div>

                            {messagesLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-crimson animate-spin" /></div>
                            ) : messages.map((msg) => {
                                const isSent = msg.senderId === activeMatch.partnerId ? false : true
                                return (
                                    <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'} gap-2`}>
                                        {!isSent && (
                                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-auto">
                                                <Image src={activeMatch.avatarUrl} alt="" width={28} height={28} className="object-cover w-full h-full" unoptimized />
                                            </div>
                                        )}
                                        <div className={`max-w-xs lg:max-w-sm flex flex-col gap-1 ${isSent ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2.5 text-sm leading-relaxed ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                                                {msg.content}
                                            </div>
                                            <div className={`flex items-center gap-1 text-ivory-600 text-xs ${isSent ? 'flex-row-reverse' : ''}`}>
                                                <span>{msgTime(msg.createdAt)}</span>
                                                {msg.expiresAt && (
                                                    <div className="flex items-center gap-0.5 text-gold-600">
                                                        <Timer className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {isTyping && (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                        <Image src={activeMatch.avatarUrl} alt="" width={28} height={28} className="object-cover w-full h-full" unoptimized />
                                    </div>
                                    <div className="chat-bubble-received px-4 py-3 flex items-center gap-1">
                                        {[0, 0.2, 0.4].map((d) => (
                                            <div key={d} className="w-1.5 h-1.5 bg-ivory-400 rounded-full animate-typing" style={{ animationDelay: `${d}s` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-tryst-border bg-tryst-bg-2">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input type="text" value={inputText}
                                        onChange={(e) => handleInputChange(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder={`Message ${activeMatch.alias}...`}
                                        className="tryst-input py-2.5 text-sm" />
                                </div>
                                <button className="w-9 h-9 rounded-full bg-tryst-card border border-tryst-border flex items-center justify-center text-ivory-400 hover:text-ivory-200 transition-colors flex-shrink-0">
                                    <Mic className="w-4 h-4" />
                                </button>
                                <button onClick={handleSend} disabled={!inputText.trim() || sendMessage.isPending}
                                    className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center text-white shadow-crimson hover:shadow-crimson-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 justify-center">
                                <AlertTriangle className="w-3 h-3 text-ivory-600" />
                                <p className="text-ivory-600 text-xs">Use Safe Word to instantly block this conversation</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
