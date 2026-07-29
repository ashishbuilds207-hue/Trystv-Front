'use client'

import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/lib/store/useAppStore'

interface ThemeToggleProps {
    compact?: boolean
    className?: string
}

export default function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
    const { isNightMode, toggleNightMode } = useAppStore()
    const label = isNightMode ? 'Dark' : 'Light'

    if (compact) {
        return (
            <button
                type="button"
                onClick={toggleNightMode}
                title={`Switch to ${isNightMode ? 'light' : 'dark'} mode`}
                aria-label={`Theme: ${label}. Click to switch.`}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    isNightMode
                        ? 'bg-crimson/10 border-crimson/30 text-crimson'
                        : 'bg-tryst-card border-tryst-border text-tryst-muted hover:text-tryst-text'
                } ${className}`}
            >
                {isNightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={toggleNightMode}
            aria-label={`Theme: ${label}. Click to switch.`}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                isNightMode
                    ? 'bg-crimson/10 border-crimson/25 text-crimson'
                    : 'bg-tryst-card/80 border-tryst-border text-tryst-muted hover:text-tryst-text'
            } ${className}`}
        >
            {isNightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{label}</span>
        </button>
    )
}
