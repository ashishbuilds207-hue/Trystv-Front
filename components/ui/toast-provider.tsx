'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, ToastType } from '@/lib/hooks/useToast'

const CONFIG: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; iconBg: string }> = {
    success: {
        bg: 'bg-[#1a3a2a]',
        border: 'border-[#22c55e]/40',
        icon: <CheckCircle2 className="w-5 h-5" />,
        iconBg: 'bg-[#22c55e] text-white',
    },
    error: {
        bg: 'bg-[#3a1a1a]',
        border: 'border-[#ef4444]/40',
        icon: <XCircle className="w-5 h-5" />,
        iconBg: 'bg-[#ef4444] text-white',
    },
    info: {
        bg: 'bg-[#1a2a3a]',
        border: 'border-[#3b82f6]/40',
        icon: <Info className="w-5 h-5" />,
        iconBg: 'bg-[#3b82f6] text-white',
    },
    warning: {
        bg: 'bg-[#2d2010]',
        border: 'border-[#f59e0b]/40',
        icon: <AlertTriangle className="w-5 h-5" />,
        iconBg: 'bg-[#f59e0b] text-white',
    },
}

export function ToastProvider() {
    const { toasts, remove } = useToastStore()

    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[360px] w-full">
            <AnimatePresence>
                {toasts.map((toast) => {
                    const cfg = CONFIG[toast.type]
                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 60, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 60, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className={`pointer-events-auto flex items-center gap-3 w-full rounded-2xl border px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${cfg.bg} ${cfg.border}`}
                        >
                            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${cfg.iconBg}`}>
                                {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-ivory-100 text-sm font-semibold leading-tight">{toast.title}</p>
                                {toast.message && (
                                    <p className="text-ivory-400 text-xs mt-0.5 leading-tight truncate">{toast.message}</p>
                                )}
                            </div>
                            <button
                                onClick={() => remove(toast.id)}
                                className="flex-shrink-0 w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-ivory-400 hover:text-ivory-100 hover:border-white/30 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
