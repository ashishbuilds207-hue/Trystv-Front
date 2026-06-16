import { Lock, Mail } from 'lucide-react'

export function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

type EmailFieldProps = {
    value: string
    onChange: (value: string) => void
    label?: string
    hint?: string
    id?: string
}

export function EmailField({
    value,
    onChange,
    label = 'Email Address',
    hint = 'Your email is private and never shown on your profile',
    id = 'email',
}: EmailFieldProps) {
    const valid = isValidEmail(value)
    return (
        <div>
            <label htmlFor={id} className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">
                {label}
            </label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                <input
                    id={id}
                    type="email"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="you@gmail.com"
                    className="tryst-input pl-10 pr-10"
                    autoComplete="email"
                    required
                />
                {valid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
            <p className="text-ivory-600 text-xs mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {hint}
            </p>
        </div>
    )
}
