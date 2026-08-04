import { NextResponse } from "next/server"
import { z } from "zod"

import {
  isTicketingReadModelEnabled,
  loadTicketingReadModel,
} from "@/lib/admin/ticketing-read-model"
import {
  assertOrgEntityReferences,
  listOrgEventIds,
  OrgEntityAccessError,
} from "@/lib/admin/org-entity-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

const querySchema = z.object({
  event_id: z.string().uuid().optional(),
})

/**
 * TIX-104 — Dual-read legacy vs canonical totals; exposes cutover blockers.
 */
export const GET = withAdminCapability("ticketing.view", async (request, { supabase, admin }) => {
  try {
    if (!isTicketingReadModelEnabled()) {
      return NextResponse.json({
        success: true,
        data: {
          readModelEnabled: false,
          flag: "admin_ticketing_canonical_v1",
          message: "Set FEATURE_TICKETING_V2 or FEATURE_ADMIN_TICKETING_READ_MODEL to enable dual-read.",
          canCutover: false,
          cutoverBlockedReasons: ["read_model_disabled"],
          mismatches: [],
        },
      })
    }

    const input = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )

    let eventIds: string[]
    if (input.event_id) {
      await assertOrgEntityReferences(supabase, admin.orgId, { eventId: input.event_id })
      eventIds = [input.event_id]
    } else {
      eventIds = await listOrgEventIds(supabase, admin.orgId)
    }

    const comparison = await loadTicketingReadModel({
      supabase,
      orgId: admin.orgId,
      eventIds,
      eventId: input.event_id ?? null,
    })

    return NextResponse.json({ success: true, data: comparison })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", code: "validation_error", details: error.errors },
        { status: 400 },
      )
    }
    if (error instanceof OrgEntityAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      )
    }
    console.error("[Admin Ticketing Read Model]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read model unavailable", code: "read_model_failed" },
      { status: 503 },
    )
  }
})
