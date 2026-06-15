'use client'

import { useRef, useState, useCallback } from 'react'

export function useTripleTap(onReveal: () => void) {
    const ref = useRef({ n: 0, timer: null as ReturnType<typeof setTimeout> | null })
    const [ripple, setRipple] = useState(false)

    const tap = useCallback(() => {
        setRipple(true)
        setTimeout(() => setRipple(false), 420)
        ref.current.n++
        if (ref.current.timer) clearTimeout(ref.current.timer)
        if (ref.current.n >= 3) {
            ref.current.n = 0
            onReveal()
        } else {
            ref.current.timer = setTimeout(() => { ref.current.n = 0 }, 1200)
        }
    }, [onReveal])

    return { tap, ripple }
}
