'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { authApi, subscriptionApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store/useAppStore'
import { getApiErrorMessage } from '@/lib/api/errors'

export function AccountActions() {
    const [resetting, setResetting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const toast = useToast()
    const qc = useQueryClient()
    const { setAuthenticated } = useAppStore()
    const router = useRouter()

    const resetSubscription = async () => {
        if (!window.confirm('Remove Gold/Obsidian and clear subscription history? You can subscribe again on /gold.')) return
        setResetting(true)
        try {
            await subscriptionApi.resetMySubscription()
            await qc.invalidateQueries({ queryKey: ['me'] })
            await qc.invalidateQueries({ queryKey: ['profile', 'me'] })
            toast.success('Subscription reset', 'Gold removed — start a new plan anytime')
        } catch (e) {
            toast.error('Reset failed', getApiErrorMessage(e, 'Could not reset subscription'))
        } finally {
            setResetting(false)
        }
    }

    const deleteAccount = async () => {
        if (!window.confirm('Permanently delete your TRYST account and all data? This cannot be undone.')) return
        setDeleting(true)
        try {
            await authApi.deleteAccount()
            localStorage.removeItem('tryst_token')
            localStorage.removeItem('tryst_refresh')
            setAuthenticated(false)
            qc.clear()
            toast.success('Account deleted', 'You can register again with the same email')
            router.push('/register')
        } catch (e) {
            toast.error('Delete failed', getApiErrorMessage(e, 'Could not delete account'))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={resetSubscription}
                disabled={resetting || deleting}
                className="w-full flex items-center gap-3 px-4 py-3.5 you-row border-b you-divider hover:bg-tryst-card-2/50 transition-colors disabled:opacity-60"
            >
                {resetting ? <Loader2 className="w-5 h-5 animate-spin you-icon" /> : <RefreshCw className="w-5 h-5 you-icon" />}
                <div className="flex-1 text-left">
                    <p className="you-ink text-sm">Reset subscription</p>
                    <p className="you-muted text-xs">Remove Gold/Obsidian and test payment again</p>
                </div>
            </button>
            <button
                type="button"
                onClick={deleteAccount}
                disabled={resetting || deleting}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/5 transition-colors disabled:opacity-60 text-red-400/90"
            >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Delete account</p>
                    <p className="text-xs opacity-70">Permanently remove profile, matches & billing</p>
                </div>
            </button>
        </>
    )
}
