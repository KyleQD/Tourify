import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, readJson, requireApiUser } from "@/lib/api/route-helpers"
import { logConnectTelemetryEvent } from "@/lib/connect/telemetry"

const telemetrySchema = z.object({
  eventName: z.string().min(2).max(120),
  connectSessionId: z.string().uuid().optional(),
  platform: z.string().min(2).max(50).optional(),
  sessionId: z.string().max(120).optional(),
  appVersion: z.string().max(50).optional(),
  osVersion: z.string().max(80).optional(),
  deviceModel: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response

    const parsed = await readJson(request, telemetrySchema, "invalid_request", "Invalid telemetry payload")
    if (!parsed.success) return parsed.response

    await logConnectTelemetryEvent({
      eventName: parsed.data.eventName,
      connectSessionId: parsed.data.connectSessionId || null,
      platform: parsed.data.platform || "unknown",
      userId: authResult.auth.user.id,
      sessionId: parsed.data.sessionId || null,
      appVersion: parsed.data.appVersion || null,
      osVersion: parsed.data.osVersion || null,
      deviceModel: parsed.data.deviceModel || null,
      metadata: parsed.data.metadata || {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Connect Telemetry API] POST error:", error)
    return jsonError({
      status: 400,
      code: "invalid_request",
      message: "Invalid request payload",
      retryable: false,
    })
  }
}
