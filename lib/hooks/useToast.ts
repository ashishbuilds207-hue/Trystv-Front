import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

interface ToastStore {
    toasts: Toast[]
    add: (toast: Omit<Toast, 'id'>) => void
    remove: (id: string) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
    toasts: [],

    add: (toast) => {
        const id = `toast_${Date.now()}_${Math.random()}`
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
        const duration = toast.duration ?? 4000
        if (duration > 0) setTimeout(() => get().remove(id), duration)
    },

    remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    success: (title, message) => get().add({ type: 'success', title, message }),
    error: (title, message) => get().add({ type: 'error', title, message }),
    info: (title, message) => get().add({ type: 'info', title, message }),
    warning: (title, message) => get().add({ type: 'warning', title, message }),
}))

export const useToast = () => {
    const { success, error, info, warning, add, remove } = useToastStore()
    return { success, error, info, warning, add, remove }
}
