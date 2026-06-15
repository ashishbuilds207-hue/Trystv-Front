/** Scroll every common app scroll container to the top. */
export function scrollAppToTop(behavior: ScrollBehavior = 'auto') {
    if (typeof window === 'undefined') return

    window.scrollTo({ top: 0, left: 0, behavior })
    document.documentElement.scrollTo({ top: 0, left: 0, behavior })
    document.body.scrollTo({ top: 0, left: 0, behavior })

    for (const sel of ['.app-canvas', '.app-main', '.page-content', '.site-viewport']) {
        document.querySelectorAll(sel).forEach(el => {
            if (el instanceof HTMLElement) el.scrollTo({ top: 0, left: 0, behavior })
        })
    }
}

export function scrollDisguiseContentToTop() {
    if (typeof window === 'undefined') return
    document.querySelectorAll('[data-disguise-scroll]').forEach(el => {
        if (el instanceof HTMLElement) el.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
}
