/**
 * Send OTP SMS via Twilio (optional).
 * Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID in .env.local
 */
export async function sendOtpSms(toE164: string, code: string): Promise<{ ok: boolean; message?: string }> {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM_NUMBER
    const messagingSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    if (!sid || !token) {
        return { ok: false, message: 'Twilio not configured' }
    }
    if (!from && !messagingSid) {
        return { ok: false, message: 'Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID' }
    }

    const body = new URLSearchParams({
        To: toE164,
        Body: `Your TRYST code is ${code}. Valid for 10 minutes.`,
    })
    if (messagingSid) body.set('MessagingServiceSid', messagingSid)
    else if (from) body.set('From', from)

    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    })

    if (!res.ok) {
        const err = await res.text()
        console.warn('[sms]', err)
        return { ok: false, message: err.slice(0, 200) }
    }
    return { ok: true }
}
