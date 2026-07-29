'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Type, Video, Mic, Loader2, Crown, Camera, X } from 'lucide-react'
import { useCreateEcho } from '@/lib/hooks/useFeatures'
import { useAuthUser } from '@/lib/hooks/useAuth'

const THEMES = [
    { id: 'noir', label: 'Noir' },
    { id: 'crimson', label: 'Crimson' },
    { id: 'gold', label: 'Gold' },
    { id: 'ember', label: 'Ember' },
    { id: 'midnight', label: 'Midnight' },
    { id: 'rose', label: 'Rose' },
]

const LIFESPANS = [
    { id: '24h', label: '24 hours' },
    { id: '72h', label: '72 hours' },
    { id: 'keep', label: 'Keep (Gold)', gold: true },
]

type Tab = 'TEXT' | 'VIDEO' | 'AUDIO'

export default function EchoComposerView() {
    const router = useRouter()
    const create = useCreateEcho()
    const { data: me } = useAuthUser()
    const isGold = me?.isGold || me?.isObsidian

    const [tab, setTab] = useState<Tab>('TEXT')
    const [textBody, setTextBody] = useState('')
    const [caption, setCaption] = useState('')
    const [bgTheme, setBgTheme] = useState('noir')
    const [lifespan, setLifespan] = useState('24h')
    const [faceBlurred, setFaceBlurred] = useState(true)
    const [voiceMasked, setVoiceMasked] = useState(false)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState<string | null>(null)
    const photoRef = useRef<HTMLInputElement>(null)
    const mediaRef = useRef<HTMLInputElement>(null)

    const switchTab = (next: Tab) => {
        setTab(next)
        if (next === 'TEXT') {
            setMediaFile(null)
            if (mediaPreview) URL.revokeObjectURL(mediaPreview)
            setMediaPreview(null)
        } else {
            setPhotoFile(null)
            if (photoPreview) URL.revokeObjectURL(photoPreview)
            setPhotoPreview(null)
        }
    }

    const pickPhoto = (file: File | null) => {
        setPhotoFile(file)
        if (photoPreview) URL.revokeObjectURL(photoPreview)
        setPhotoPreview(file ? URL.createObjectURL(file) : null)
    }

    const pickMedia = (file: File | null) => {
        setMediaFile(file)
        if (mediaPreview) URL.revokeObjectURL(mediaPreview)
        setMediaPreview(file ? URL.createObjectURL(file) : null)
    }

    const submit = async () => {
        const fd = new FormData()
        fd.append('type', tab)
        if (tab === 'TEXT') {
            if (textBody.trim()) fd.append('textBody', textBody.trim())
            if (photoFile) fd.append('media', photoFile)
        } else if (mediaFile) {
            fd.append('media', mediaFile)
        }
        if (caption.trim()) fd.append('caption', caption.trim())
        fd.append('bgTheme', bgTheme)
        fd.append('lifespan', lifespan)
        fd.append('faceBlurred', String(faceBlurred))
        fd.append('voiceMasked', String(voiceMasked))
        fd.append('audience', 'city')

        await create.mutateAsync(fd)
        router.push('/echoes/mine')
    }

    const canSubmit =
        tab === 'TEXT'
            ? (textBody.trim().length > 0 || !!photoFile) && textBody.length <= 280
            : !!mediaFile

    return (
        <div className="echo-composer">
            <header className="echo-composer-head">
                <Link href="/echoes" className="echo-composer-back">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="font-playfair text-lg">New Echo</h1>
                <button
                    type="button"
                    className="echo-composer-post"
                    disabled={!canSubmit || create.isPending}
                    onClick={submit}
                >
                    {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                </button>
            </header>

            <div className="echo-composer-tabs">
                {([
                    ['TEXT', Type, 'Text + Photo'],
                    ['VIDEO', Video, 'Video'],
                    ['AUDIO', Mic, 'Audio'],
                ] as const).map(([id, Icon, label]) => (
                    <button
                        key={id}
                        type="button"
                        className={`echo-composer-tab ${tab === id ? 'echo-composer-tab--on' : ''}`}
                        onClick={() => switchTab(id)}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="echo-composer-body">
                {tab === 'TEXT' && (
                    <div className={`echo-text-compose echo-theme--${bgTheme}`}>
                        <input
                            ref={photoRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => pickPhoto(e.target.files?.[0] || null)}
                        />
                        {photoPreview ? (
                            <div className="echo-compose-photo-wrap">
                                <img src={photoPreview} alt="" className="echo-compose-photo" />
                                <button
                                    type="button"
                                    className="echo-compose-photo-remove"
                                    onClick={() => pickPhoto(null)}
                                    aria-label="Remove photo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="echo-compose-photo-add"
                                onClick={() => photoRef.current?.click()}
                            >
                                <Camera className="w-5 h-5" />
                                <span>Add photo (optional)</span>
                            </button>
                        )}
                        <textarea
                            className="echo-compose-textarea"
                            placeholder="Write your Echo… (optional if you add a photo, 280 max)"
                            maxLength={280}
                            value={textBody}
                            onChange={(e) => setTextBody(e.target.value)}
                            rows={5}
                        />
                        <p className="echo-composer-count">{textBody.length}/280</p>
                        <div className="echo-theme-picker">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={`echo-theme-swatch echo-theme--${t.id} ${bgTheme === t.id ? 'echo-theme-swatch--on' : ''}`}
                                    onClick={() => setBgTheme(t.id)}
                                    title={t.label}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'VIDEO' && (
                    <div className="echo-media-picker">
                        <input
                            ref={mediaRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => pickMedia(e.target.files?.[0] || null)}
                        />
                        {mediaPreview ? (
                            <div className="echo-compose-video-wrap">
                                <video src={mediaPreview} controls playsInline className="echo-compose-video" />
                                <button
                                    type="button"
                                    className="echo-compose-photo-remove"
                                    onClick={() => pickMedia(null)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="echo-media-btn echo-media-btn--large"
                                onClick={() => mediaRef.current?.click()}
                            >
                                <Video className="w-6 h-6 text-crimson mb-2" />
                                Choose video (max 8MB, 30s recommended)
                            </button>
                        )}
                        {mediaFile && (
                            <p className="text-xs text-ivory-500 mt-2 truncate">{mediaFile.name}</p>
                        )}
                        <label className="echo-toggle-row">
                            <span>Face blur {!isGold && '(Gold to remove)'}</span>
                            <input
                                type="checkbox"
                                checked={faceBlurred}
                                disabled={!isGold}
                                onChange={(e) => setFaceBlurred(e.target.checked)}
                            />
                        </label>
                    </div>
                )}

                {tab === 'AUDIO' && (
                    <div className="echo-media-picker">
                        <input
                            ref={mediaRef}
                            type="file"
                            accept="audio/mpeg,audio/mp4,audio/webm,audio/aac"
                            className="hidden"
                            onChange={(e) => pickMedia(e.target.files?.[0] || null)}
                        />
                        {mediaPreview ? (
                            <div className="echo-compose-audio-wrap">
                                <audio src={mediaPreview} controls className="echo-audio-player w-full" />
                                <button
                                    type="button"
                                    className="echo-compose-photo-remove echo-compose-photo-remove--inline"
                                    onClick={() => pickMedia(null)}
                                >
                                    <X className="w-4 h-4" /> Remove
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="echo-media-btn echo-media-btn--large"
                                onClick={() => mediaRef.current?.click()}
                            >
                                <Mic className="w-6 h-6 text-crimson mb-2" />
                                Choose audio (max 8MB, 60s recommended)
                            </button>
                        )}
                        {mediaFile && (
                            <p className="text-xs text-ivory-500 mt-2 truncate">{mediaFile.name}</p>
                        )}
                        <label className="echo-toggle-row">
                            <span className="inline-flex items-center gap-1">
                                Voice mask {!isGold && <Crown className="w-3 h-3 text-gold-400" />}
                            </span>
                            <input
                                type="checkbox"
                                checked={voiceMasked}
                                disabled={!isGold}
                                onChange={(e) => setVoiceMasked(e.target.checked)}
                            />
                        </label>
                    </div>
                )}

                <input
                    className="echo-composer-caption"
                    placeholder="Caption (optional, 80 chars)"
                    maxLength={80}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />

                <div className="echo-lifespan-row">
                    {LIFESPANS.map((l) => (
                        <button
                            key={l.id}
                            type="button"
                            disabled={l.gold && !isGold}
                            className={`echo-lifespan-chip ${lifespan === l.id ? 'echo-lifespan-chip--on' : ''} ${l.gold && !isGold ? 'opacity-50' : ''}`}
                            onClick={() => setLifespan(l.id)}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>

                {!isGold && (
                    <p className="echo-limit-note">
                        Free: 3 text/day · 1 video or audio/week. Gold = unlimited + who-liked.
                    </p>
                )}
            </div>
        </div>
    )
}
