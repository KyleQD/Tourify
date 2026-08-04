import { NextRequest, NextResponse } from "next/server"

import {
  commitDomainWithOutbox,
  listPublicationOutboxForOrg,
} from "@/lib/admin/publication-outbox.service"
import {
  buildPublicationOutboxIdempotencyKey,
  normalizePublicationCorrelationId,
} from "@/lib/admin/publication-outbox"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** PUB-101 — List org outbox rows (ops visibility). */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const url = new URL(request.url)
  const statusParam = url.searchParams.get("status")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200)
  const status = statusParam
    ? (statusParam.split(",").map((s) => s.trim()).filter(Boolean) as Array<
        "pending" | "processing" | "delivered" | "failed" | "dead"
      >)
    : undefined

  try {
    const rows = await listPublicationOutboxForOrg({
      orgId: admin.orgId,
      status,
      limit,
      client: supabase,
    })
    return NextResponse.json({
      success: true,
      correlationId: admin.correlationId,
      rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list outbox"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

/**
 * PUB-101 — Enqueue a domain command + outbox event atomically (idempotent).
 * Used by later publish commands; exposed for ops/integration smoke.
 */
export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { supabase, user, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "JSON body required" }, { status: 400 })
  }

  const eventType = typeof body.eventType === "string" ? body.eventType.trim() : ""
  const aggregateType = typeof body.aggregateType === "string" ? body.aggregateType.trim() : ""
  const aggregateId = typeof body.aggregateId === "string" ? body.aggregateId.trim() : ""
  const commandName = typeof body.commandName === "string" ? body.commandName.trim() : "publication.enqueue"
  const naturalKey =
    typeof body.naturalKey === "string" && body.naturalKey.trim()
      ? body.naturalKey.trim()
      : typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : ""

  if (!eventType || !aggregateType || !aggregateId || !naturalKey) {
    return NextResponse.json(
      {
        success: false,
        error: "eventType, aggregateType, aggregateId, and naturalKey (or idempotencyKey) are required",
      },
      { status: 400 },
    )
  }

  const correlationId = normalizePublicationCorrelationId(
    typeof body.correlationId === "string" ? body.correlationId : admin.correlationId,
  )

  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : buildPublicationOutboxIdempotencyKey({
          orgId: admin.orgId,
          eventType,
          aggregateType,
          aggregateId,
          naturalKey,
        })

  try {
    const result = await commitDomainWithOutbox(supabase, {
      orgId: admin.orgId,
      commandName,
      correlationId,
      actorUserId: user.id,
      domainPayload:
        body.domainPayload && typeof body.domainPayload === "object"
          ? body.domainPayload
          : {},
      eventType,
      aggregateType,
      aggregateId,
      outboxPayload:
        body.payload && typeof body.payload === "object" ? body.payload : {},
      idempotencyKey,
      maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : 8,
    })

    return NextResponse.json({
      success: true,
      alreadyExisted: result.alreadyExisted,
      transactionId: result.transactionId,
      outboxId: result.outboxId,
      correlationId: result.correlationId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue outbox"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
