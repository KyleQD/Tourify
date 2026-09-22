import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

interface UxTelemetryInsertClient {
  from(table: "ux_telemetry_events"): {
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>
  }
}

const telemetrySchema = z.object({
  eventName: z.enum([
    "viewed",
    "started",
    "validation_failed",
    "submitted",
    "succeeded",
    "failed",
    "recovered",
    "abandoned",
  ]),
  flow: z.string().min(2).max(80),
  route: z.string().min(1).max(200),
  step: z.string().min(1).max(80).optional(),
  source: z.string().min(1).max(80).optional(),
  latencyBucket: z
    .enum(["under_100ms", "100_300ms", "300_1000ms", "over_1000ms"])
    .optional(),
  errorCategory: z
    .enum([
      "connection",
      "expired_session",
      "permission",
      "validation",
      "conflict",
      "rate_limit",
      "unavailable",
      "removed",
      "unknown",
    ])
    .optional(),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required", code: "not_authenticated" },
      { status: 401 },
    )
  }

  const parsed = telemetrySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid telemetry event", code: "validation_failed" },
      { status: 422 },
    )
  }

  const telemetryClient = supabase as unknown as UxTelemetryInsertClient
  const { error } = await telemetryClient.from("ux_telemetry_events").insert({
    user_id: user.id,
    event_name: parsed.data.eventName,
    flow: parsed.data.flow,
    route: parsed.data.route,
    step: parsed.data.step ?? null,
    source: parsed.data.source ?? null,
    latency_bucket: parsed.data.latencyBucket ?? null,
    error_category: parsed.data.errorCategory ?? null,
    context: parsed.data.context ?? {},
  })

  if (error) {
    console.warn("[ux-telemetry] event not persisted", error.message)
    return NextResponse.json({ accepted: true, persisted: false }, { status: 202 })
  }

  return NextResponse.json({ accepted: true, persisted: true }, { status: 201 })
}
