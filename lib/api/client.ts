import axios from 'axios'

import { publicConfig } from '@/lib/config'

const API_URL = publicConfig.apiUrl

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('tryst_token')
        if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-refresh on 401
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true
            try {
                const refresh = localStorage.getItem('tryst_refresh')
                if (!refresh) throw new Error('no refresh')
                const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
                localStorage.setItem('tryst_token', data.data.accessToken)
                original.headers.Authorization = `Bearer ${data.data.accessToken}`
                return api(original)
            } catch {
                localStorage.removeItem('tryst_token')
                localStorage.removeItem('tryst_refresh')
                if (typeof window !== 'undefined') window.location.href = '/login'
            }
        }
        return Promise.reject(err)
    }
)

export default api
