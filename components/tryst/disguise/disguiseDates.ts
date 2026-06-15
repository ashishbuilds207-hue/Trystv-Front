/** Live date helpers for disguise skins — always reflects the user's current day. */

export function getDisguiseDates() {
    const now = new Date()

    const long = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    const short = now.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })

    const monthYear = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    const hour = now.getHours()
    const greet =
        hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(now.getDate() - now.getDay() + i)
        return {
            label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
            date: d.getDate(),
            isToday: d.toDateString() === now.toDateString(),
        }
    })

    const rel = (daysAgo: number) => {
        const d = new Date(now)
        d.setDate(now.getDate() - daysAgo)
        if (daysAgo === 0) return 'Today'
        if (daysAgo === 1) return 'Yesterday'
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }

    const issueNo = 4182 + now.getFullYear() - 2026

    return { now, long, short, monthYear, time, greet, weekDays, rel, issueNo }
}
