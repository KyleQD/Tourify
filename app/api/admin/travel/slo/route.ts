import { NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TRAVEL-601 — Travel SLO metrics and alerts for the acting org.
 * Returns computed travel SLO metrics based on upcoming confirmed segments/rooms.
 */
export const GET = withAdminCapability(
  "logistics.view",
  async (_request, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const in72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()

      // Missing confirmed flight/ground segments in next 72 hours
      const missingSegmentsQ = await supabase
        .from("travel_segments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["proposed", "requested"])
        .not("departure_at", "is", null)
        .lte("departure_at", in72h)
        .gte("departure_at", now)
      const missingSegmentsNext72h = missingSegmentsQ.count ?? 0

      // Missing confirmed lodging rooms in next 72 hours
      const missingRoomsQ = await supabase
        .from("lodging_bookings")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["proposed", "requested"])
        .not("check_in_date", "is", null)
        .lte("check_in_date", in72h.slice(0, 10))
        .gte("check_in_date", now.slice(0, 10))
      const missingRoomsNext72h = missingRoomsQ.count ?? 0

      // Capacity conflicts
      const conflictsQ = await supabase
        .from("travel_capacity_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "open")
      const capacityConflictCount = conflictsQ.count ?? 0

      // Stale confirmations (> 7 days without update)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const staleQ = await supabase
        .from("travel_segments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "confirmed")
        .lte("updated_at", sevenDaysAgo)
      const staleConfirmationCount = staleQ.count ?? 0

      const DEFAULT_THRESHOLDS = {
        maxMissingSegmentsNext72h: 0,
        maxMissingRoomsNext72h: 0,
        maxCapacityConflicts: 0,
        maxStaleConfirmations: 5,
        maxDelayImpacts: 3,
        maxImportFailures: 0,
        maxNotificationFailures: 0,
      }

      const metrics = {
        orgId,
        missingSegmentsNext72h,
        missingRoomsNext72h,
        capacityConflictCount,
        staleConfirmationCount,
        delayImpactCount: 0,
        importFailureCount: 0,
        notificationFailureCount: 0,
      }

      const alerts: Array<{
        alertType: string
        orgId: string
        severity: "warning" | "critical"
        actual: number
        remediationPath: string
        label: string
      }> = []

      const add = (
        alertType: string,
        actual: number,
        threshold: number,
        severity: "warning" | "critical",
        remediationPath: string,
        label: string,
      ) => {
        if (actual > threshold) {
          alerts.push({ alertType, orgId, severity, actual, remediationPath, label })
        }
      }

      add("missing_next_72h_segments", metrics.missingSegmentsNext72h, DEFAULT_THRESHOLDS.maxMissingSegmentsNext72h, "critical", "/admin/dashboard/logistics?tab=travel", `${metrics.missingSegmentsNext72h} travel segment(s) unconfirmed in next 72h`)
      add("missing_next_72h_rooms", metrics.missingRoomsNext72h, DEFAULT_THRESHOLDS.maxMissingRoomsNext72h, "critical", "/admin/dashboard/logistics?tab=lodging", `${metrics.missingRoomsNext72h} lodging room(s) unconfirmed in next 72h`)
      add("capacity_conflict", metrics.capacityConflictCount, DEFAULT_THRESHOLDS.maxCapacityConflicts, "critical", "/admin/dashboard/logistics?tab=travel", `${metrics.capacityConflictCount} travel capacity conflict(s)`)
      add("stale_confirmation", metrics.staleConfirmationCount, DEFAULT_THRESHOLDS.maxStaleConfirmations, "warning", "/admin/dashboard/logistics?tab=travel", `${metrics.staleConfirmationCount} confirmed segment(s) not updated in 7+ days`)

      return NextResponse.json({
        success: true,
        metrics,
        alerts,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          metrics: null,
          alerts: [],
          freshAt: new Date().toISOString(),
          unavailable: true,
          unavailableReason: "Travel tables not yet migrated.",
        })
      }
      console.error("[Admin Travel SLO]", error)
      return NextResponse.json(
        { error: "Travel SLO unavailable", code: "travel_slo_failed" },
        { status: 503 },
      )
    }
  },
)
