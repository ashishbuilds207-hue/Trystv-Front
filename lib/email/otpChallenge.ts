import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'tryst_otp_challenge'
const TTL_MS = 10 * 60 * 1000

function secret() {
    return process.env.OTP_HMAC_SECRET || process.env.RESEND_API_KEY || 'tryst-dev-otp-secret'
}

export function hashOtp(code: string) {
    return crypto.createHash('sha256').update(code).digest('hex')
}

export function generateOtp() {
    return String(crypto.randomInt(100000, 999999))
}

export function sealOtpChallenge(email: string, code: string) {
    const payload = {
        email: email.trim().toLowerCase(),
        hash: hashOtp(code),
        exp: Date.now() + TTL_MS,
        attempts: 0,
    }
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
    return `${body}.${sig}`
}

export function openOtpChallenge(token: string): {
    email: string
    hash: string
    exp: number
    attempts: number
} | null {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    try {
        const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
        if (!data?.email || !data?.hash || !data?.exp) return null
        return data
    } catch {
        return null
    }
}

export function setOtpCookie(token: string) {
    cookies().set(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 10,
    })
}

export function getOtpCookie() {
    return cookies().get(COOKIE)?.value || null
}

export function clearOtpCookie() {
    cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export { COOKIE, TTL_MS }
