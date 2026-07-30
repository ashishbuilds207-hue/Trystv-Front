'use client'

/**
 * Re-export Supabase WebRTC calling (Twilio removed).
 */
export {
    useSupabaseCall,
    useSupabaseCall as useTwilioCall,
    type CallMode,
    type CallPhase,
    type CallPeer,
} from './useSupabaseCall'
