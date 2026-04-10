import { apiRequest } from "@/lib/api/client"

interface ConnectTelemetryPayload {
  eventName: string
  connectSessionId?: string
  platform?: string
  metadata?: Record<string, unknown>
}

export async function sendConnectTelemetry(payload: ConnectTelemetryPayload) {
  try {
    await apiRequest<{ success: boolean }>("/api/connect/telemetry", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        platform: payload.platform || "mobile",
      }),
      queueOnOffline: false,
      preferCachedOnOffline: false,
    })
  } catch {
    // Telemetry should never block user flow
  }
}
