import { NextResponse } from "next/server"

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

      // --- Uncovered critical roles ---
      const uncoveredQ = await supabase
        .from("job_postings")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_critical", true)
        .eq("status", "open")
      const uncoveredCriticalRoleCount = uncoveredQ.count ?? 0

      // --- Expiring credentials (within 30 days) ---
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const expiringQ = await supabase
        .from("worker_credentials")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active")
        .lte("expires_at", thirtyDaysFromNow)
      const expiringCredentialCount = expiringQ.count ?? 0

      // --- Overdue onboarding ---
      const onboardingQ = await supabase
        .from("onboarding_items")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["pending", "blocked"])
        .not("due_date", "is", null)
        .lt("due_date", now)
      const overdueOnboardingCount = onboardingQ.count ?? 0

      // --- Overdue assignment responses ---
      const assignmentsQ = await supabase
        .from("work_assignments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "offered")
        .not("response_deadline", "is", null)
        .lt("response_deadline", now)
      const overdueResponseCount = assignmentsQ.count ?? 0

      // --- Conflict backlog ---
      const conflictsQ = await supabase
        .from("assignment_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "open")
      const conflictBacklogCount = conflictsQ.count ?? 0

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
      add("expiring_credential", metrics.expiringCredentialCount, DEFAULT_THRESHOLDS.maxExpiringCredentials, "warning", "/admin/dashboard/staff?tab=roster", `${metrics.expiringCredentialCount} credential(s) expiring within 30 days`)
      add("overdue_response", metrics.overdueResponseCount, DEFAULT_THRESHOLDS.maxOverdueResponses, "warning", "/admin/dashboard/staff?tab=roster", `${metrics.overdueResponseCount} assignment offer(s) past response deadline`)
      add("overdue_onboarding", metrics.overdueOnboardingCount, DEFAULT_THRESHOLDS.maxOverdueOnboarding, "warning", "/admin/dashboard/hiring?tab=onboarding", `${metrics.overdueOnboardingCount} onboarding item(s) overdue`)
      add("conflict_backlog", metrics.conflictBacklogCount, DEFAULT_THRESHOLDS.maxConflictBacklog, "warning", "/admin/dashboard/scheduling", `${metrics.conflictBacklogCount} unresolved scheduling conflict(s)`)

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
