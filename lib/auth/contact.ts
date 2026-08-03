/** Normalize phone to digits / E.164-ish storage (India-friendly + international). */
export function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null
    let digits = String(raw).replace(/[^\d+]/g, '')
    if (digits.startsWith('00')) digits = `+${digits.slice(2)}`
    const only = digits.replace(/\D/g, '')
    if (only.length < 8 || only.length > 15) return null
    // Prefer E.164 with +
    if (digits.startsWith('+')) return `+${only}`
    // India 10-digit local → +91
    if (only.length === 10) return `+91${only}`
    return `+${only}`
}

export function isValidPhone(raw: string | null | undefined): boolean {
    return !!normalizePhone(raw)
}

export function isValidEmail(raw: string | null | undefined): boolean {
    const e = (raw || '').trim().toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export function normalizeEmail(raw: string | null | undefined): string | null {
    const e = (raw || '').trim().toLowerCase()
    return isValidEmail(e) ? e : null
}

/** Auth identity email when user logs in with phone only */
export function phoneAuthEmail(phoneE164: string): string {
    const digits = phoneE164.replace(/\D/g, '')
    return `p${digits}@phone.tryst.app`
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone) return ''
    return phone
}
