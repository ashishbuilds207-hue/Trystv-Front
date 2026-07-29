'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Heart, Crown, Loader2, Radio } from 'lucide-react'
import ProfileAvatar from '@/components/tryst/ProfileAvatar'
import {
    useMyEchoes, useDeleteEcho, useEchoLikers, type EchoItem,
} from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'
import { resolveMediaUrl } from '@/lib/resolveMediaUrl'
import EchoPhotoTextBlock from '@/components/tryst/EchoPhotoTextBlock'

function EchoMineCard({
    echo,
    isGold,
    onDelete,
    deleting,
}: {
    echo: EchoItem
    isGold: boolean
    onDelete: (id: string) => void
    deleting: boolean
}) {
    const [showLikers, setShowLikers] = useState(false)
    const { data: likers = [], isLoading } = useEchoLikers(echo.id, showLikers && isGold)

    return (
        <article className="echo-mine-card">
            <div className="echo-mine-card-top">
                <span className={`echo-mine-type echo-mine-type--${echo.type.toLowerCase()}`}>
                    {echo.type}
                </span>
                <span className="echo-mine-status">{echo.status}</span>
                <button
                    type="button"
                    className="echo-mine-delete"
                    onClick={() => onDelete(echo.id)}
                    disabled={deleting}
                    aria-label="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {echo.type === 'TEXT' && (
                <EchoPhotoTextBlock
                    mediaUrl={echo.mediaUrl}
                    textBody={echo.textBody}
                    variant="mine"
                />
            )}
            {echo.type === 'VIDEO' && echo.mediaUrl && (
                <video className="echo-mine-video" src={resolveMediaUrl(echo.mediaUrl)} controls playsInline />
            )}
            {echo.type === 'AUDIO' && echo.mediaUrl && (
                <audio className="echo-mine-audio" src={resolveMediaUrl(echo.mediaUrl)} controls />
            )}
            {echo.caption && <p className="echo-mine-caption">{echo.caption}</p>}

            <div className="echo-mine-footer">
                <span className="echo-mine-likes">
                    <Heart className="w-4 h-4" /> {echo.likeCount}
                </span>
                <span className="echo-mine-time">
                    {new Date(echo.createdAt).toLocaleDateString()}
                </span>
                {isGold ? (
                    <button
                        type="button"
                        className="echo-mine-wholiked"
                        onClick={() => setShowLikers((v) => !v)}
                    >
                        Who liked
                    </button>
                ) : (
                    <Link href="/gold" className="echo-mine-gold-hint">
                        <Crown className="w-3 h-3" /> Gold to see likers
                    </Link>
                )}
            </div>

            {showLikers && isGold && (
                <div className="echo-likers-panel">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {!isLoading && likers.length === 0 && (
                        <p className="text-xs text-ivory-500">No likes yet</p>
                    )}
                    {likers.map((l) => (
                        <div key={l.id} className="echo-liker-row">
                            <ProfileAvatar seed={l.alias} src={l.avatarUrl} size={28} />
                            <span>{l.alias}</span>
                            <span className="text-ivory-600 text-xs">{l.archetype}</span>
                        </div>
                    ))}
                </div>
            )}
        </article>
    )
}

export default function EchoMineView() {
    const { data: echoes = [], isLoading } = useMyEchoes()
    const deleteEcho = useDeleteEcho()
    const { data: me } = useAuthUser()
    const isGold = me?.isGold || me?.isObsidian

    return (
        <div className="echo-mine-page">
            <header className="echo-composer-head">
                <Link href="/echoes" className="echo-composer-back">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="font-playfair text-lg">My Echoes</h1>
                <Link href="/echoes/new" className="echo-top-icon echo-top-icon--accent">
                    <Plus className="w-5 h-5" />
                </Link>
            </header>

            {isLoading && (
                <div className="echo-shell echo-shell--loading py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-crimson" />
                </div>
            )}

            {!isLoading && echoes.length === 0 && (
                <div className="echo-empty py-16">
                    <Radio className="w-12 h-12 text-crimson/50 mb-3" />
                    <p className="text-ivory-500 text-sm mb-4">You haven&apos;t posted any Echoes yet.</p>
                    <Link href="/echoes/new" className="echo-compose-cta">
                        <Plus className="w-4 h-4" /> Create your first Echo
                    </Link>
                </div>
            )}

            <div className="echo-mine-list">
                {echoes.map((echo) => (
                    <EchoMineCard
                        key={echo.id}
                        echo={echo}
                        isGold={!!isGold}
                        deleting={deleteEcho.isPending}
                        onDelete={(id) => deleteEcho.mutate(id)}
                    />
                ))}
            </div>
        </div>
    )
}
