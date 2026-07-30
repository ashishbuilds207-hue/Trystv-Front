export type OneSignalNotifyKind = 'message' | 'audio_call' | 'video_call' | 'match' | 'like' | 'generic'

export interface OneSignalNotifyPayload {
    /** Recipient TRYST user id (OneSignal external_id) */
    toUserId: string
    kind: OneSignalNotifyKind
    title: string
    body: string
    /** Deep-link / suppress key */
    matchId?: string
    callId?: string
    mode?: 'audio' | 'video'
    url?: string
    data?: Record<string, string>
}

export interface OneSignalRegisterPayload {
    playerId?: string | null
    subscriptionId?: string | null
}
