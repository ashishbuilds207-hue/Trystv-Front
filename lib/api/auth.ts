import api from './client'

export const authApi = {
    sendOtp: (email: string) => api.post('/auth/send-otp', { email }),

    verifyOtp: (email: string, otp: string) => api.post('/auth/verify-otp', { email, otp }),

    register: (data: {
        email: string; alias: string; age: number; gender: string
        relationshipStatus: string; desireTags: string[]; profession?: string; city?: string
        googleId?: string; avatarUrl?: string
    }) => api.post('/auth/register', data),

    googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),

    getMe: () => api.get('/auth/me'),

    refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
}

export const userApi = {
    getDiscover: (page = 1) => api.get(`/users/discover?page=${page}`),
    getProfile: (id?: string) => api.get(id ? `/users/${id}` : '/users/me'),
    updateProfile: (data: Record<string, unknown>) => api.patch('/users/me', data),
    toggleGhostMode: () => api.post('/users/ghost-mode'),
    toggleDisguise: (skin?: string) => api.post('/users/disguise', { skin }),
    uploadPhotos: (formData: FormData) =>
        api.post('/users/me/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deletePhoto: (index: number) => api.delete(`/users/me/photos/${index}`),
    setAvatarPhoto: (index: number) => api.patch(`/users/me/photos/${index}/avatar`),
    getProfileCompletion: () => api.get('/users/me/completion'),
    getDailyLikes: () => api.get('/users/me/daily-likes'),
    getNotifications: () => api.get('/users/notifications/list'),
    markNotificationRead: (id: string) => api.patch(`/users/notifications/${id}/read`),
}

export const matchApi = {
    swipe: (targetId: string, direction: 'like' | 'pass' | 'super') =>
        api.post('/matches/swipe', { targetId, direction }),
    getMatches: () => api.get('/matches'),
    getMatch: (id: string) => api.get(`/matches/${id}`),
    getCallConsent: (matchId: string) => api.get(`/matches/${matchId}/call-consent`),
    setCallConsent: (matchId: string) => api.post(`/matches/${matchId}/call-consent`),
}

export const messageApi = {
    getMessages: (matchId: string, before?: string) =>
        api.get(`/messages/${matchId}${before ? `?before=${before}` : ''}`),
    sendMessage: (matchId: string, content: string, type = 'text') =>
        api.post(`/messages/${matchId}`, { content, type }),
    deleteMessage: (id: string) => api.delete(`/messages/${id}`),
}

export const subscriptionApi = {
    getPlans: () => api.get('/subscriptions/plans'),
    getMySub: () => api.get('/subscriptions/my'),
    createOrder: (plan: string) => api.post('/subscriptions/order', { plan }),
    verifyPayment: (data: { plan: string; orderId: string; paymentId: string }) =>
        api.post('/subscriptions/verify', data),
}

export const orbitApi = {
    getFeed: () => api.get('/orbit/feed'),
    pull: (targetId: string) => api.post('/orbit/pull', { targetId }),
    ignite: (targetId: string) => api.post('/orbit/ignite', { targetId }),
    pass: (targetId: string) => api.post('/orbit/pass', { targetId }),
}

export const pulseApi = {
    getGlobe: () => api.get('/pulse/globe'),
    getPeople: () => api.get('/pulse/people'),
}

export const engagementApi = {
    getHome: () => api.get('/engagement/home'),
    checkInStreak: () => api.post('/engagement/streak'),
    saveDiary: (prompt: string, answer: string) => api.post('/engagement/diary', { prompt, answer }),
    getMoments: () => api.get('/engagement/moments'),
    createMoment: (content: string) => api.post('/engagement/moments', { content }),
    getWeeklyPick: () => api.get('/engagement/weekly-pick'),
    postDailyMedia: (mediaType: string, content?: string) => api.post('/engagement/daily-media', { mediaType, content }),
    unlockVisitors: () => api.post('/engagement/unlock-visitors'),
    likePrompt: (id: string) => api.post(`/engagement/prompts/${id}/like`),
    commentPrompt: (id: string, content: string) => api.post(`/engagement/prompts/${id}/comment`, { content }),
}
