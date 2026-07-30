/**
 * Twilio credentials — server-only secrets + public account SID for docs.
 * Never expose API Key Secret or Auth Token to the client.
 */

export function getTwilioServerConfig() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    const apiKey = process.env.TWILIO_API_KEY || ''
    const apiSecret = process.env.TWILIO_API_SECRET || ''
    const authToken = process.env.TWILIO_AUTH_TOKEN || ''
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID || ''

    return {
        accountSid,
        apiKey,
        apiSecret,
        authToken,
        twimlAppSid,
        isConfigured: Boolean(accountSid && apiKey && apiSecret),
    }
}
