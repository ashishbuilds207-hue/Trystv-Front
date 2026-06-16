import { AlertCircle } from 'lucide-react'

export function OtpErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    if (!message) return null
    return (
        <div
            role="alert"
            className="flex gap-3 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-ivory-200"
        >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-crimson-400" />
            <div className="flex-1 space-y-1">
                <p className="font-medium text-ivory-100">Could not send verification code</p>
                <p className="text-ivory-400 leading-relaxed">{message}</p>
            </div>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 text-ivory-500 hover:text-ivory-300 text-xs"
                    aria-label="Dismiss"
                >
                    ✕
                </button>
            )}
        </div>
    )
}
