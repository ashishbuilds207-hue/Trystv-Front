'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store/useAppStore'
import { useToast } from './useToast'

import { publicConfig } from '@/lib/config'

let socketInstance: Socket | null = null

export function useSocket() {
    const { isAuthenticated } = useAppStore()
    const toast = useToast()
    const initialized = useRef(false)

    useEffect(() => {
        if (!isAuthenticated || initialized.current) return
        const token = localStorage.getItem('tryst_token')
        if (!token) return

        initialized.current = true
        socketInstance = io(publicConfig.socketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
        })

        socketInstance.on('connect', () => console.log('Socket connected'))
        socketInstance.on('disconnect', () => console.log('Socket disconnected'))
        socketInstance.on('new_match', (data) => {
            toast.success(`It's a Spark! ✦`, `You matched with ${data.partner.alias}`)
        })
        socketInstance.on('connect_error', (e) => console.error('Socket error:', e.message))

        return () => {
            socketInstance?.disconnect()
            socketInstance = null
            initialized.current = false
        }
    }, [isAuthenticated, toast])

    return socketInstance
}

export function getSocket() { return socketInstance }
