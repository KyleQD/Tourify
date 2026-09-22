import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  recordLegacyTourRouteHit,
  recordTourClientFanout,
  recordTourTelemetry,
} from "@/lib/admin/tour-observability"
import { withAdminCapability } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  kind: z.enum(["client_fanout", "legacy_route", "stale_read"]),
  endpoint: z.string().min(1).max(240),
  tourId: z.string().uuid().optional().nullable(),
  fanoutCount: z.number().int().min(1).max(100).optional(),
  statusCode: z.number().int().optional(),
  latencyMs: z.number().int().min(0).max(120_000).optional(),
})

/** TOUR-106 — client fanout / legacy / stale beacons from Admin tour surfaces. */
export const POST = withAdminCapability("tour.view", async (request: NextRequest, { user, admin }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
  }

  const { kind, endpoint, tourId, fanoutCount, statusCode, latencyMs } = parsed.data

  if (kind === "client_fanout") {
    await recordTourClientFanout({
      endpoint,
      orgId: admin.orgId,
      userId: user.id,
      tourId: tourId ?? null,
      fanoutCount: fanoutCount ?? 1,
      correlationId: admin.correlationId,
    })
  } else if (kind === "legacy_route") {
    await recordLegacyTourRouteHit({
      endpoint,
      orgId: admin.orgId,
      userId: user.id,
      statusCode: statusCode ?? 200,
      latencyMs: latencyMs ?? 0,
      correlationId: admin.correlationId,
    })
  } else {
    await recordTourTelemetry({
      eventName: "tour.stale_read",
      endpoint,
      orgId: admin.orgId,
      userId: user.id,
      tourId: tourId ?? null,
      statusCode: statusCode ?? 200,
      latencyMs: latencyMs ?? 0,
      correlationId: admin.correlationId,
      isStale: true,
    })
  }

  return NextResponse.json({ success: true })
})
