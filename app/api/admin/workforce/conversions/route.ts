import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * HIRE-406 / WORK-103 — Roster handoff: hired candidate → canonical worker identity.
 * Lists recent conversion records and their step-machine progress for the acting org.
 */
export const GET = withAdminCapability(
  "hiring.manage",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const limit = Math.min(Number(searchParams.get("limit") ?? 25), 100)

      const { data, error } = await supabase
        .from("identity_conversions")
        .select(
          "id, org_id, application_id, offer_id, requisition_id, onboarding_instance_id, user_id, org_person_id, tour_role_assignment_id, work_mode_access_id, applicant_email, applicant_name, role, department, tour_id, event_id, status, steps, rollback_reason, rolled_back_by, rolled_back_at, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            conversions: [],
            unavailable: true,
            unavailableReason: "Identity conversions table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const conversions = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          orgId: String(r.org_id),
          applicationId: String(r.application_id ?? ""),
          offerId: String(r.offer_id ?? ""),
          requisitionId: String(r.requisition_id ?? ""),
          onboardingInstanceId: String(r.onboarding_instance_id ?? ""),
          userId: r.user_id ? String(r.user_id) : null,
          orgPersonId: r.org_person_id ? String(r.org_person_id) : null,
          tourRoleAssignmentId: r.tour_role_assignment_id ? String(r.tour_role_assignment_id) : null,
          workModeAccessId: r.work_mode_access_id ? String(r.work_mode_access_id) : null,
          applicantEmail: String(r.applicant_email ?? ""),
          applicantName: String(r.applicant_name ?? ""),
          role: String(r.role ?? ""),
          department: String(r.department ?? ""),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          status: String(r.status ?? "pending"),
          steps: Array.isArray(r.steps) ? r.steps : [],
          rollbackReason: r.rollback_reason ? String(r.rollback_reason) : null,
          rolledBackBy: r.rolled_back_by ? String(r.rolled_back_by) : null,
          rolledBackAt: r.rolled_back_at ? String(r.rolled_back_at) : null,
          createdAt: String(r.created_at ?? ""),
          updatedAt: String(r.updated_at ?? ""),
        }
      })

      return NextResponse.json({
        success: true,
        conversions,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          conversions: [],
          unavailable: true,
          unavailableReason: "Identity conversions table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Workforce Conversions]", error)
      return NextResponse.json({ error: "Conversions unavailable", code: "conversions_failed" }, { status: 503 })
    }
  },
)
