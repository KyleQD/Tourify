import { NextRequest, NextResponse } from "next/server"

import { replayPublicationOutboxDeadLetter } from "@/lib/admin/publication-outbox.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** PUB-101 — Replay a dead-letter outbox row back to pending. */
export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const outboxId = typeof body?.outboxId === "string" ? body.outboxId.trim() : ""
  if (!outboxId) {
    return NextResponse.json({ success: false, error: "outboxId is required" }, { status: 400 })
  }

  const { data: existing, error: lookupError } = await supabase
    .from("admin_publication_outbox")
    .select("id, org_id, status, correlation_id")
    .eq("id", outboxId)
    .eq("org_id", admin.orgId)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ success: false, error: lookupError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ success: false, error: "Outbox row not found for organization" }, { status: 404 })
  }
  if (existing.status !== "dead") {
    return NextResponse.json(
      { success: false, error: "Only dead-letter rows can be replayed", status: existing.status },
      { status: 409 },
    )
  }

  try {
    const row = await replayPublicationOutboxDeadLetter({
      orgId: admin.orgId,
      outboxId,
      correlationId:
        typeof body?.correlationId === "string" && body.correlationId.trim()
          ? body.correlationId.trim()
          : admin.correlationId,
    })

    return NextResponse.json({
      success: true,
      row,
      correlationId: row.correlation_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Replay failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
