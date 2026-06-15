'use client'

import type { ReactNode } from 'react'

interface Props {
    children: ReactNode
    className?: string
    bg?: string
}

/** Centers disguise content inside the 1650px site max-width with side gutters on wide screens. */
export function DisguiseShell({ children, className = '', bg }: Props) {
    return (
        <div
            data-disguise-scroll
            className={`h-full overflow-y-auto ${className}`}
            style={bg ? { background: bg } : undefined}
        >
            <div className="mx-auto w-full max-w-[1650px] px-4 sm:px-6 lg:px-10 xl:px-12 pb-8">
                {children}
            </div>
        </div>
    )
}
