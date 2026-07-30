'use client'

/**
 * Tracks which chat is currently open so push / in-app alerts can be suppressed.
 * Mirrored from joinChat / leaveChat in useSocket.
 */

let activeMatchId: string | null = null

export function setActiveChatMatchId(matchId: string | null) {
    activeMatchId = matchId
}

export function getActiveChatMatchId() {
    return activeMatchId
}

/** True when the user is viewing this match's chat — no push for that conversation. */
export function shouldSuppressChatNotification(matchId?: string | null) {
    if (!matchId) return false
    return activeMatchId === matchId
}
