import { publicConfig } from '@/lib/config'

export function resolveMediaUrl(url?: string | null): string {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
    if (url.startsWith('/storage/') && publicConfig.supabaseUrl) {
        return `${publicConfig.supabaseUrl}${url}`
    }
    // Legacy Express uploads path — treat as relative noop
    if (url.startsWith('/uploads/')) return url
    return url
}
