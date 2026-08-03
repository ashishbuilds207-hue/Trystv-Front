'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, Phone, Pencil, X, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EmailField, isValidEmail } from '@/components/auth/EmailField'
import { OtpDeliveryBanner } from '@/components/auth/OtpSentBanner'
import type { OtpDeliveryMode } from '@/components/auth/OtpSentBanner'
import { OtpErrorBanner } from '@/components/auth/OtpErrorBanner'
import { isValidPhone, normalizePhone } from '@/lib/auth/contact'
import { formatOtpSendError, getApiErrorMessage } from '@/lib/api/errors'
import { useToast } from '@/lib/hooks/useToast'

type Mode = 'email' | 'phone' | 'both'
type Phase = 'idle' | 'edit' | 'otp'

async function authHeaders() {
    const { data } = await createClient().auth.getSession()
    const token = data.session?.access_token
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

export function VerifiedContactCard({
    email,
    phone,
    onUpdated,
}: {
    email: string
    phone: string
    onUpdated: (next: { email: string; phone: string }) => void
}) {
    const toast = useToast()
    const [phase, setPhase] = useState<Phase>('idle')
    const [mode, setMode] = useState<Mode>('email')
    const [newEmail, setNewEmail] = useState(email)
    const [newPhone, setNewPhone] = useState(phone)
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [otpDelivery, setOtpDelivery] = useState<OtpDeliveryMode>('email')
    const [shownOtp, setShownOtp] = useState<string | null>(null)
    const [otpEmailSent, setOtpEmailSent] = useState(false)
    const [otpEmailError, setOtpEmailError] = useState<string | null>(null)

    const displayEmail = email && !email.endsWith('@phone.tryst.app') ? email : ''
    const displayPhone = phone || ''

    const canSend =
        (mode === 'email' && isValidEmail(newEmail)) ||
        (mode === 'phone' && isValidPhone(newPhone)) ||
        (mode === 'both' && isValidEmail(newEmail) && isValidPhone(newPhone))

    const openEdit = () => {
        setPhase('edit')
        setNewEmail(displayEmail)
        setNewPhone(displayPhone)
        setMode(displayEmail && displayPhone ? 'both' : displayPhone && !displayEmail ? 'phone' : 'email')
        setError('')
        setOtp(['', '', '', '', '', ''])
        setShownOtp(null)
    }

    const cancel = () => {
        setPhase('idle')
        setError('')
        setOtp(['', '', '', '', '', ''])
        setShownOtp(null)
    }

    const sendCode = async () => {
        if (!canSend) return
        setLoading(true)
        setError('')
        try {
            const body: { action: 'send'; email?: string; phone?: string } = { action: 'send' }
            if (mode === 'email' || mode === 'both') body.email = newEmail.trim().toLowerCase()
            if (mode === 'phone' || mode === 'both') body.phone = normalizePhone(newPhone) || undefined

            const res = await fetch('/api/auth/change-contact', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || 'Could not send code')

            const payload = json.data as {
                otpMode?: OtpDeliveryMode
                otp?: string
                emailSent?: boolean
                emailError?: string | null
            }
            setOtpDelivery(payload?.otpMode || (payload?.otp ? 'onscreen' : 'email'))
            setShownOtp(payload?.otp || null)
            setOtpEmailSent(!!payload?.emailSent)
            setOtpEmailError(payload?.emailError || null)
            setOtp(payload?.otp && payload.otp.length === 6 ? payload.otp.split('') : ['', '', '', '', '', ''])
            setPhase('otp')
            toast.success('Code sent', 'Verify to update your contact')
        } catch (e) {
            setError(formatOtpSendError(getApiErrorMessage(e, 'Could not send code')))
        } finally {
            setLoading(false)
        }
    }

    const verifyCode = async () => {
        if (otp.join('').length < 6) return
        setLoading(true)
        setError('')
        try {
            const body: { action: 'verify'; otp: string; email?: string; phone?: string } = {
                action: 'verify',
                otp: otp.join(''),
            }
            if (mode === 'email' || mode === 'both') body.email = newEmail.trim().toLowerCase()
            if (mode === 'phone' || mode === 'both') body.phone = normalizePhone(newPhone) || undefined

            const res = await fetch('/api/auth/change-contact', {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || 'Invalid code')

            const nextEmail = (json.data?.email as string) || body.email || email
            const nextPhone = (json.data?.phone as string) || body.phone || phone
            onUpdated({
                email: nextEmail && !String(nextEmail).endsWith('@phone.tryst.app') ? nextEmail : '',
                phone: nextPhone || '',
            })
            toast.success('Updated', 'Email / phone changed')
            setPhase('idle')
        } catch (e) {
            setError(getApiErrorMessage(e, 'Could not verify code'))
        } finally {
            setLoading(false)
        }
    }

    if (phase === 'idle') {
        return (
            <div className="mb-4 rounded-xl border border-crimson/20 bg-crimson/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-crimson-300 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Account verified
                    </p>
                    <button
                        type="button"
                        onClick={openEdit}
                        className="inline-flex items-center gap-1 text-xs font-medium text-crimson-300 hover:text-crimson-200 transition-colors"
                    >
                        <Pencil className="w-3 h-3" /> Change
                    </button>
                </div>
                <div className="space-y-1.5">
                    {displayEmail && (
                        <p className="text-sm text-ivory-200 flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-ivory-500 shrink-0" />
                            <span className="truncate">{displayEmail}</span>
                        </p>
                    )}
                    {displayPhone && (
                        <p className="text-sm text-ivory-200 flex items-center gap-2 truncate">
                            <Phone className="w-3.5 h-3.5 text-ivory-500 shrink-0" />
                            <span className="truncate">{displayPhone}</span>
                        </p>
                    )}
                    {!displayEmail && !displayPhone && (
                        <p className="text-sm text-ivory-500">No contact on file</p>
                    )}
                </div>
                <p className="text-[11px] text-ivory-600 mt-2">
                    Saved from signup — tap Change to update email or phone
                </p>
            </div>
        )
    }

    return (
        <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-gold-400 font-semibold">
                        {phase === 'otp' ? 'Verify new contact' : 'Change email / phone'}
                    </p>
                    <p className="text-xs text-ivory-500 mt-0.5">
                        {phase === 'otp'
                            ? 'Enter the code we sent to confirm the update'
                            : 'We’ll send a code to the new contact before saving'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={cancel}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-500 hover:text-ivory-200 hover:bg-tryst-bg"
                    aria-label="Cancel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {phase === 'edit' && (
                <>
                    <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-tryst-bg border border-tryst-border">
                        {([
                            { id: 'email' as const, label: 'Email' },
                            { id: 'phone' as const, label: 'Phone' },
                            { id: 'both' as const, label: 'Both' },
                        ]).map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    setMode(m.id)
                                    setError('')
                                }}
                                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                                    mode === m.id ? 'bg-crimson text-white' : 'text-ivory-500 hover:text-ivory-300'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {(mode === 'email' || mode === 'both') && (
                        <EmailField value={newEmail} onChange={setNewEmail} id="change-email" />
                    )}
                    {(mode === 'phone' || mode === 'both') && (
                        <div>
                            <label htmlFor="change-phone" className="block text-xs text-ivory-500 uppercase tracking-wider mb-1.5">
                                Phone
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-500" />
                                <input
                                    id="change-phone"
                                    type="tel"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    placeholder="+91 98XXX XXXXX"
                                    className="tryst-input w-full pl-10"
                                />
                            </div>
                        </div>
                    )}

                    {error && <OtpErrorBanner message={error} onDismiss={() => setError('')} />}

                    <button
                        type="button"
                        disabled={!canSend || loading}
                        onClick={() => void sendCode()}
                        className="w-full tryst-button-primary py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send code <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </>
            )}

            {phase === 'otp' && (
                <>
                    <OtpDeliveryBanner
                        email={
                            (mode !== 'phone' && isValidEmail(newEmail) && newEmail) ||
                            normalizePhone(newPhone) ||
                            'your contact'
                        }
                        mode={otpDelivery}
                        otp={shownOtp}
                        emailSent={otpEmailSent}
                        emailError={otpEmailError}
                    />
                    <div className="flex gap-2 justify-center">
                        {otp.map((d, i) => (
                            <input
                                key={i}
                                id={`chg-otp-${i}`}
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, '')
                                    if (v.length > 1) return
                                    const next = [...otp]
                                    next[i] = v
                                    setOtp(next)
                                    if (v && i < 5) document.getElementById(`chg-otp-${i + 1}`)?.focus()
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                                        document.getElementById(`chg-otp-${i - 1}`)?.focus()
                                    }
                                }}
                                className="w-10 h-11 text-center text-base font-semibold rounded-xl bg-tryst-bg border border-tryst-border text-ivory-100 focus:border-crimson outline-none"
                            />
                        ))}
                    </div>
                    {error && <OtpErrorBanner message={error} onDismiss={() => setError('')} />}
                    <button
                        type="button"
                        disabled={otp.join('').length < 6 || loading}
                        onClick={() => void verifyCode()}
                        className="w-full tryst-button-primary py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & update'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setPhase('edit')
                            setError('')
                        }}
                        className="w-full text-center text-ivory-500 text-xs hover:text-ivory-300"
                    >
                        ← Edit contact
                    </button>
                </>
            )}
        </div>
    )
}
