import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  backfillOrgTourPlans,
  normalizeTourPlanDraft,
} from "@/lib/admin/tour-plan-normalize.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  tour_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
})

/**
 * PLAN-201 — Deterministic backfill of tour_versions/tour_stops for a tour or org.
 * Unresolved conflicts land in tour_plan_quarantine for review.
 */
export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (parsed.data.tour_id) {
      const result = await normalizeTourPlanDraft({
        supabase,
        userId: user.id,
        tourId: parsed.data.tour_id,
        orgId: admin.orgId,
      })
      return NextResponse.json({
        success: true,
        mode: "tour",
        result: {
          tourId: result.tourId,
          versionId: result.versionId,
          versionNumber: result.versionNumber,
          stopCount: result.stopCount,
          quarantineCount: result.quarantineCount,
          skipped: result.skipped,
          skipReason: result.skipReason,
          conflicts: result.backfill.quarantine.map((item) => ({
            conflict_type: item.conflict_type,
            reason: item.reason,
            source_ref: item.source_ref,
          })),
        },
      })
    }

    const batch = await backfillOrgTourPlans({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      limit: parsed.data.limit,
    })

    return NextResponse.json({
      success: true,
      mode: "org",
      processed: batch.processed,
      persisted: batch.persisted,
      quarantinedTours: batch.quarantinedTours,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Plan backfill failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
