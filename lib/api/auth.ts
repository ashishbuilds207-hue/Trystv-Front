import { createClient } from '@/lib/supabase/client'
import { sanitizeUser, toSnakeProfilePatch, ok, fail } from '@/lib/supabase/mappers'
import { publicConfig } from '@/lib/config'
import {
    haversineKm,
    matchesSeeking,
    isWorldwide,
    matchesOrbitRange,
    orbitRingForDistance,
    roundDistanceKm,
} from '@/lib/geo/distance'

function sb() {
    const client = createClient()
    return client
}

async function requireUid() {
    const { data: { user }, error } = await sb().auth.getUser()
    if (error || !user) fail('Not authenticated', 401)
    return user!
}

async function getProfileRow(id?: string) {
    const uid = id || (await requireUid()).id
    const { data, error } = await sb().from('users').select('*').eq('id', uid).maybeSingle()
    if (error) fail(error.message, 500)
    return data
}

export const authApi = {
    /** Resend-powered 6-digit OTP (branded TRYST email) */
    sendOtp: async (email: string, purpose: 'login' | 'register' = 'login') => {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
        })
        const json = await res.json()
        if (!res.ok) fail(json.message || 'Could not send code', res.status)
        return ok(json.data || { otpMode: 'email' })
    },

    verifyOtp: async (email: string, otp: string) => {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
        })
        const json = await res.json()
        if (!res.ok) fail(json.message || 'Invalid code', res.status)

        const accessToken = json.data?.accessToken as string | undefined
        const refreshToken = json.data?.refreshToken as string | undefined
        if (!accessToken || !refreshToken) fail('Missing session', 500)

        const { data, error } = await sb().auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        })
        if (error) fail(error.message, 400)

        if (json.data?.isNew) {
            return ok({ isNew: true as const, email: email.trim().toLowerCase() })
        }

        const profile = await getProfileRow(data.user?.id)
        return ok({
            isNew: false as const,
            accessToken,
            refreshToken,
            user: sanitizeUser(profile),
        })
    },

    /** Optional: Supabase magic link (uses Supabase mail / SMTP) */
    sendMagicLink: async (email: string, nextPath: 'login' | 'register' = 'login') => {
        const redirectTo = `${publicConfig.appUrl}/auth/callback?next=${nextPath}`
        const { error } = await sb().auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: {
                shouldCreateUser: true,
                emailRedirectTo: redirectTo,
            },
        })
        if (error) {
            const detail = [error.code, error.message].filter(Boolean).join(': ')
            fail(detail || error.message, 429)
        }
        return ok({ mode: 'magic_link' as const, email: email.trim().toLowerCase() })
    },

    register: async (payload: {
        email: string; alias: string; age: number; gender: string
        relationshipStatus: string; desireTags: string[]; profession?: string; city?: string
        country?: string; latitude?: number | null; longitude?: number | null
        googleId?: string; avatarUrl?: string; freshStart?: boolean
        bio?: string; seeking?: string
    }) => {
        const authUser = await requireUid()
        const patch: Record<string, unknown> = {
            alias: payload.alias,
            age: payload.age,
            gender: payload.gender,
            relationship_status: payload.relationshipStatus,
            desire_tags: payload.desireTags || [],
            profession: payload.profession || null,
            city: payload.city || null,
            email: payload.email.trim().toLowerCase(),
            google_id: payload.googleId || null,
            avatar_url: payload.avatarUrl || null,
            profile_complete: true,
            last_seen: new Date().toISOString(),
        }
        if (payload.bio != null) patch.bio = payload.bio
        if (payload.seeking) patch.seeking = payload.seeking
        if (payload.country) patch.country = payload.country
        if (payload.latitude != null && Number.isFinite(payload.latitude)) patch.latitude = payload.latitude
        if (payload.longitude != null && Number.isFinite(payload.longitude)) patch.longitude = payload.longitude
        if (payload.freshStart) {
            Object.assign(patch, {
                is_gold: false,
                is_obsidian: false,
                credits: 10,
            })
            await sb().from('subscriptions').delete().eq('user_id', authUser.id)
        }

        const { data: existing } = await sb().from('users').select('id, alias').eq('id', authUser.id).maybeSingle()
        const resumed = !!existing?.alias && existing.alias !== 'NewUser' && existing.alias !== ''

        const { data, error } = await sb().from('users').upsert({
            id: authUser.id,
            ...patch,
        }).select('*').single()
        if (error) fail(error.message, 400)

        const { data: sessionData } = await sb().auth.getSession()
        return ok({
            accessToken: sessionData.session?.access_token || 'supabase',
            refreshToken: sessionData.session?.refresh_token || 'supabase',
            user: sanitizeUser(data),
            resumed,
            freshStart: !!payload.freshStart,
        })
    },

    deleteAccount: async () => {
        const user = await requireUid()
        await sb().from('users').delete().eq('id', user.id)
        await sb().auth.signOut()
        // Full auth user delete requires service role — call optional API if needed
        try {
            await fetch('/api/auth/delete-account', { method: 'DELETE' })
        } catch { /* best effort */ }
        return ok({ deleted: true })
    },

    googleLogin: async (_idToken: string) => {
        fail('Use Google OAuth via Supabase signInWithOAuth', 400)
    },

    googleAccess: async (payload: {
        accessToken: string; googleId: string; email: string; name?: string; avatar?: string
    }) => {
        // Exchange: store pending Google meta, sign in via id_token if available, else profile upsert path
        const { data: sessionCheck } = await sb().auth.getSession()
        if (sessionCheck.session?.user) {
            const profile = await getProfileRow(sessionCheck.session.user.id)
            const isNew = !profile?.profile_complete || !profile?.age
            if (isNew) {
                return ok({
                    isNew: true as const,
                    email: payload.email,
                    googleId: payload.googleId,
                    avatarUrl: payload.avatar,
                })
            }
            return ok({
                isNew: false as const,
                accessToken: sessionCheck.session.access_token,
                refreshToken: sessionCheck.session.refresh_token,
                user: sanitizeUser(profile),
            })
        }

        // Prefer Supabase Google OAuth; fallback: signInWithIdToken if Google returns id_token
        const { data, error } = await sb().auth.signInWithIdToken({
            provider: 'google',
            token: payload.accessToken,
        }).catch(() => ({ data: null, error: { message: 'Google token exchange failed' } as { message: string } }))

        if (error || !data?.user) {
            // Soft path: create OTP session won't work; return isNew for register with google meta
            return ok({
                isNew: true as const,
                email: payload.email,
                googleId: payload.googleId,
                avatarUrl: payload.avatar,
            })
        }

        const existing = await getProfileRow(data.user.id)
        await sb().from('users').upsert({
            id: data.user.id,
            email: payload.email,
            google_id: payload.googleId,
            avatar_url: payload.avatar || existing?.avatar_url || null,
            // Keep saved display name; never overwrite with Google account name
            alias: existing?.alias || '',
        })
        const profile = await getProfileRow(data.user.id)
        const isNew = !profile?.profile_complete || !profile?.age || !(profile?.alias || '').trim()
        if (isNew) {
            return ok({ isNew: true as const, email: payload.email, googleId: payload.googleId, avatarUrl: payload.avatar })
        }
        return ok({
            isNew: false as const,
            accessToken: data.session?.access_token || 'supabase',
            refreshToken: data.session?.refresh_token || 'supabase',
            user: sanitizeUser(profile),
        })
    },

    getMe: async () => {
        const user = await requireUid()
        await sb().from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
        const profile = await getProfileRow(user.id)
        if (!profile) fail('Profile not found', 404)
        return ok({ user: sanitizeUser(profile) })
    },

    refresh: async () => {
        const { data, error } = await sb().auth.refreshSession()
        if (error) fail(error.message, 401)
        return ok({
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
        })
    },
}

export const userApi = {
    getDiscover: async (page = 1) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const from = (page - 1) * 20
        const { data: swiped } = await sb().from('swipes').select('swiped_id').eq('swiper_id', me.id)
        const exclude = new Set((swiped || []).map((s) => s.swiped_id))
        exclude.add(me.id)

        const seeking = (profile?.seeking as string) || 'Everyone'
        const ageMin = (profile?.age_pref_min as number) ?? 18
        const ageMax = (profile?.age_pref_max as number) ?? 60
        const maxKm = (profile?.max_distance_km as number) ?? 50
        const meLat = profile?.latitude != null ? Number(profile.latitude) : null
        const meLng = profile?.longitude != null ? Number(profile.longitude) : null
        const meCity = (profile?.city as string) || null
        const meCountry = (profile?.country as string) || null
        const hasMeLoc =
            meLat != null && meLng != null && Number.isFinite(meLat) && Number.isFinite(meLng)

        const { data, error } = await sb()
            .from('users')
            .select('*')
            .eq('is_active', true)
            .eq('is_ghost_mode', false)
            .eq('profile_complete', true)
            .neq('id', me.id)
            .gte('age', Math.min(ageMin, ageMax))
            .lte('age', Math.max(ageMin, ageMax))
            .range(from, from + 79)

        if (error) fail(error.message, 500)
        const profiles = (data || [])
            .filter((u) => !exclude.has(u.id))
            .filter((u) => matchesSeeking(u.gender as string, seeking))
            .map((u) => {
                const base = sanitizeUser(u)!
                let distanceKm: number | null = null
                const lat = u.latitude != null ? Number(u.latitude) : null
                const lng = u.longitude != null ? Number(u.longitude) : null
                if (
                    hasMeLoc &&
                    lat != null &&
                    lng != null &&
                    Number.isFinite(lat) &&
                    Number.isFinite(lng)
                ) {
                    distanceKm = roundDistanceKm(haversineKm(meLat!, meLng!, lat, lng))
                }
                return { ...base, distanceKm }
            })
            .filter((p) =>
                matchesOrbitRange({
                    maxKm,
                    hasMeLoc,
                    distanceKm: p.distanceKm,
                    myCity: meCity,
                    myCountry: meCountry,
                    theirCity: p.city,
                    theirCountry: p.country,
                }),
            )
            .sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
            .slice(0, 20)
        return ok({ profiles })
    },

    getProfile: async (id?: string) => {
        const profile = await getProfileRow(id)
        if (!profile) fail('User not found', 404)
        if (id) {
            const me = await requireUid()
            if (me.id !== id) {
                await sb().from('profile_views').insert({ viewer_id: me.id, viewed_id: id })
            }
        }
        return ok({ user: sanitizeUser(profile) })
    },

    updateProfile: async (data: Record<string, unknown>) => {
        const me = await requireUid()
        const patch = toSnakeProfilePatch(data)
        const { data: row, error } = await sb().from('users').update(patch).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(row) })
    },

    toggleGhostMode: async () => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const next = !profile?.is_ghost_mode
        const { data, error } = await sb().from('users').update({ is_ghost_mode: next }).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(data), isGhostMode: next })
    },

    toggleDisguise: async (skin?: string) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const enabled = !profile?.disguise_mode_enabled
        const patch: Record<string, unknown> = { disguise_mode_enabled: enabled }
        if (skin) patch.active_disguise_skin = skin
        const { data, error } = await sb().from('users').update(patch).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(data) })
    },

    uploadPhotos: async (formData: FormData) => {
        const me = await requireUid()
        const files = formData.getAll('photos') as File[]
        const profile = await getProfileRow(me.id)
        const existing = (profile?.photo_urls as string[]) || []
        if (existing.length + files.length > 6) fail('Max 6 photos', 400)

        const urls = [...existing]
        for (const file of files) {
            if (!(file instanceof File)) continue
            const ext = file.name.split('.').pop() || 'jpg'
            const path = `${me.id}/${crypto.randomUUID()}.${ext}`
            const { error } = await sb().storage.from('photos').upload(path, file, { upsert: false })
            if (error) fail(error.message, 400)
            const { data: pub } = sb().storage.from('photos').getPublicUrl(path)
            urls.push(pub.publicUrl)
        }
        const avatar = profile?.avatar_url || urls[0] || null
        const { data, error } = await sb().from('users').update({
            photo_urls: urls,
            avatar_url: avatar,
        }).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(data) })
    },

    deletePhoto: async (index: number) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const urls = [...((profile?.photo_urls as string[]) || [])]
        if (index < 0 || index >= urls.length) fail('Invalid photo index', 400)
        const removed = urls.splice(index, 1)[0]
        if (removed?.includes('/storage/')) {
            const marker = '/object/public/photos/'
            const i = removed.indexOf(marker)
            if (i >= 0) {
                await sb().storage.from('photos').remove([removed.slice(i + marker.length)])
            }
        }
        const avatar = urls.includes(profile?.avatar_url as string) ? profile?.avatar_url : urls[0] || null
        const { data, error } = await sb().from('users').update({ photo_urls: urls, avatar_url: avatar }).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(data) })
    },

    setAvatarPhoto: async (index: number) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const urls = (profile?.photo_urls as string[]) || []
        if (index < 0 || index >= urls.length) fail('Invalid photo index', 400)
        const { data, error } = await sb().from('users').update({ avatar_url: urls[index] }).eq('id', me.id).select('*').single()
        if (error) fail(error.message, 400)
        return ok({ user: sanitizeUser(data) })
    },

    getProfileCompletion: async () => {
        const profile = await getProfileRow()
        const fieldDefs: { key: string; label: string }[] = [
            { key: 'alias', label: 'Alias' },
            { key: 'age', label: 'Age' },
            { key: 'gender', label: 'Gender' },
            { key: 'city', label: 'City' },
            { key: 'bio', label: 'Bio' },
            { key: 'avatar_url', label: 'Photo' },
            { key: 'desire_tags', label: 'Desire tags' },
            { key: 'relationship_status', label: 'Status' },
        ]
        const missing: string[] = []
        let filled = 0
        for (const f of fieldDefs) {
            const v = profile?.[f.key]
            const okField = Array.isArray(v) ? v.length > 0 : v != null && v !== ''
            if (okField) filled++
            else missing.push(f.label)
        }
        const total = fieldDefs.length
        const percent = Math.round((filled / total) * 100)
        const isGold = !!profile?.is_gold
        const used = Number(profile?.daily_likes_count || 0)
        const limit = isGold ? 999 : 15
        const remaining = isGold ? 999 : Math.max(0, limit - used)
        return ok({
            completion: { percent, filled, total, missing },
            dailyLikes: { remaining, limit, used, isGold, count: used, date: profile?.daily_likes_date },
        })
    },

    getDailyLikes: async () => {
        const profile = await getProfileRow()
        return ok({
            dailyLikes: {
                count: profile?.daily_likes_count || 0,
                date: profile?.daily_likes_date,
                limit: profile?.is_gold ? null : 15,
            },
        })
    },

    getNotifications: async () => {
        const me = await requireUid()
        const { data, error } = await sb()
            .from('notifications')
            .select('*')
            .eq('user_id', me.id)
            .order('created_at', { ascending: false })
            .limit(50)
        if (error) fail(error.message, 500)
        const notifications = (data || []).map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data || {},
            isRead: n.is_read,
            createdAt: n.created_at,
        }))
        return ok({ notifications })
    },

    markNotificationRead: async (id: string) => {
        const me = await requireUid()
        await sb().from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', me.id)
        return ok({ read: true })
    },
}

export const matchApi = {
    swipe: async (targetId: string, direction: 'like' | 'pass' | 'super') => {
        const { data, error } = await sb().rpc('swipe_action', {
            p_target_id: targetId,
            p_direction: direction,
        })
        if (error) fail(error.message, 400)
        if (data?.error === 'DAILY_LIMIT') fail(data.message, 402, { code: 'DAILY_LIMIT' })
        return ok(data)
    },

    getMatches: async () => {
        const me = await requireUid()
        const { data: matches, error } = await sb()
            .from('matches')
            .select('*, conversations(id, delete_timer)')
            .eq('is_active', true)
            .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
            .order('created_at', { ascending: false })
        if (error) fail(error.message, 500)

        const mapped = []
        for (const m of matches || []) {
            const partnerId = m.user1_id === me.id ? m.user2_id : m.user1_id
            const { data: partner } = await sb().from('users').select('*').eq('id', partnerId).single()
            const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
            let lastMessage = null
            let lastMessageAt = null
            let unreadCount = 0
            if (conv?.id) {
                const { data: msgs } = await sb()
                    .from('messages')
                    .select('content, created_at, is_read, sender_id, is_deleted')
                    .eq('conversation_id', conv.id)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(50)
                if (msgs?.length) {
                    lastMessage = msgs[0].content
                    lastMessageAt = msgs[0].created_at
                    unreadCount = msgs.filter((x) => !x.is_read && x.sender_id !== me.id).length
                }
            }
            mapped.push({
                id: m.id,
                isSpark: m.is_spark,
                createdAt: m.created_at,
                partnerId,
                alias: partner?.alias,
                avatarUrl: partner?.avatar_url,
                photoUrls: partner?.photo_urls || [],
                age: partner?.age,
                city: partner?.city,
                country: partner?.country,
                bio: partner?.bio,
                profession: partner?.profession,
                desireArchetype: partner?.desire_archetype,
                gender: partner?.gender,
                orientation: partner?.orientation,
                build: partner?.build,
                profileCompletion: partner?.profile_completion,
                isVerified: partner?.is_verified,
                desireTags: partner?.desire_tags || [],
                lastSeen: partner?.last_seen,
                convId: conv?.id,
                deleteTimer: conv?.delete_timer,
                lastMessage,
                lastMessageAt,
                unreadCount,
            })
        }
        return ok({ matches: mapped })
    },

    getLikes: async () => {
        const me = await requireUid()
        const { data: incoming } = await sb()
            .from('swipes')
            .select('swiper_id, direction, created_at')
            .eq('swiped_id', me.id)
            .in('direction', ['like', 'super'])

        const { data: mySwipes } = await sb().from('swipes').select('swiped_id').eq('swiper_id', me.id)
        const swiped = new Set((mySwipes || []).map((s) => s.swiped_id))

        const likes = []
        for (const s of incoming || []) {
            if (swiped.has(s.swiper_id)) continue
            const { data: u } = await sb().from('users').select('*').eq('id', s.swiper_id).single()
            if (!u) continue
            likes.push({
                id: u.id,
                alias: u.alias,
                avatarUrl: u.avatar_url,
                photoUrls: u.photo_urls || [],
                age: u.age,
                city: u.city,
                country: u.country,
                bio: u.bio,
                isVerified: u.is_verified,
                desireTags: u.desire_tags || [],
                desireArchetype: u.desire_archetype,
                isSuper: s.direction === 'super',
                likedAt: s.created_at,
                distanceKm: null,
                isOnline: u.last_seen && new Date(u.last_seen).getTime() > Date.now() - 5 * 60 * 1000,
            })
        }
        return ok({ likes })
    },

    getMatch: async (id: string) => {
        const me = await requireUid()
        const { data: m, error } = await sb().from('matches').select('*').eq('id', id).single()
        if (error || !m) fail('Match not found', 404)
        if (m.user1_id !== me.id && m.user2_id !== me.id) fail('Match not found', 404)
        return ok({ match: m })
    },

    getCallConsent: async (matchId: string) => {
        const me = await requireUid()
        const { data: m } = await sb().from('matches').select('*').eq('id', matchId).single()
        if (!m) fail('Match not found', 404)
        const isUser1 = m.user1_id === me.id
        const myConsent = isUser1 ? m.user_a_calls_consent : m.user_b_calls_consent
        const partnerConsent = isUser1 ? m.user_b_calls_consent : m.user_a_calls_consent
        return ok({ myConsent, partnerConsent, canCall: myConsent && partnerConsent })
    },

    setCallConsent: async (matchId: string) => {
        const me = await requireUid()
        const { data: m } = await sb().from('matches').select('*').eq('id', matchId).single()
        if (!m) fail('Match not found', 404)
        const isUser1 = m.user1_id === me.id
        const col = isUser1 ? 'user_a_calls_consent' : 'user_b_calls_consent'
        await sb().from('matches').update({ [col]: true }).eq('id', matchId)
        const { data: updated } = await sb().from('matches').select('*').eq('id', matchId).single()
        const myConsent = true
        const partnerConsent = isUser1 ? updated!.user_b_calls_consent : updated!.user_a_calls_consent
        return ok({ myConsent, partnerConsent, canCall: myConsent && partnerConsent })
    },
}

export const messageApi = {
    getMessages: async (matchId: string, _before?: string) => {
        const me = await requireUid()
        const { data: m } = await sb().from('matches').select('*, conversations(id, delete_timer)').eq('id', matchId).single()
        if (!m || (m.user1_id !== me.id && m.user2_id !== me.id)) fail('Match not found', 404)
        const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
        if (!conv?.id) return ok({ messages: [], convId: null, deleteTimer: 24 })

        await sb().from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conv.id)
            .neq('sender_id', me.id)
            .eq('is_read', false)

        const { data: rows } = await sb()
            .from('messages')
            .select('*, users:sender_id(alias, avatar_url)')
            .eq('conversation_id', conv.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(100)

        const messages = (rows || []).map((r: Record<string, unknown>) => {
            const sender = r.users as { alias?: string; avatar_url?: string } | null
            return {
                id: r.id,
                senderId: r.sender_id,
                content: r.content,
                type: r.type,
                isRead: r.is_read,
                isDeleted: r.is_deleted,
                expiresAt: r.expires_at,
                deliveredAt: r.delivered_at,
                createdAt: r.created_at,
                senderAlias: sender?.alias,
                senderAvatar: sender?.avatar_url,
                status: 'sent' as const,
            }
        })
        return ok({ messages, convId: conv.id, deleteTimer: conv.delete_timer })
    },

    sendMessage: async (matchId: string, content: string, type = 'text') => {
        const { data, error } = await sb().rpc('send_chat_message', {
            p_match_id: matchId,
            p_content: content,
            p_type: type,
        })
        if (error) fail(error.message, 400)
        if (data?.error) fail(data.message, 402, data)
        return ok(data)
    },

    /** Mark inbound messages read when viewer opens the chat (triggers realtime ticks for sender). */
    markConversationRead: async (matchId: string) => {
        const me = await requireUid()
        const { data: m } = await sb().from('matches').select('*, conversations(id)').eq('id', matchId).single()
        if (!m || (m.user1_id !== me.id && m.user2_id !== me.id)) return ok({ read: 0 })
        const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
        if (!conv?.id) return ok({ read: 0 })
        const { data } = await sb().from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conv.id)
            .neq('sender_id', me.id)
            .eq('is_read', false)
            .select('id')
        return ok({ read: data?.length ?? 0 })
    },

    deleteMessage: async (id: string) => {
        const me = await requireUid()
        const { error } = await sb().from('messages').update({ is_deleted: true }).eq('id', id).eq('sender_id', me.id)
        if (error) fail(error.message, 400)
        return ok({ deleted: true })
    },
}

export const PLANS = {
    gold_monthly: { price: 999, credits: 0, days: 30, label: 'TRYST Gold Monthly' },
    gold_annual: { price: 3999, credits: 0, days: 365, label: 'TRYST Gold Annual' },
    obsidian: { price: 4999, credits: 200, days: 30, label: 'TRYST Obsidian' },
    credits_50: { price: 499, credits: 50, days: 0, label: '50 Message Credits' },
    credits_150: { price: 1299, credits: 150, days: 0, label: '150 Message Credits' },
    boost: { price: 199, credits: 0, days: 0, label: 'Profile Boost' },
    incognito: { price: 299, credits: 0, days: 7, label: 'Incognito Mode (7 days)' },
} as const

export const subscriptionApi = {
    getPlans: async () => ok({ plans: PLANS }),
    getConfig: async () => ok({
        provider: 'razorpay',
        configured: !!publicConfig.razorpayKeyId,
        keyId: publicConfig.razorpayKeyId || null,
        currency: 'INR',
    }),
    getMySub: async () => {
        const me = await requireUid()
        const { data } = await sb()
            .from('subscriptions')
            .select('*')
            .eq('user_id', me.id)
            .gt('ends_at', new Date().toISOString())
            .order('ends_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        return ok({ subscription: data })
    },
    createOrder: async (plan: string) => {
        const { data: { session } } = await sb().auth.getSession()
        const res = await fetch('/api/payments/razorpay/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ plan }),
        })
        const json = await res.json()
        if (!res.ok) fail(json.message || 'Order failed', res.status)
        return ok(json.data)
    },
    verifyPayment: async (payload: {
        plan: string; orderId: string; paymentId: string; signature?: string
    }) => {
        const { data: { session } } = await sb().auth.getSession()
        const res = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) fail(json.message || 'Verify failed', res.status)
        return ok(json.data)
    },
    resetMySubscription: async () => {
        const { data: { session } } = await sb().auth.getSession()
        const res = await fetch('/api/payments/razorpay/reset', {
            method: 'POST',
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const json = await res.json()
        if (!res.ok) fail(json.message || 'Reset failed', res.status)
        return ok(json.data)
    },
}

export const orbitApi = {
    getFeed: async () => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const { data: swiped } = await sb().from('swipes').select('swiped_id').eq('swiper_id', me.id)
        const exclude = new Set((swiped || []).map((s) => s.swiped_id))
        exclude.add(me.id)

        const seeking = (profile?.seeking as string) || 'Everyone'
        const ageMin = (profile?.age_pref_min as number) ?? 18
        const ageMax = (profile?.age_pref_max as number) ?? 60
        const maxKm = (profile?.max_distance_km as number) ?? 50
        const worldwide = isWorldwide(maxKm)
        const meLat = profile?.latitude != null ? Number(profile.latitude) : null
        const meLng = profile?.longitude != null ? Number(profile.longitude) : null
        const meCity = (profile?.city as string) || null
        const meCountry = (profile?.country as string) || null
        const hasMeLoc =
            meLat != null && meLng != null && Number.isFinite(meLat) && Number.isFinite(meLng)

        const { data, error } = await sb()
            .from('users')
            .select('*')
            .eq('is_active', true)
            .eq('is_ghost_mode', false)
            .eq('profile_complete', true)
            .neq('id', me.id)
            .gte('age', Math.min(ageMin, ageMax))
            .lte('age', Math.max(ageMin, ageMax))
            .limit(80)
        if (error) fail(error.message, 500)

        const profiles = (data || [])
            .filter((u) => !exclude.has(u.id))
            .filter((u) => matchesSeeking(u.gender as string, seeking))
            .map((u) => {
                const base = sanitizeUser(u)!
                let distanceKm: number | null = null
                const lat = u.latitude != null ? Number(u.latitude) : null
                const lng = u.longitude != null ? Number(u.longitude) : null
                if (
                    hasMeLoc &&
                    lat != null &&
                    lng != null &&
                    Number.isFinite(lat) &&
                    Number.isFinite(lng)
                ) {
                    distanceKm = roundDistanceKm(haversineKm(meLat!, meLng!, lat, lng))
                }
                return {
                    ...base,
                    distanceKm,
                    latitude: lat,
                    longitude: lng,
                    desireArchetype: u.desire_archetype,
                    build: u.build,
                    orientation: u.orientation,
                    profileCompletion: 80,
                }
            })
            .filter((p) =>
                matchesOrbitRange({
                    maxKm,
                    hasMeLoc,
                    distanceKm: p.distanceKm,
                    myCity: meCity,
                    myCountry: meCountry,
                    theirCity: p.city,
                    theirCountry: p.country,
                }),
            )
            .sort((a, b) => {
                const da = a.distanceKm ?? 99999
                const db = b.distanceKm ?? 99999
                if (da !== db) return da - db
                return (b.matchScore || 0) - (a.matchScore || 0)
            })
            .slice(0, 20)
            .map((p) => ({
                ...p,
                ring: orbitRingForDistance(p.distanceKm, maxKm),
            }))

        return ok({
            profiles,
            filters: {
                seeking,
                ageMin,
                ageMax,
                maxDistanceKm: maxKm,
                worldwide,
                hasLocation: hasMeLoc,
            },
        })
    },
    pull: async (targetId: string) => {
        const { data, error } = await sb().rpc('orbit_action', { p_target_id: targetId, p_action: 'pull' })
        if (error) fail(error.message, 400)
        if (data?.error) fail(data.message, 402, data)
        return ok(data)
    },
    ignite: async (targetId: string) => {
        const { data, error } = await sb().rpc('orbit_action', { p_target_id: targetId, p_action: 'ignite' })
        if (error) fail(error.message, 400)
        if (data?.error) fail(data.message, 402, data)
        return ok(data)
    },
    pass: async (targetId: string) => {
        const { data, error } = await sb().rpc('orbit_action', { p_target_id: targetId, p_action: 'pass' })
        if (error) fail(error.message, 400)
        return ok(data)
    },
}

const WORLD_CITIES = [
    { city: 'Mumbai', lon: 72.8777, lat: 19.0760 },
    { city: 'Delhi', lon: 77.2090, lat: 28.6139 },
    { city: 'Bangalore', lon: 77.5946, lat: 12.9716 },
    { city: 'London', lon: -0.1276, lat: 51.5074 },
    { city: 'New York', lon: -74.0060, lat: 40.7128 },
    { city: 'Dubai', lon: 55.2708, lat: 25.2048 },
    { city: 'Singapore', lon: 103.8198, lat: 1.3521 },
    { city: 'Tokyo', lon: 139.6917, lat: 35.6895 },
]

export const pulseApi = {
    getGlobe: async () => {
        const { data } = await sb().from('users').select('city, latitude, longitude').eq('is_active', true).eq('profile_complete', true)
        const counts = new Map<string, { city: string; lon: number; lat: number; count: number }>()
        for (const c of WORLD_CITIES) counts.set(c.city, { ...c, count: 2 })
        for (const u of data || []) {
            if (!u.city) continue
            const existing = counts.get(u.city)
            if (existing) existing.count++
            else if (u.latitude != null && u.longitude != null) {
                counts.set(u.city, { city: u.city, lon: u.longitude, lat: u.latitude, count: 1 })
            }
        }
        const cities = Array.from(counts.values())
        const totalActive = cities.reduce((s, c) => s + c.count, 0)
        return ok({ cities, totalActive })
    },
    getPeople: async () => {
        const me = await requireUid()
        const { data } = await sb()
            .from('users')
            .select('*')
            .eq('is_active', true)
            .eq('profile_complete', true)
            .neq('id', me.id)
            .limit(30)
        const { data: mySwipes } = await sb().from('swipes').select('swiped_id').eq('swiper_id', me.id)
        const sent = new Set((mySwipes || []).map((s) => s.swiped_id))
        const people = (data || []).map((u) => ({
            id: u.id,
            alias: u.alias,
            city: u.city,
            country: u.country,
            prompt: u.bio || 'Looking for a spark tonight.',
            tag: u.desire_archetype || 'SPARK',
            online: u.last_seen && new Date(u.last_seen).getTime() > Date.now() - 5 * 60 * 1000,
            avatarUrl: u.avatar_url,
            pulseSent: sent.has(u.id),
            isDemo: String(u.email || '').startsWith('demo.'),
        }))
        return ok({ people })
    },
    connect: async (targetId: string) => {
        const { data, error } = await sb().rpc('pulse_connect', { p_target_id: targetId })
        if (error) fail(error.message, 400)
        if (data?.error) fail(data.message, 402, data)
        return ok(data)
    },
}

export const engagementApi = {
    getHome: async () => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        if (!profile) fail('Profile not found', 404)

        const hour = new Date().getHours()
        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

        const { data: moments } = await sb()
            .from('moment_cards')
            .select('*, users:user_id(alias, avatar_url)')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(20)

        const { data: prompts } = await sb()
            .from('anonymous_prompts')
            .select('*, prompt_likes(user_id), prompt_replies(id)')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(10)

        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekStr = weekStart.toISOString().slice(0, 10)

        let weeklyPick = null
        const { data: wp } = await sb().from('weekly_picks').select('picked_user_id').eq('user_id', me.id).eq('week_start', weekStr).maybeSingle()
        if (wp?.picked_user_id) {
            const { data: pick } = await sb().from('users').select('*').eq('id', wp.picked_user_id).single()
            if (pick) {
                weeklyPick = {
                    id: pick.id, alias: pick.alias, avatarUrl: pick.avatar_url, age: pick.age, bio: pick.bio,
                    desireArchetype: pick.desire_archetype, matchScore: pick.match_score, city: pick.city,
                }
            }
        } else {
            const { data: candidates } = await sb().from('users').select('*').eq('profile_complete', true).neq('id', me.id).limit(5)
            const pick = candidates?.[0]
            if (pick) {
                await sb().from('weekly_picks').upsert({
                    user_id: me.id, picked_user_id: pick.id, week_start: weekStr,
                })
                weeklyPick = {
                    id: pick.id, alias: pick.alias, avatarUrl: pick.avatar_url, age: pick.age, bio: pick.bio,
                    desireArchetype: pick.desire_archetype, matchScore: pick.match_score, city: pick.city,
                }
            }
        }

        const { count: visitorCount } = await sb()
            .from('profile_views')
            .select('*', { count: 'exact', head: true })
            .eq('viewed_id', me.id)

        const { data: media } = await sb()
            .from('daily_media_posts')
            .select('media_type')
            .eq('user_id', me.id)
            .eq('post_date', new Date().toISOString().slice(0, 10))
        const doneTypes = new Set((media || []).map((m) => m.media_type))

        const { data: matchRows } = await sb()
            .from('matches')
            .select('*')
            .eq('is_active', true)
            .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
            .order('chemistry_score', { ascending: false })
            .limit(5)

        const allChemistry = []
        for (const m of matchRows || []) {
            const pid = m.user1_id === me.id ? m.user2_id : m.user1_id
            const { data: p } = await sb().from('users').select('alias, avatar_url').eq('id', pid).single()
            allChemistry.push({
                score: m.chemistry_score || 0,
                alias: p?.alias || 'Match',
                avatarUrl: p?.avatar_url || '',
                partnerId: pid,
            })
        }

        return ok({
            alias: profile.alias,
            avatarUrl: profile.avatar_url,
            city: profile.city,
            points: profile.credits,
            greeting,
            streak: profile.desire_streak_count || 0,
            streakLastDate: profile.streak_last_date,
            chemistry: allChemistry[0] || null,
            allChemistry,
            profileVisitors: { count: visitorCount || 0, unlockCost: 15, unlocked: !!profile.is_gold },
            anonymousPrompts: (prompts || []).map((p: Record<string, unknown>) => {
                const likes = (p.prompt_likes as { user_id: string }[]) || []
                const replies = (p.prompt_replies as unknown[]) || []
                return {
                    id: p.id,
                    type: p.prompt_type,
                    preview: p.content,
                    likeCount: likes.length,
                    replyCount: replies.length,
                    liked: likes.some((l) => l.user_id === me.id),
                }
            }),
            dailyMediaTasks: [
                { type: 'photo', label: 'Share a photo', points: 5, done: doneTypes.has('photo') },
                { type: 'voice', label: 'Voice note', points: 8, done: doneTypes.has('voice') },
                { type: 'video', label: 'Short clip', points: 10, done: doneTypes.has('video') },
            ],
            moments: (moments || []).map((m: Record<string, unknown>) => {
                const u = m.users as { alias?: string; avatar_url?: string } | null
                return {
                    id: m.id, content: m.content, city: m.city, createdAt: m.created_at,
                    alias: u?.alias, avatarUrl: u?.avatar_url,
                }
            }),
            weeklyPick,
            isNight: hour >= 20 || hour < 5,
            archetype: profile.desire_archetype,
            isGold: profile.is_gold,
            diaryPrompt: 'What desire are you not naming tonight?',
            disguiseModeEnabled: profile.disguise_mode_enabled,
            activeDisguiseSkin: profile.active_disguise_skin,
            isGhostMode: profile.is_ghost_mode,
        })
    },

    checkInStreak: async () => {
        const { data, error } = await sb().rpc('check_in_streak')
        if (error) fail(error.message, 400)
        return ok(data)
    },

    saveDiary: async (prompt: string, answer: string) => {
        const me = await requireUid()
        const { error } = await sb().from('diary_entries').insert({ user_id: me.id, prompt, answer })
        if (error) fail(error.message, 400)
        return ok({ saved: true })
    },

    getMoments: async () => {
        const { data } = await sb().from('moment_cards').select('*').gt('expires_at', new Date().toISOString())
        return ok({ moments: data || [] })
    },

    createMoment: async (content: string) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const { error } = await sb().from('moment_cards').insert({
            user_id: me.id, content, city: profile?.city || null,
        })
        if (error) fail(error.message, 400)
        return ok({ created: true })
    },

    getWeeklyPick: async () => {
        const home = await engagementApi.getHome()
        return ok({ weeklyPick: home.data.data.weeklyPick })
    },

    postDailyMedia: async (mediaType: string, content?: string) => {
        const me = await requireUid()
        const points = mediaType === 'video' ? 10 : mediaType === 'voice' ? 8 : 5
        const { error } = await sb().from('daily_media_posts').upsert({
            user_id: me.id,
            media_type: mediaType,
            content: content || null,
            points_awarded: points,
            post_date: new Date().toISOString().slice(0, 10),
        }, { onConflict: 'user_id,media_type,post_date' })
        if (error) fail(error.message, 400)
        await sb().from('users').update({ credits: (await getProfileRow(me.id))!.credits + points }).eq('id', me.id)
        return ok({ points, pointsEarned: points })
    },

    unlockVisitors: async () => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        if ((profile?.credits || 0) < 15) fail('Not enough credits', 402)
        await sb().from('users').update({ credits: profile!.credits - 15 }).eq('id', me.id)
        await sb().from('credit_transactions').insert({
            user_id: me.id, amount: -15, type: 'unlock', description: 'Unlock visitors',
        })
        const { data } = await sb()
            .from('profile_views')
            .select('*, users:viewer_id(alias, avatar_url, age, city)')
            .eq('viewed_id', me.id)
            .order('created_at', { ascending: false })
            .limit(20)
        return ok({
            visitors: (data || []).map((v: Record<string, unknown>) => {
                const u = v.users as Record<string, unknown>
                return { alias: u?.alias, avatarUrl: u?.avatar_url, age: u?.age, city: u?.city, visitedAt: v.created_at }
            }),
        })
    },

    likePrompt: async (id: string) => {
        const me = await requireUid()
        await sb().from('prompt_likes').upsert({ prompt_id: id, user_id: me.id })
        return ok({ liked: true })
    },

    commentPrompt: async (id: string, content: string) => {
        const me = await requireUid()
        await sb().from('prompt_replies').insert({ prompt_id: id, user_id: me.id, content })
        return ok({ commented: true })
    },
}

function mapEcho(row: Record<string, unknown>, viewerId?: string) {
    const author = row.users as Record<string, unknown> | undefined
    const reactions = (row.echo_reactions as { user_id: string; type: string }[]) || []
    const mine = viewerId ? reactions.find((r) => r.user_id === viewerId) : null
    return {
        id: row.id,
        type: row.type,
        mediaUrl: row.media_url,
        thumbUrl: row.thumb_url,
        textBody: row.text_body,
        caption: row.caption,
        bgTheme: row.bg_theme,
        faceBlurred: row.face_blurred,
        voiceMasked: row.voice_masked,
        audience: row.audience,
        cityCluster: row.city_cluster,
        likeCount: row.like_count,
        status: row.status,
        lifespan: row.lifespan,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        author: {
            id: author?.id || row.author_id,
            alias: author?.alias,
            archetype: author?.desire_archetype,
            avatarUrl: author?.avatar_url,
            city: author?.city,
        },
        viewerReaction: mine?.type || null,
    }
}

export const echoApi = {
    getFeed: async (_cursor?: string) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        const city = profile?.city || 'Mumbai'
        const { data: mutes } = await sb().from('echo_author_mutes').select('author_id').eq('user_id', me.id).gt('muted_until', new Date().toISOString())
        const muted = new Set((mutes || []).map((m) => m.author_id))

        const { data, error } = await sb()
            .from('echoes')
            .select('*, users:author_id(id, alias, desire_archetype, avatar_url, city), echo_reactions(user_id, type)')
            .eq('status', 'live')
            .order('created_at', { ascending: false })
            .limit(30)
        if (error) fail(error.message, 500)

        const echoes = (data || [])
            .filter((e) => !muted.has(e.author_id))
            .map((e) => mapEcho(e, me.id))
        return ok({ echoes, nextCursor: null, city })
    },

    getMine: async () => {
        const me = await requireUid()
        const { data, error } = await sb()
            .from('echoes')
            .select('*, users:author_id(id, alias, desire_archetype, avatar_url, city), echo_reactions(user_id, type)')
            .eq('author_id', me.id)
            .order('created_at', { ascending: false })
        if (error) fail(error.message, 500)
        return ok({ echoes: (data || []).map((e) => mapEcho(e, me.id)) })
    },

    create: async (formData: FormData) => {
        const me = await requireUid()
        const type = String(formData.get('type') || 'TEXT')
        const textBody = formData.get('textBody') ? String(formData.get('textBody')) : null
        const caption = formData.get('caption') ? String(formData.get('caption')) : null
        const bgTheme = String(formData.get('bgTheme') || 'noir')
        const audience = String(formData.get('audience') || 'city')
        const lifespan = String(formData.get('lifespan') || '24h')
        const faceBlurred = String(formData.get('faceBlurred') || 'true') === 'true'
        const voiceMasked = String(formData.get('voiceMasked') || 'false') === 'true'

        let mediaUrl: string | null = null
        const media = formData.get('media')
        if (media instanceof File && media.size > 0) {
            const ext = media.name.split('.').pop() || 'bin'
            const path = `${me.id}/${crypto.randomUUID()}.${ext}`
            const { error } = await sb().storage.from('echoes').upload(path, media)
            if (error) fail(error.message, 400)
            mediaUrl = sb().storage.from('echoes').getPublicUrl(path).data.publicUrl
        }

        const { data, error } = await sb().rpc('create_echo', {
            p_type: type,
            p_text_body: textBody,
            p_caption: caption,
            p_bg_theme: bgTheme,
            p_audience: audience,
            p_lifespan: lifespan,
            p_media_url: mediaUrl,
            p_thumb_url: null,
            p_face_blurred: faceBlurred,
            p_voice_masked: voiceMasked,
        })
        if (error) fail(error.message, 400)
        if (data?.error) fail(data.message, 400, data)
        return ok(data)
    },

    like: async (id: string) => {
        const { data, error } = await sb().rpc('echo_react', { p_echo_id: id, p_type: 'LIKE' })
        if (error) fail(error.message, 400)
        return ok(data)
    },

    dislike: async (id: string) => {
        const { data, error } = await sb().rpc('echo_react', { p_echo_id: id, p_type: 'DISLIKE' })
        if (error) fail(error.message, 400)
        return ok(data)
    },

    getLikers: async (id: string) => {
        const me = await requireUid()
        const profile = await getProfileRow(me.id)
        if (!profile?.is_gold) fail('Gold required to see likers', 402)
        const { data } = await sb()
            .from('echo_reactions')
            .select('created_at, users:user_id(id, alias, desire_archetype, avatar_url)')
            .eq('echo_id', id)
            .eq('type', 'LIKE')
        const likers = (data || []).map((r: Record<string, unknown>) => {
            const u = r.users as Record<string, unknown>
            return {
                id: u?.id, alias: u?.alias, archetype: u?.desire_archetype,
                avatarUrl: u?.avatar_url, likedAt: r.created_at,
            }
        })
        return ok({ likers })
    },

    delete: async (id: string) => {
        const me = await requireUid()
        const { error } = await sb().from('echoes').delete().eq('id', id).eq('author_id', me.id)
        if (error) fail(error.message, 400)
        return ok({ deleted: true })
    },

    report: async (id: string, reason?: string) => {
        const me = await requireUid()
        const { data: echo } = await sb().from('echoes').select('author_id').eq('id', id).single()
        if (echo) {
            await sb().from('notifications').insert({
                user_id: echo.author_id,
                type: 'echo_report',
                title: 'Echo reported',
                body: reason || 'Your Echo was reported',
                data: { echoId: id, from: me.id },
            })
        }
        return ok({ reported: true })
    },
}
