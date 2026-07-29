/** Globe altitude (globe radii) ↔ map zoom helpers */

export const ALT_MIN = 0.72
export const ALT_MAX = 2.85
export const ALT_HOME = 1.12
export const ALT_WORLD = 2.55
export const ALT_STREET_IN = 1.08
export const MAP_ZOOM_STREET = 14
export const MAP_ZOOM_EXIT = 9
export const MAP_ZOOM_MIN = 8
export const MAP_ZOOM_MAX = 17

export const TRANSITION_MS = 900
export const TRANSITION_HALF = TRANSITION_MS / 2
export const FLY_TO_CITY_MS = 650

export function altToMapZoom(alt: number): number {
    const a = Math.max(ALT_MIN, Math.min(0.96, alt))
    const t = (0.96 - a) / (0.96 - ALT_MIN)
    return Math.round(10 + t * (MAP_ZOOM_MAX - 10))
}

export function mapZoomToAlt(zoom: number): number {
    const z = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, zoom))
    const t = (MAP_ZOOM_MAX - z) / (MAP_ZOOM_MAX - 10)
    return ALT_MIN + t * (0.96 - ALT_MIN)
}

/** 0 = full Earth view, 1 = full road map */
export function globeAltToProgress(alt: number): number {
    if (alt >= ALT_STREET_IN) return 0
    if (alt <= ALT_MIN) return 1
    return 1 - (alt - ALT_MIN) / (ALT_STREET_IN - ALT_MIN)
}

export function mapZoomToProgress(zoom: number): number {
    if (zoom <= MAP_ZOOM_EXIT) return 0
    if (zoom >= MAP_ZOOM_STREET) return 1
    return (zoom - MAP_ZOOM_EXIT) / (MAP_ZOOM_STREET - MAP_ZOOM_EXIT)
}

export function progressLabel(progress: number): 'earth' | 'blend' | 'map' {
    if (progress <= 0.08) return 'earth'
    if (progress >= 0.92) return 'map'
    return 'blend'
}
