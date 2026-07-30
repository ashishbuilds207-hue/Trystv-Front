/** Shared profile shape used across TRYST UI */

export interface TrystUser {
    id: string
    alias: string
    email?: string | null
    phone?: string | null
    age: number | null
    gender: string | null
    city: string | null
    country: string | null
    bio: string | null
    desireTags: string[]
    relationshipStatus: string | null
    profession: string | null
    avatarUrl: string | null
    photoUrls: string[]
    isVerified: boolean
    isGold: boolean
    isObsidian: boolean
    credits: number
    matchScore: number
    isGhostMode: boolean
    desireArchetype: string | null
    disguiseModeEnabled: boolean
    activeDisguiseSkin: string | null
    isNightMode: boolean
    desireStreakCount: number
    streakLastDate: string | null
    seeking: string | null
    agePrefMin: number | null
    agePrefMax: number | null
    maxDistanceKm: number | null
    createdAt: string | null
    latitude: number | null
    longitude: number | null
    hasLocation: boolean
    heightCm: number | null
    build: string | null
    orientation: string | null
    availabilityMask: number | null
    blurDefault: boolean
    incognitoOnStart: boolean
    showExactDistance: boolean
    profileComplete: boolean
    googleId: string | null
    onesignalPlayerId?: string | null
    lastSeen: string | null
    isOnline: boolean
}

export function sanitizeUser(u: Record<string, unknown> | null | undefined): TrystUser | null {
    if (!u) return null
    const lastSeen = (u.last_seen as string | null) ?? null
    const isOnline = lastSeen
        ? new Date(lastSeen).getTime() > Date.now() - 5 * 60 * 1000
        : false
    return {
        id: String(u.id),
        alias: String(u.alias || ''),
        email: (u.email as string) || null,
        phone: (u.phone as string) || null,
        age: (u.age as number) ?? null,
        gender: (u.gender as string) || null,
        city: (u.city as string) || null,
        country: (u.country as string) || null,
        bio: (u.bio as string) || null,
        desireTags: (u.desire_tags as string[]) || [],
        relationshipStatus: (u.relationship_status as string) || null,
        profession: (u.profession as string) || null,
        avatarUrl: (u.avatar_url as string) || null,
        photoUrls: (u.photo_urls as string[]) || [],
        isVerified: !!u.is_verified,
        isGold: !!u.is_gold,
        isObsidian: !!u.is_obsidian,
        credits: Number(u.credits ?? 0),
        matchScore: Number(u.match_score ?? 0),
        isGhostMode: !!u.is_ghost_mode,
        desireArchetype: (u.desire_archetype as string) || null,
        disguiseModeEnabled: !!u.disguise_mode_enabled,
        activeDisguiseSkin: (u.active_disguise_skin as string) || null,
        isNightMode: !!u.is_night_mode,
        desireStreakCount: Number(u.desire_streak_count ?? 0),
        streakLastDate: (u.streak_last_date as string) || null,
        seeking: (u.seeking as string) || null,
        agePrefMin: (u.age_pref_min as number) ?? null,
        agePrefMax: (u.age_pref_max as number) ?? null,
        maxDistanceKm: (u.max_distance_km as number) ?? null,
        createdAt: (u.created_at as string) || null,
        latitude: (u.latitude as number) ?? null,
        longitude: (u.longitude as number) ?? null,
        hasLocation: u.latitude != null && u.longitude != null,
        heightCm: (u.height_cm as number) ?? null,
        build: (u.build as string) || null,
        orientation: (u.orientation as string) || null,
        availabilityMask: (u.availability_mask as number) ?? null,
        blurDefault: u.blur_default !== false,
        incognitoOnStart: !!u.incognito_on_start,
        showExactDistance: !!u.show_exact_distance,
        profileComplete: !!u.profile_complete,
        googleId: (u.google_id as string) || null,
        onesignalPlayerId: (u.onesignal_player_id as string) || null,
        lastSeen,
        isOnline,
    }
}

export function toSnakeProfilePatch(data: Record<string, unknown>) {
    const map: Record<string, string> = {
        alias: 'alias',
        age: 'age',
        gender: 'gender',
        bio: 'bio',
        city: 'city',
        country: 'country',
        profession: 'profession',
        desireTags: 'desire_tags',
        relationshipStatus: 'relationship_status',
        avatarUrl: 'avatar_url',
        photoUrls: 'photo_urls',
        desireArchetype: 'desire_archetype',
        disguiseModeEnabled: 'disguise_mode_enabled',
        activeDisguiseSkin: 'active_disguise_skin',
        isNightMode: 'is_night_mode',
        isGhostMode: 'is_ghost_mode',
        seeking: 'seeking',
        agePrefMin: 'age_pref_min',
        agePrefMax: 'age_pref_max',
        maxDistanceKm: 'max_distance_km',
        latitude: 'latitude',
        longitude: 'longitude',
        heightCm: 'height_cm',
        build: 'build',
        orientation: 'orientation',
        availabilityMask: 'availability_mask',
        blurDefault: 'blur_default',
        incognitoOnStart: 'incognito_on_start',
        showExactDistance: 'show_exact_distance',
        profileComplete: 'profile_complete',
        googleId: 'google_id',
        lastSeen: 'last_seen',
        onesignalPlayerId: 'onesignal_player_id',
        onesignal_player_id: 'onesignal_player_id',
        onesignalSubscriptionId: 'onesignal_subscription_id',
        onesignal_subscription_id: 'onesignal_subscription_id',
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue
        const col = map[k] || k
        out[col] = v
    }
    return out
}

export function ok<T>(data: T, message = 'OK') {
    return { data: { success: true as const, message, data } }
}

export class ApiError extends Error {
    response: { status: number; data: { success: false; message: string; data?: unknown } }
    constructor(message: string, status = 400, data?: unknown) {
        super(message)
        this.response = { status, data: { success: false, message, data } }
    }
}

export function fail(message: string, status = 400, data?: unknown): never {
    throw new ApiError(message, status, data)
}
