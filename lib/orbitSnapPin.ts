import type { OrbitGlobeMarker } from '@/lib/orbitCoords'

export function esc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export function markerLabel(m: OrbitGlobeMarker, meCity?: string | null) {
    if (m.isMe) return meCity || m.alias || 'You'
    return m.profile?.city || m.alias
}

export function snapPinHtml(
    m: OrbitGlobeMarker,
    photo: string,
    opts?: { isPulled?: boolean; ignite?: boolean; meCity?: string | null },
) {
    const label = markerLabel(m, opts?.meCity)
    const cls = [
        'orbit-snap-pin',
        m.isMe ? 'orbit-snap-pin--me' : '',
        m.isOnline ? 'orbit-snap-pin--live' : 'orbit-snap-pin--away',
        opts?.isPulled ? 'orbit-snap-pin--pulled' : '',
        opts?.ignite ? 'orbit-snap-pin--ignite' : '',
    ].filter(Boolean).join(' ')

    return `<div class="${cls}">
        ${m.isMe ? '<div class="orbit-snap-pin-heat"></div>' : ''}
        <div class="orbit-snap-pin-drop">
            <div class="orbit-snap-pin-photo-wrap">
                ${photo
                    ? `<img class="orbit-snap-pin-photo" src="${esc(photo)}" alt="" crossorigin="anonymous" />`
                    : '<span class="orbit-snap-pin-ghost">👤</span>'
                }
                ${m.isOnline ? '<span class="orbit-snap-pin-live-dot"></span>' : ''}
            </div>
            <div class="orbit-snap-pin-tip"></div>
        </div>
        <div class="orbit-snap-pin-label">${esc(label)}</div>
        ${!m.isMe ? `<div class="orbit-snap-pin-sub">${m.matchScore}% · ${m.isOnline ? 'live' : 'away'}</div>` : ''}
    </div>`
}
