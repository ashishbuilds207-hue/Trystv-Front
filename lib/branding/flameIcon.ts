/** Lucide Flame icon — same path as nav `TrystLogo` */
export const FLAME_PATH =
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'

export const TRYST_CRIMSON = '#C0392B'
export const TRYST_BG = '#0D0707'

export function flameSvgDataUrl(size = 24, strokeWidth = 1.5) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${TRYST_CRIMSON}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="${FLAME_PATH}"/></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
