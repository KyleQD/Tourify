import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import {
  assertOrgEntityReferences,
  listOrgEventIds,
  OrgEntityAccessError,
} from "@/lib/admin/org-entity-access"

const querySchema = z.object({
  event_id: z.string().uuid().optional(),
  ticket_type_id: z.string().uuid().optional(),
  movement_type: z.enum([
    "reserve",
    "sell",
    "hold",
    "comp",
    "transfer_in",
    "transfer_out",
    "release",
    "void",
    "refund",
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * TIX-502 — Canonical inventory ledger.
 * Returns append-only inventory movement rows for an org-scoped event or
 * all events belonging to the acting org.
 */
export const GET = withAdminCapability(
  "ticketing.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const params = Object.fromEntries(new URL(request.url).searchParams.entries())
      const input = querySchema.parse(params)

      // Resolve which events we're allowed to query.
      let eventIds: string[]
      if (input.event_id) {
        await assertOrgEntityReferences(supabase, admin.orgId, {
          eventId: input.event_id,
        })
        eventIds = [input.event_id]
      } else {
        eventIds = await listOrgEventIds(supabase, admin.orgId)
      }

      if (eventIds.length === 0) {
        return NextResponse.json({
          success: true,
          entries: [],
          total: 0,
          freshAt: new Date().toISOString(),
        })
      }

      // Attempt to query the canonical ticketing_inventory_ledger table.
      // Falls back to an empty result with a feature-flag note if the table
      // doesn't exist yet (pre-migration environment).
      let query = supabase
        .from("ticketing_inventory_ledger")
        .select("*", { count: "exact" })
        .in("event_id", eventIds)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.ticket_type_id) {
        query = query.eq("ticket_type_id", input.ticket_type_id)
      }
      if (input.movement_type) {
        query = query.eq("movement_type", input.movement_type)
      }

      const { data, error, count } = await query

      if (error) {
        // Table not yet migrated — surface as a feature-flag disabled state.
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            entries: [],
            total: 0,
            freshAt: new Date().toISOString(),
            unavailable: true,
            unavailableReason:
              "Canonical inventory ledger table is not yet enabled. Run the ticketing_v2 migration to activate.",
          })
        }
        throw error
      }

      return NextResponse.json({
        success: true,
        entries: data ?? [],
        total: count ?? 0,
        freshAt: new Date().toISOString(),
      })
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
      console.error("[Admin Ticketing Inventory]", error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Inventory unavailable",
          code: "inventory_failed",
        },
        { status: 503 },
      )
    }
  },
)
