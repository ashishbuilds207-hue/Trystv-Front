import { hashOtp, TTL_MS } from '@/lib/email/otpChallenge'

type Entry = {
    hash: string
    exp: number
    attempts: number
}

/** Dev / fallback store when Supabase otp_codes RPCs are missing. */
const memory = new Map<string, Entry>()

function key(identifier: string) {
    return identifier.trim().toLowerCase()
}

export function storeOtpMemory(identifier: string, codeOrHash: string, alreadyHashed = false) {
    const id = key(identifier)
    if (!id) return
    memory.set(id, {
        hash: alreadyHashed ? codeOrHash : hashOtp(codeOrHash),
        exp: Date.now() + TTL_MS,
        attempts: 0,
    })
}

export function matchOtpMemory(identifier: string, codeHash: string): { ok: true } | { ok: false; error: string } {
    const id = key(identifier)
    const entry = memory.get(id)
    if (!entry) return { ok: false, error: 'MISMATCH' }
    if (Date.now() > entry.exp) {
        memory.delete(id)
        return { ok: false, error: 'EXPIRED' }
    }
    if (entry.attempts >= 5) {
        memory.delete(id)
        return { ok: false, error: 'TOO_MANY_ATTEMPTS' }
    }
    if (entry.hash !== codeHash) {
        entry.attempts += 1
        memory.set(id, entry)
        return { ok: false, error: 'MISMATCH' }
    }
    return { ok: true }
}

export function consumeOtpMemory(identifier: string) {
    memory.delete(key(identifier))
}
