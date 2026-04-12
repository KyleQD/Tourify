import { apiRequest } from "@/lib/api/client"
import Constants from "expo-constants"
import { Platform } from "react-native"

interface ConnectTelemetryPayload {
  eventName: string
  connectSessionId?: string
  platform?: string
  sessionId?: string
  appVersion?: string
  osVersion?: string
  deviceModel?: string
  metadata?: Record<string, unknown>
}

export async function sendConnectTelemetry(payload: ConnectTelemetryPayload) {
  try {
    const appVersion = payload.appVersion || Constants.expoConfig?.version || null
    await apiRequest<{ success: boolean }>("/api/connect/telemetry", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        platform: payload.platform || "mobile",
        appVersion,
        osVersion: payload.osVersion || `${Platform.OS}-${Platform.Version}`,
        deviceModel: payload.deviceModel || Platform.constants?.Brand || null,
      }),
      queueOnOffline: false,
      preferCachedOnOffline: false,
    })
  } catch {
    // Telemetry should never block user flow
  }
}
