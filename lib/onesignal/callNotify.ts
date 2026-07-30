import type { CallMode } from '@/lib/hooks/useTwilioCall'
import type { OneSignalNotifyKind } from './types'

export function callNotifyCopy(mode: CallMode, fromAlias?: string | null) {
    const name = (fromAlias || '').trim() || 'Your match'
    const isVideo = mode === 'video'
    return {
        kind: (isVideo ? 'video_call' : 'audio_call') as OneSignalNotifyKind,
        mode: (isVideo ? 'video' : 'audio') as CallMode,
        title: isVideo ? '📹 Incoming video call' : '📞 Incoming audio call',
        body: isVideo
            ? `${name} is video calling you — tap to answer`
            : `${name} is calling you — tap to answer`,
        shortLabel: isVideo ? 'Incoming video call' : 'Incoming audio call',
        toastBody: isVideo ? `${name} · Video` : `${name} · Audio`,
    }
}

export function callDeepLink(matchId: string, mode: CallMode) {
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const path = `/chat?match=${encodeURIComponent(matchId)}&call=${mode}`
    return base ? `${base}${path}` : path
}
