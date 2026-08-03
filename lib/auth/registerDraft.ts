/** Persist unfinished registration so users resume after closing the tab. */

export type RegisterDraftForm = {
    alias: string
    age: string
    email: string
    phone: string
    gender: 'female' | 'male' | 'non-binary' | ''
    intent: 'long-term' | 'short-term' | 'casual' | 'friendship' | 'open-to-all' | ''
    seeking: 'women' | 'men' | 'everyone' | ''
    interests: string[]
    bio: string
    profession: string
    city: string
    country: string
    latitude: number | null
    longitude: number | null
}

export type RegisterDraft = {
    userId: string
    step: number
    form: RegisterDraftForm
    updatedAt: number
}

const KEY = 'tryst_register_draft'
const MIN_PHOTOS = 2

export function loadRegisterDraft(userId?: string | null): RegisterDraft | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return null
        const draft = JSON.parse(raw) as RegisterDraft
        if (!draft?.userId || !draft.form) return null
        if (userId && draft.userId !== userId) return null
        return draft
    } catch {
        return null
    }
}

export function saveRegisterDraft(draft: RegisterDraft) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(
            KEY,
            JSON.stringify({ ...draft, updatedAt: Date.now() }),
        )
    } catch {
        /* quota / private mode */
    }
}

export function clearRegisterDraft() {
    if (typeof window === 'undefined') return
    try {
        localStorage.removeItem(KEY)
    } catch {
        /* ignore */
    }
}

/** First incomplete profile step (1–7). */
export function computeResumeStep(
    form: Pick<
        RegisterDraftForm,
        'alias' | 'age' | 'gender' | 'city' | 'intent' | 'seeking' | 'interests' | 'bio'
    >,
    photoCount: number,
): number {
    if (!(form.alias.length >= 2 && Number(form.age) >= 18 && form.gender)) return 1
    if (form.city.trim().length < 2) return 2
    if (!form.intent || !form.seeking) return 3
    if (form.interests.length < 3) return 4
    if (form.bio.trim().length < 20) return 5
    if (photoCount < MIN_PHOTOS) return 6
    return 7
}

export function normalizeGender(raw?: string | null): RegisterDraftForm['gender'] {
    const g = (raw || '').trim().toLowerCase()
    if (g === 'female' || g === 'woman') return 'female'
    if (g === 'male' || g === 'man') return 'male'
    if (g === 'non-binary' || g === 'nonbinary' || g === 'other') return 'non-binary'
    return ''
}

export function normalizeSeekingDraft(raw?: string | null): RegisterDraftForm['seeking'] {
    const s = (raw || '').trim().toLowerCase()
    if (s === 'women' || s === 'woman' || s === 'female') return 'women'
    if (s === 'men' || s === 'man' || s === 'male') return 'men'
    if (s === 'everyone' || s === 'all') return 'everyone'
    return ''
}

export function normalizeIntentDraft(raw?: string | null): RegisterDraftForm['intent'] {
    const s = (raw || '').trim().toLowerCase()
    if (['long-term', 'short-term', 'casual', 'friendship', 'open-to-all'].includes(s)) {
        return s as RegisterDraftForm['intent']
    }
    return ''
}

export function formFromUserRow(row: Record<string, unknown>, fallback: RegisterDraftForm): RegisterDraftForm {
    const alias = String(row.alias || '')
    return {
        ...fallback,
        alias: alias && alias !== 'NewUser' ? alias : fallback.alias,
        age: row.age != null ? String(row.age) : fallback.age,
        gender: normalizeGender(row.gender as string) || fallback.gender,
        bio: (row.bio as string) || fallback.bio,
        profession: (row.profession as string) || fallback.profession,
        city: (row.city as string) || fallback.city,
        country: (row.country as string) || fallback.country,
        latitude: (row.latitude as number) ?? fallback.latitude,
        longitude: (row.longitude as number) ?? fallback.longitude,
        phone: (row.phone as string) || fallback.phone,
        email: (row.email as string) || fallback.email,
        interests:
            Array.isArray(row.desire_tags) && (row.desire_tags as string[]).length
                ? (row.desire_tags as string[])
                : fallback.interests,
        seeking: normalizeSeekingDraft(row.seeking as string) || fallback.seeking,
        intent: normalizeIntentDraft(row.relationship_status as string) || fallback.intent,
    }
}
