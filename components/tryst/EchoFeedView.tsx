'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, ThumbsDown, Plus, User, Flag, Loader2, Radio } from 'lucide-react'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import {
    useEchoFeed, useEchoLike, useEchoDislike, type EchoItem,
} from '@/lib/hooks/useFeatures'
import { resolveMediaUrl } from '@/lib/resolveMediaUrl'
import { echoApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import EchoPhotoTextBlock from '@/components/tryst/EchoPhotoTextBlock'

function EchoSlide({
    echo,
    active,
    onReacted,
}: {
    echo: EchoItem
    active: boolean
    onReacted: () => void
}) {
    const like = useEchoLike()
    const dislike = useEchoDislike()
    const toast = useToast()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [liked, setLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(echo.likeCount)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const v = videoRef.current
        if (!v || echo.type !== 'VIDEO') return
        if (active) v.play().catch(() => {})
        else {
            v.pause()
            v.currentTime = 0
        }
    }, [active, echo.type])

    const handleLike = async () => {
        if (busy) return
        setBusy(true)
        try {
            const { data } = await like.mutateAsync(echo.id)
            const payload = data.data as { liked: boolean; likeCount: number }
            setLiked(payload.liked)
            setLikeCount(payload.likeCount)
            if (payload.liked) onReacted()
        } finally {
            setBusy(false)
        }
    }

    const handleDislike = async () => {
        if (busy) return
        setBusy(true)
        try {
            await dislike.mutateAsync(echo.id)
            onReacted()
        } finally {
            setBusy(false)
        }
    }

    const handleReport = async () => {
        try {
            await echoApi.report(echo.id, 'Inappropriate content')
            toast.info('Reported', 'Thank you — our team will review')
        } catch {
            toast.error('Could not report')
        }
    }

    const themeClass = `echo-theme--${echo.bgTheme || 'noir'}`
    const hasPhoto = echo.type === 'TEXT' && !!echo.mediaUrl
    const textOnly = echo.type === 'TEXT' && !echo.mediaUrl

    const actionBar = (
        <div className="echo-action-bar">
            <button
                type="button"
                className={`echo-action-btn ${liked ? 'echo-action-btn--liked' : ''}`}
                onClick={handleLike}
                disabled={busy}
                aria-label="Like"
            >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                <span>Like</span>
                {likeCount > 0 && <span className="echo-action-count">{likeCount}</span>}
            </button>
            <button
                type="button"
                className="echo-action-btn"
                onClick={handleDislike}
                disabled={busy}
                aria-label="Dislike"
            >
                <ThumbsDown className="w-5 h-5" />
                <span>Dislike</span>
            </button>
            <button
                type="button"
                className="echo-action-btn echo-action-btn--muted"
                onClick={handleReport}
                aria-label="Report"
            >
                <Flag className="w-4 h-4" />
                <span>Report</span>
            </button>
        </div>
    )

    return (
        <section className={`echo-slide ${hasPhoto ? 'echo-slide--photo-post' : ''}`}>
            {hasPhoto ? (
                <div className="echo-phone-post">
                    <EchoPhotoTextBlock
                        variant="feed"
                        mediaUrl={echo.mediaUrl}
                        textBody={echo.textBody}
                    />
                    <div className="echo-feed-meta">
                        <div className="echo-author-row">
                            <ProfileAvatar seed={echo.author.alias} src={echo.author.avatarUrl} size={36} />
                            <div className="min-w-0">
                                <p className="echo-author-alias">{echo.author.alias}</p>
                                <p className="echo-author-sub">
                                    {echo.author.archetype || 'Echo'} · {echo.author.city || echo.cityCluster}
                                </p>
                            </div>
                        </div>
                        {echo.caption && <p className="echo-caption">{echo.caption}</p>}
                        {actionBar}
                    </div>
                </div>
            ) : (
                <>
                    <div className="echo-slide-media">
                        {textOnly && (
                            <div className={`echo-text-card ${themeClass}`}>
                                {echo.textBody && (
                                    <p className="echo-text-body">{echo.textBody}</p>
                                )}
                            </div>
                        )}
                        {echo.type === 'VIDEO' && echo.mediaUrl && (
                            <video
                                ref={videoRef}
                                className={`echo-video ${echo.faceBlurred ? 'echo-video--blur' : ''}`}
                                src={resolveMediaUrl(echo.mediaUrl)}
                                playsInline
                                loop
                                muted
                            />
                        )}
                        {echo.type === 'AUDIO' && (
                            <div className={`echo-audio-card ${themeClass}`}>
                                <Radio className="w-12 h-12 text-gold-400 opacity-80" />
                                <audio
                                    controls
                                    className="echo-audio-player"
                                    src={resolveMediaUrl(echo.mediaUrl)}
                                />
                                {echo.voiceMasked && (
                                    <span className="echo-mask-badge">Voice masked</span>
                                )}
                            </div>
                        )}
                        <div className="echo-slide-gradient" />
                    </div>

                    <div className="echo-slide-meta">
                        <div className="echo-author-row">
                            <ProfileAvatar seed={echo.author.alias} src={echo.author.avatarUrl} size={36} />
                            <div className="min-w-0">
                                <p className="echo-author-alias">{echo.author.alias}</p>
                                <p className="echo-author-sub">
                                    {echo.author.archetype || 'Echo'} · {echo.author.city || echo.cityCluster}
                                </p>
                            </div>
                        </div>
                        {echo.caption && <p className="echo-caption">{echo.caption}</p>}
                        {actionBar}
                    </div>
                </>
            )}
        </section>
    )
}

export default function EchoFeedView() {
    const { data, isLoading, refetch } = useEchoFeed()
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState<EchoItem[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (data?.echoes) {
            setVisible(data.echoes)
            setIndex(0)
        }
    }, [data])

    const scrollTo = useCallback((i: number) => {
        const el = containerRef.current
        if (!el) return
        const h = el.clientHeight
        el.scrollTo({ top: i * h, behavior: 'smooth' })
        setIndex(i)
    }, [])

    const onReacted = useCallback(() => {
        setVisible((prev) => {
            const next = prev.filter((_, i) => i !== index)
            if (index >= next.length && next.length > 0) {
                setTimeout(() => scrollTo(Math.max(0, next.length - 1)), 100)
            }
            return next
        })
        refetch()
    }, [index, refetch, scrollTo])

    const onScroll = () => {
        const el = containerRef.current
        if (!el || !el.clientHeight) return
        const i = Math.round(el.scrollTop / el.clientHeight)
        if (i !== index) setIndex(i)
    }

    if (isLoading) {
        return (
            <div className="echo-shell echo-shell--loading">
                <Loader2 className="w-8 h-8 animate-spin text-crimson" />
            </div>
        )
    }

    if (!visible.length) {
        return (
            <div className="echo-shell echo-empty">
                <Radio className="w-14 h-14 text-crimson/60 mb-4" />
                <h2 className="font-playfair text-xl text-ivory-100 mb-2">No Echoes yet</h2>
                <p className="text-ivory-500 text-sm text-center max-w-xs mb-6">
                    Be the first in {data?.city || 'your city'} to share a discreet expression.
                </p>
                <Link href="/echoes/new" className="echo-compose-cta">
                    <Plus className="w-4 h-4" /> Post an Echo
                </Link>
                <Link href="/echoes/mine" className="echo-mine-link">
                    <User className="w-4 h-4" /> My Echoes
                </Link>
            </div>
        )
    }

    return (
        <div className="echo-shell">
            <div className="echo-top-bar">
                <span className="echo-top-kicker">Echoes</span>
                <span className="echo-top-city">{data?.city}</span>
                <div className="echo-top-actions">
                    <Link href="/echoes/mine" className="echo-top-icon" aria-label="My Echoes">
                        <User className="w-5 h-5" />
                    </Link>
                    <Link href="/echoes/new" className="echo-top-icon echo-top-icon--accent" aria-label="New Echo">
                        <Plus className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            <div
                ref={containerRef}
                className="echo-reel"
                onScroll={onScroll}
            >
                {visible.map((echo, i) => (
                    <EchoSlide
                        key={echo.id}
                        echo={echo}
                        active={i === index}
                        onReacted={onReacted}
                    />
                ))}
            </div>
        </div>
    )
}
