'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    EyeOff, Mail, Phone, Plus, Trash2, Loader2, Shield, X, Sparkles,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hideApi } from '@/lib/api/auth'
import { getApiErrorMessage } from '@/lib/api/errors'
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '@/lib/auth/contact'
import { useToast } from '@/lib/hooks/useToast'

type HideEntry = {
    id: string
    contactType: 'email' | 'phone'
    contactValue: string
    note: string | null
    createdAt: string
}

type DraftRow = {
    key: string
    email: string
    phone: string
    note: string
}

function newRow(): DraftRow {
    return {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: '',
        phone: '',
        note: '',
    }
}

function rowStatus(row: DraftRow): 'empty' | 'ok' | 'bad' {
    const hasEmail = !!row.email.trim()
    const hasPhone = !!row.phone.trim()
    if (!hasEmail && !hasPhone) return 'empty'
    if (hasEmail && !isValidEmail(row.email)) return 'bad'
    if (hasPhone && !isValidPhone(row.phone)) return 'bad'
    return 'ok'
}

export function AddHideContactsModal({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
    const toast = useToast()
    const qc = useQueryClient()
    const [rows, setRows] = useState<DraftRow[]>([newRow(), newRow()])
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    useEffect(() => {
        if (!open) return
        setRows([newRow(), newRow()])
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const validItems = useMemo(() => {
        return rows
            .filter((r) => rowStatus(r) === 'ok')
            .map((r) => ({
                email: normalizeEmail(r.email) || undefined,
                phone: normalizePhone(r.phone) || undefined,
                note: r.note.trim() || undefined,
            }))
    }, [rows])

    const hasBad = rows.some((r) => rowStatus(r) === 'bad')
    const canSubmit = validItems.length > 0 && !hasBad

    const addMut = useMutation({
        mutationFn: () => hideApi.addMany(validItems),
        onSuccess: (res) => {
            const n = res.data?.data?.count || validItems.length
            qc.invalidateQueries({ queryKey: ['hide-entries'] })
            toast.success('Hidden', `${n} contact${n === 1 ? '' : 's'} added`)
            onClose()
        },
        onError: (e: unknown) => {
            toast.error('Could not add', getApiErrorMessage(e, 'Try again'))
        },
    })

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.button
                        type="button"
                        aria-label="Close"
                        className="absolute inset-0 bg-black/55 dark:bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="hide-modal-title"
                        className="hide-sheet relative w-full sm:max-w-lg max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-tryst-border bg-tryst-card shadow-[var(--tryst-shadow)]"
                        initial={{ y: 40, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 24, opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    >
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-crimson/12 to-transparent pointer-events-none" />

                        <div className="relative px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-tryst-border">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-crimson/15 border border-crimson/25 flex items-center justify-center shrink-0">
                                    <EyeOff className="w-5 h-5 text-crimson" />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="hide-modal-title" className="font-playfair text-xl text-tryst-text font-bold flex items-center gap-1.5">
                                        Hide from contacts
                                        <Shield className="w-3.5 h-3.5 text-gold-400" />
                                    </h2>
                                    <p className="text-xs text-tryst-muted mt-0.5 leading-relaxed">
                                        Fill email or phone on each row — at least one is required. Add many at once.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-9 h-9 rounded-full border border-tryst-border text-tryst-muted hover:text-tryst-text hover:bg-tryst-bg flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative px-5 py-4 space-y-3 overflow-y-auto max-h-[55vh]">
                            <AnimatePresence initial={false}>
                                {rows.map((row, idx) => {
                                    const status = rowStatus(row)
                                    return (
                                        <motion.div
                                            key={row.key}
                                            layout
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0, margin: 0 }}
                                            className={`rounded-2xl border p-3.5 space-y-2.5 transition-colors ${
                                                status === 'bad'
                                                    ? 'border-crimson/40 bg-crimson/5'
                                                    : 'border-tryst-border bg-tryst-bg'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] uppercase tracking-wider text-tryst-muted font-semibold">
                                                    Contact {idx + 1}
                                                </p>
                                                {rows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                                                        className="text-tryst-muted hover:text-crimson p-1"
                                                        aria-label="Remove row"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                                <input
                                                    value={row.email}
                                                    onChange={(e) =>
                                                        setRows((prev) =>
                                                            prev.map((r) =>
                                                                r.key === row.key ? { ...r, email: e.target.value } : r,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Email address"
                                                    className="tryst-input w-full pl-10 text-sm py-2.5"
                                                    inputMode="email"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tryst-muted" />
                                                <input
                                                    value={row.phone}
                                                    onChange={(e) =>
                                                        setRows((prev) =>
                                                            prev.map((r) =>
                                                                r.key === row.key ? { ...r, phone: e.target.value } : r,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="+91 phone number"
                                                    className="tryst-input w-full pl-10 text-sm py-2.5"
                                                    inputMode="tel"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            <input
                                                value={row.note}
                                                onChange={(e) =>
                                                    setRows((prev) =>
                                                        prev.map((r) =>
                                                            r.key === row.key ? { ...r, note: e.target.value } : r,
                                                        ),
                                                    )
                                                }
                                                placeholder="Optional note (ex: college friend)"
                                                className="tryst-input w-full text-xs py-2"
                                            />

                                            {status === 'bad' && (
                                                <p className="text-[11px] text-crimson">
                                                    Enter a valid email and/or phone (at least one).
                                                </p>
                                            )}
                                            {status === 'empty' && (
                                                <p className="text-[11px] text-tryst-muted">
                                                    Leave blank to skip, or fill email / phone.
                                                </p>
                                            )}
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>

                            <button
                                type="button"
                                onClick={() => setRows((prev) => [...prev, newRow()])}
                                className="w-full py-2.5 rounded-xl border border-dashed border-crimson/35 text-crimson text-sm font-medium hover:bg-crimson/5 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" /> Add another contact
                            </button>
                        </div>

                        <div className="relative px-5 py-4 border-t border-tryst-border flex gap-2 bg-tryst-card">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-3 rounded-xl border border-tryst-border text-tryst-muted text-sm hover:text-tryst-text hover:bg-tryst-bg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!canSubmit || addMut.isPending}
                                onClick={() => addMut.mutate()}
                                className="flex-1 tryst-button-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {addMut.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Hide {validItems.length || ''} contact{validItems.length === 1 ? '' : 's'}
                                        <Sparkles className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    )
}

export default function HideFromPageClient() {
    const toast = useToast()
    const qc = useQueryClient()
    const [open, setOpen] = useState(false)

    const { data: entries = [], isLoading } = useQuery({
        queryKey: ['hide-entries'],
        queryFn: async () => {
            const { data } = await hideApi.list()
            return data.data.entries as HideEntry[]
        },
    })

    const removeMut = useMutation({
        mutationFn: (id: string) => hideApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['hide-entries'] })
            toast.success('Removed')
        },
        onError: (e: unknown) => toast.error('Could not remove', getApiErrorMessage(e, 'Try again')),
    })

    return (
        <div className="hide-page page-content page-transition max-w-lg mx-auto pb-28">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2 pb-6"
            >
                <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-tryst-muted mb-3 px-1">
                    Hide from
                </p>

                <div className="hide-card p-5 border border-crimson/25 bg-gradient-to-br from-crimson/10 via-tryst-card to-tryst-card relative overflow-hidden">
                    <motion.div
                        className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-crimson/15 blur-2xl pointer-events-none"
                        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="relative flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-crimson/15 border border-crimson/25 flex items-center justify-center shrink-0">
                            <EyeOff className="w-6 h-6 text-crimson" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-playfair text-2xl font-bold text-tryst-text flex items-center gap-2">
                                Hide my profile from
                                <Shield className="w-4 h-4 text-gold-400" />
                            </h1>
                            <p className="text-tryst-muted text-sm mt-1 leading-relaxed">
                                People who join with these emails or phones won&apos;t see you. Everyone else still can.
                            </p>
                        </div>
                    </div>

                    <motion.button
                        type="button"
                        onClick={() => setOpen(true)}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        className="relative mt-5 w-full tryst-button-primary py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" />
                        Add contacts to hide
                    </motion.button>
                </div>
            </motion.div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-7 h-7 text-crimson animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="hide-card px-6 py-14 text-center border border-dashed border-tryst-border"
                >
                    <motion.div
                        className="mx-auto w-16 h-16 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center mb-4"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <EyeOff className="w-7 h-7 text-crimson/80" />
                    </motion.div>
                    <p className="font-playfair text-xl text-tryst-text font-semibold">No hidden contacts yet</p>
                    <p className="text-tryst-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                        Tap Add to block people by email or phone — add several in one go.
                    </p>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-crimson/35 text-crimson text-sm hover:bg-crimson/10 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add your first
                    </button>
                </motion.div>
            ) : (
                <motion.ul layout className="space-y-2.5">
                    <AnimatePresence initial={false}>
                        {entries.map((e, i) => (
                            <motion.li
                                key={e.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                                className="hide-card flex items-center gap-3 px-3.5 py-3"
                            >
                                <span className="w-10 h-10 rounded-full bg-tryst-bg border border-tryst-border flex items-center justify-center shrink-0">
                                    {e.contactType === 'email' ? (
                                        <Mail className="w-4 h-4 text-tryst-muted" />
                                    ) : (
                                        <Phone className="w-4 h-4 text-tryst-muted" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-tryst-text truncate font-medium">{e.contactValue}</p>
                                    {e.note ? (
                                        <p className="text-[11px] text-tryst-muted truncate">{e.note}</p>
                                    ) : (
                                        <p className="text-[11px] text-tryst-muted capitalize">{e.contactType}</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeMut.mutate(e.id)}
                                    disabled={removeMut.isPending}
                                    className="w-9 h-9 rounded-full text-tryst-muted hover:text-crimson hover:bg-crimson/10 flex items-center justify-center transition-colors"
                                    aria-label="Remove"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </motion.ul>
            )}

            <AddHideContactsModal open={open} onClose={() => setOpen(false)} />
        </div>
    )
}
