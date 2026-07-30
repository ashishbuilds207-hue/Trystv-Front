/**
 * OneSignal public + server config.
 * App ID is public (client). REST API key is server-only.
 */

export const ONESIGNAL_APP_ID =
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '804274d9-0ff1-428f-a5f7-ae89a23853c6'

export function getOneSignalServerConfig() {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ONESIGNAL_APP_ID
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY || ''
    return {
        appId,
        restApiKey,
        isConfigured: Boolean(appId && restApiKey),
    }
}
