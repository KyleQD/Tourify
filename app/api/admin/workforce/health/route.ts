import { NextResponse } from "next/server"

import { detectDoubleBookings } from "@/lib/admin/staff-scheduling-conflicts"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * WORK-603 — Workforce SLO / health alerts.
 * Returns governed health metrics and breach alerts for the acting org.
 */
export const GET = withAdminCapability(
  "workforce.view",
  async (_request, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const now = new Date().toISOString()
      const today = now.slice(0, 10)

      // Org staff ids — shared scope for shift-derived metrics.
      const membersResult = await supabase
        .from("staff_members")
        .select("id")
        .eq("employer_entity_type", "organization")
        .eq("employer_entity_id", admin.profileId)
        .limit(500)
      const staffIds = ((membersResult.data ?? []) as Array<{ id: string }>).map((row) => String(row.id)).filter(Boolean)

      // --- Uncovered critical roles ---
      const uncoveredQ = await supabase
        .from("job_postings")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_critical", true)
        .eq("status", "open")
      const uncoveredCriticalRoleCount = uncoveredQ.error ? 0 : (uncoveredQ.count ?? 0)

      // --- Expiring credentials (within 30 days) — real staff_documents data ---
      const INACTIVE_DOC_STATUSES = new Set(["expired", "rejected", "revoked", "archived", "deleted"])
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const documentsQ = await supabase
        .from("staff_documents")
        .select("id, expires_at, expiration_date, status")
        .eq("employer_entity_type", "organization")
        .eq("employer_entity_id", admin.profileId)
        .limit(500)
      const expiringCredentialCount = documentsQ.error
        ? 0
        : ((documentsQ.data ?? []) as Array<Record<string, unknown>>).filter((row) => {
            const status = typeof row.status === "string" ? row.status.toLowerCase() : ""
            if (INACTIVE_DOC_STATUSES.has(status)) return false
            const expiry = typeof row.expires_at === "string" ? row.expires_at
              : typeof row.expiration_date === "string" ? row.expiration_date : null
            if (!expiry) return false
            const timestamp = new Date(expiry).getTime()
            return Number.isFinite(timestamp) && timestamp <= thirtyDaysFromNow.getTime()
          }).length

      // --- Overdue onboarding ---
      const onboardingQ = await supabase
        .from("onboarding_items")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["pending", "blocked"])
        .not("due_date", "is", null)
        .lt("due_date", now)
      const overdueOnboardingCount = onboardingQ.error ? 0 : (onboardingQ.count ?? 0)

      // --- Overdue assignment responses — scheduled (unconfirmed) shifts already past ---
      const assignmentsQ = staffIds.length
        ? await supabase
            .from("staff_shifts")
            .select("id", { count: "exact", head: true })
            .in("staff_member_id", staffIds)
            .eq("status", "scheduled")
            .lt("shift_date", today)
        : { count: 0, error: null }
      const overdueResponseCount = assignmentsQ.error ? 0 : (assignmentsQ.count ?? 0)

      // --- Conflict backlog — double-bookings derived from real staff_shifts ---
      const conflictThrough = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
      const conflictShiftsQ = staffIds.length
        ? await supabase
            .from("staff_shifts")
            .select("id, staff_member_id, shift_date, start_time, end_time, role_assignment, status")
            .in("staff_member_id", staffIds)
            .gte("shift_date", today)
            .lte("shift_date", conflictThrough)
            .neq("status", "cancelled")
            .limit(500)
        : { data: [], error: null }
      const conflictBacklogCount = conflictShiftsQ.error
        ? 0
        : detectDoubleBookings(
            (conflictShiftsQ.data ?? []) as Parameters<typeof detectDoubleBookings>[0],
          ).length

      const DEFAULT_THRESHOLDS = {
        maxUncoveredCriticalRoles: 0,
        maxExpiringCredentials: 5,
        maxOverdueResponses: 3,
        maxOverdueOnboarding: 5,
        maxNotificationFailures: 0,
        maxConflictBacklog: 10,
        maxIdentitySyncFailures: 0,
      }

      const metrics = {
        orgId,
        uncoveredCriticalRoleCount,
        expiringCredentialCount,
        overdueResponseCount,
        overdueOnboardingCount,
        notificationFailureCount: 0, // sourced from observability, not DB
        conflictBacklogCount,
        identitySyncFailureCount: 0, // sourced from sync queue, not DB
      }

      interface WorkforceSloAlertWithMeta {
        alertType: string
        orgId: string
        severity: "warning" | "critical"
        actual: number
        remediationPath: string
        label: string
      }
      const alerts: WorkforceSloAlertWithMeta[] = []
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

      add("uncovered_critical_role", metrics.uncoveredCriticalRoleCount, DEFAULT_THRESHOLDS.maxUncoveredCriticalRoles, "critical", "/admin/dashboard/hiring?tab=jobs", `${metrics.uncoveredCriticalRoleCount} critical role(s) unfilled`)
      add("expiring_credential", metrics.expiringCredentialCount, DEFAULT_THRESHOLDS.maxExpiringCredentials, "warning", "/admin/dashboard/staff?tab=team", `${metrics.expiringCredentialCount} credential(s) expiring within 30 days`)
      add("overdue_response", metrics.overdueResponseCount, DEFAULT_THRESHOLDS.maxOverdueResponses, "warning", "/admin/dashboard/staff?tab=team", `${metrics.overdueResponseCount} assignment offer(s) past response deadline`)
      add("overdue_onboarding", metrics.overdueOnboardingCount, DEFAULT_THRESHOLDS.maxOverdueOnboarding, "warning", "/admin/dashboard/hiring?tab=onboarding", `${metrics.overdueOnboardingCount} onboarding item(s) overdue`)
      add("conflict_backlog", metrics.conflictBacklogCount, DEFAULT_THRESHOLDS.maxConflictBacklog, "warning", "/admin/dashboard/staff?tab=scheduling", `${metrics.conflictBacklogCount} unresolved scheduling conflict(s)`)

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
      // Handle missing table gracefully (pre-migration environment)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          metrics: null,
          alerts: [],
          freshAt: new Date().toISOString(),
          unavailable: true,
          unavailableReason: "Workforce tables not yet migrated.",
        })
      }
      console.error("[Admin Workforce Health]", error)
      return NextResponse.json(
        { error: "Workforce health unavailable", code: "health_failed" },
        { status: 503 },
      )
    }
  },
)
