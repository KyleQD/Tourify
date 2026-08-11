import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * LOG-601 / LOG-602 — Logistics alerts and operational metrics.
 * Returns equipment, rental, catering, map, and publication alerts.
 */
export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")
      const now = new Date().toISOString()
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Equipment — items past service due date
      const equipQ = supabase
        .from("equipment_assets")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("service_due_date", "is", null)
        .lt("service_due_date", now)

      // Rental agreements — overdue returns
      const rentalQ = supabase
        .from("rental_agreements")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active")
        .not("return_date", "is", null)
        .lt("return_date", now)

      // Catering — approved menus expiring soon (approaching due)
      const cateringQ = supabase
        .from("meal_services")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "planned")
        .lte("service_window_end", thirtyDays)

      const [{ count: overdueEquip }, { count: overdueRentals }, { count: cateringDue }] = await Promise.all([
        equipQ, rentalQ, cateringQ,
      ])

      type AlertSeverity = "warning" | "critical"
      interface LogisticsAlert {
        alertType: string
        severity: AlertSeverity
        count: number
        label: string
        remediationPath: string
      }

      const alerts: LogisticsAlert[] = []
      const add = (alertType: string, count: number, threshold: number, severity: AlertSeverity, label: string, path: string) => {
        if ((count ?? 0) > threshold) {
          alerts.push({ alertType, severity, count: count ?? 0, label, remediationPath: path })
        }
      }

      const logisticsBase = tourId ? `/admin/dashboard/logistics?tour_id=${tourId}` : eventId ? `/admin/dashboard/logistics?event_id=${eventId}` : "/admin/dashboard/logistics"

      add("overdue_equipment_service", overdueEquip ?? 0, 0, "warning", `${overdueEquip ?? 0} equipment item(s) past service date`, `${logisticsBase}&tab=equipment`)
      add("overdue_rental_return", overdueRentals ?? 0, 0, "critical", `${overdueRentals ?? 0} rental(s) overdue for return`, `${logisticsBase}&tab=equipment`)
      add("catering_approaching_due", cateringDue ?? 0, 2, "warning", `${cateringDue ?? 0} catering service(s) need confirmation`, `${logisticsBase}&tab=catering`)

      const metrics = {
        overdueEquipmentService: overdueEquip ?? 0,
        overdueRentalReturns: overdueRentals ?? 0,
        cateringApproachingDue: cateringDue ?? 0,
      }

      return NextResponse.json({ success: true, alerts, metrics, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          alerts: [],
          metrics: { overdueEquipmentService: 0, overdueRentalReturns: 0, cateringApproachingDue: 0 },
          unavailable: true,
          unavailableReason: "Logistics alert tables not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Logistics Alerts]", error)
      return NextResponse.json({ error: "Logistics alerts unavailable" }, { status: 503 })
    }
  },
)
