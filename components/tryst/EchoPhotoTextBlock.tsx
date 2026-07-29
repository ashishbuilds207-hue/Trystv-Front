'use client'

import { resolveMediaUrl } from '@/lib/resolveMediaUrl'

interface EchoPhotoTextBlockProps {
    mediaUrl?: string | null
    textBody?: string | null
    variant?: 'feed' | 'mine'
}

/** Image on top, text in bottom bar — same layout on feed and My Echoes */
export default function EchoPhotoTextBlock({
    mediaUrl,
    textBody,
    variant = 'mine',
}: EchoPhotoTextBlockProps) {
    if (!mediaUrl && !textBody) return null

    return (
        <div className={`echo-mine-text-block ${variant === 'feed' ? 'echo-photo-block--feed' : ''}`}>
            {mediaUrl && (
                <img
                    src={resolveMediaUrl(mediaUrl)}
                    alt=""
                    className="echo-mine-photo"
                />
            )}
            {textBody && (
                <p className="echo-mine-text-bottom">{textBody}</p>
            )}
        </div>
    )
}
