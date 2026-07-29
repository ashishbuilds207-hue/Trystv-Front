'use client'

import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { useAppStore } from '@/lib/store/useAppStore'
import { cn } from '@/lib/utils'

type DotSize = 'sm' | 'md'

/** Green = online, gray = offline — driven by presence socket. */
export function OnlineDot({
    online,
    size = 'sm',
    className,
    borderClass = 'border-tryst-card',
}: {
    online: boolean
    size?: DotSize
    className?: string
    borderClass?: string
}) {
    const dim = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'
    return (
        <span
            title={online ? 'Online' : 'Offline'}
            className={cn(
                'rounded-full border-2 shrink-0',
                dim,
                online ? 'bg-emerald-400 animate-pulse' : 'bg-ivory-600',
                borderClass,
                className,
            )}
        />
    )
}

/** Header / rail badge for the signed-in user. */
export function SelfOnlineBadge({ className }: { className?: string }) {
    const isOnline = useSelfOnline()
    const isGhostMode = useAppStore((s) => s.isGhostMode)

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-full border',
                isOnline
                    ? 'bg-success/10 text-success border-success/25'
                    : 'bg-ivory-800/40 text-ivory-500 border-tryst-border',
                className,
            )}
            title={isGhostMode ? 'Hidden in Ghost Mode' : isOnline ? 'You are online' : 'You are offline'}
        >
            <span
                className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-ivory-600',
                )}
            />
            {isGhostMode ? 'Ghost' : isOnline ? 'Online' : 'Offline'}
        </span>
    )
}

export function useSelfOnline(): boolean {
    const currentUserId = useAppStore((s) => s.currentUserId)
    const isGhostMode = useAppStore((s) => s.isGhostMode)
    const connected = usePresenceStore((s) => s.connected)
    const synced = usePresenceStore((s) => s.synced)
    const inPresence = usePresenceStore((s) => !!(currentUserId && s.onlineIds[currentUserId]))
    if (isGhostMode) return false
    if (synced) return inPresence
    return connected
}
