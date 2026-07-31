'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type IconInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    icon: ReactNode
    trailing?: ReactNode
    className?: string
    wrapClassName?: string
    inputClassName?: string
}

/** Flex-based icon field — text never sits under the icon */
export function IconInput({
    icon,
    trailing,
    className,
    wrapClassName,
    inputClassName,
    ...props
}: IconInputProps) {
    return (
        <div className={cn('tryst-input-icon-wrap', wrapClassName, className)}>
            <span className="tryst-input-icon" aria-hidden>
                {icon}
            </span>
            <input className={cn('tryst-input-field', inputClassName)} {...props} />
            {trailing ? <span className="tryst-input-trailing">{trailing}</span> : null}
        </div>
    )
}
