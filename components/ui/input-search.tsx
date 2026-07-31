import * as React from 'react'

import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {}

const InputSearch = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <div className={cn('tryst-input-icon-wrap min-w-[204px]', className)}>
                <Search className="tryst-input-icon" aria-hidden />
                <input
                    type={type}
                    className="tryst-input-field text-xs"
                    ref={ref}
                    {...props}
                />
            </div>
        )
    },
)
InputSearch.displayName = 'Input'

export { InputSearch }
