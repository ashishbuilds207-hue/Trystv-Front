'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, X, Star, Loader2, Plus } from 'lucide-react'
import { userApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'

const MAX_PHOTOS = 6
import { publicConfig } from '@/lib/config'

const API_BASE = publicConfig.apiOrigin

interface Props {
    photos: string[]
    avatarUrl?: string | null
    onUpdate?: () => void
}

export default function ProfilePhotoUpload({ photos, avatarUrl, onUpdate }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState<number | null>(null)
    const toast = useToast()
    const qc = useQueryClient()

    const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] || null)
    const canAdd = photos.length < MAX_PHOTOS

    const fullUrl = (url: string) => url.startsWith('http') ? url : `${API_BASE}${url}`

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        if (photos.length + files.length > MAX_PHOTOS) {
            toast.error('Photo limit', `Maximum ${MAX_PHOTOS} photos allowed`)
            return
        }

        setUploading(true)
        try {
            const fd = new FormData()
            files.forEach(f => fd.append('photos', f))
            await userApi.uploadPhotos(fd)
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            qc.invalidateQueries({ queryKey: ['me'] })
            qc.invalidateQueries({ queryKey: ['profile-completion'] })
            toast.success('Photos added', `${files.length} photo(s) uploaded`)
            onUpdate?.()
        } catch {
            toast.error('Upload failed', 'Please try again')
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const handleDelete = async (index: number) => {
        setDeleting(index)
        try {
            await userApi.deletePhoto(index)
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            qc.invalidateQueries({ queryKey: ['me'] })
            qc.invalidateQueries({ queryKey: ['profile-completion'] })
            onUpdate?.()
        } catch {
            toast.error('Delete failed')
        } finally {
            setDeleting(null)
        }
    }

    const handleSetAvatar = async (index: number) => {
        try {
            await userApi.setAvatarPhoto(index)
            qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            toast.success('Main photo updated')
        } catch {
            toast.error('Could not set main photo')
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-gold-400">Your Photos</p>
                <span className="text-xs text-ivory-500">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {slots.map((url, i) => (
                    <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-tryst-border bg-tryst-card group">
                        {url ? (
                            <>
                                <Image src={fullUrl(url)} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                                {avatarUrl === url && (
                                    <div className="absolute top-1.5 left-1.5 bg-gold/90 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <Star className="w-2.5 h-2.5" fill="currentColor" /> MAIN
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {avatarUrl !== url && (
                                        <button onClick={() => handleSetAvatar(i)}
                                            className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold-400">
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(i)} disabled={deleting === i}
                                        className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson-300">
                                        {deleting === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </>
                        ) : i === photos.length && canAdd ? (
                            <button onClick={() => inputRef.current?.click()} disabled={uploading}
                                className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-ivory-500 hover:text-gold-400 hover:border-gold/30 transition-colors">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin text-crimson" /> : (
                                    <>
                                        <Plus className="w-6 h-6" />
                                        <span className="text-[10px]">Add photo</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                <Camera className="w-6 h-6 text-ivory-600" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                className="hidden" onChange={handleUpload} />
        </div>
    )
}
