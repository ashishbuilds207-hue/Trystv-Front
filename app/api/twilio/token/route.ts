import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { getRequestUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTwilioServerConfig } from '@/lib/twilio/config'

const AccessToken = twilio.jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant
const VoiceGrant = AccessToken.VoiceGrant

/**
 * POST /api/twilio/token
 * Body: { matchId: string, mode: 'audio' | 'video' }
 * Returns a short-lived Access Token for Twilio Video (and Voice grant when TwiML app is set).
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getRequestUser(req)
        if (!user) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const matchId = String(body.matchId || '')
        const mode = body.mode === 'audio' ? 'audio' : 'video'

        if (!matchId) {
            return NextResponse.json({ success: false, message: 'matchId required' }, { status: 400 })
        }

        const sb = createServiceClient()
        const { data: match } = await sb.from('matches').select('*').eq('id', matchId).single()
        if (!match) {
            return NextResponse.json({ success: false, message: 'Match not found' }, { status: 404 })
        }
        if (match.user1_id !== user.id && match.user2_id !== user.id) {
            return NextResponse.json({ success: false, message: 'Not your match' }, { status: 403 })
        }

        const isUser1 = match.user1_id === user.id
        const myConsent = isUser1 ? match.user_a_calls_consent : match.user_b_calls_consent
        const partnerConsent = isUser1 ? match.user_b_calls_consent : match.user_a_calls_consent
        if (!myConsent || !partnerConsent) {
            return NextResponse.json(
                { success: false, message: 'Mutual call consent required' },
                { status: 403 },
            )
        }

        const cfg = getTwilioServerConfig()
        if (!cfg.isConfigured) {
            // Dev / demo mode — UI can still run local media controls
            return NextResponse.json({
                success: true,
                data: {
                    token: null,
                    identity: user.id,
                    roomName: `tryst-${matchId}`,
                    mode,
                    mock: true,
                    message: 'Twilio not configured — demo call UI only. Add TWILIO_* keys to .env.local',
                },
            })
        }

        const identity = user.id.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 121)
        const roomName = `tryst-${matchId}`.slice(0, 64)

        const token = new AccessToken(cfg.accountSid, cfg.apiKey, cfg.apiSecret, {
            identity,
            ttl: 60 * 60,
        })

        const videoGrant = new VideoGrant({ room: roomName })
        token.addGrant(videoGrant)

        if (cfg.twimlAppSid) {
            const voiceGrant = new VoiceGrant({
                outgoingApplicationSid: cfg.twimlAppSid,
                incomingAllow: true,
            })
            token.addGrant(voiceGrant)
        }

        return NextResponse.json({
            success: true,
            data: {
                token: token.toJwt(),
                identity,
                roomName,
                mode,
                mock: false,
            },
        })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Token error'
        console.error('[twilio/token]', e)
        return NextResponse.json({ success: false, message: msg }, { status: 500 })
    }
}
