import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
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
    const authResult = await authenticateApiRequest(request)
    if (!authResult)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = telemetrySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid telemetry payload" }, { status: 400 })

    await logConnectTelemetryEvent({
      eventName: parsed.data.eventName,
      connectSessionId: parsed.data.connectSessionId || null,
      platform: parsed.data.platform || "unknown",
      userId: authResult.user.id,
      sessionId: parsed.data.sessionId || null,
      appVersion: parsed.data.appVersion || null,
      osVersion: parsed.data.osVersion || null,
      deviceModel: parsed.data.deviceModel || null,
      metadata: parsed.data.metadata || {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Connect Telemetry API] POST error:", error)
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}
