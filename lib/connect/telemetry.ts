import { createHash, randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"

interface ConnectTelemetryInput {
  eventName: string
  connectSessionId?: string | null
  platform?: string | null
  userId?: string | null
  sessionId?: string | null
  appVersion?: string | null
  osVersion?: string | null
  deviceModel?: string | null
  metadata?: Record<string, unknown>
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function logConnectTelemetryEvent(input: ConnectTelemetryInput) {
  try {
    const serviceClient = createServiceClient()
    if (!serviceClient) return

    await serviceClient.from("connect_telemetry_events").insert({
      request_id: randomUUID(),
      event_name: input.eventName,
      connect_session_id: input.connectSessionId || null,
      platform: input.platform || "unknown",
      session_id: input.sessionId || null,
      user_id_hash: input.userId ? hashUserId(input.userId) : null,
      app_version: input.appVersion || null,
      os_version: input.osVersion || null,
      device_model: input.deviceModel || null,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("[connect telemetry] event skipped:", error)
  }
}

function hashUserId(value: string) {
  return createHash("sha256").update(value).digest("hex")
}
