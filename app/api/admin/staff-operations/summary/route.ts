import { NextResponse } from "next/server"

import { detectDoubleBookings } from "@/lib/admin/staff-scheduling-conflicts"
import { rankStaffOperationsTasks } from "@/lib/admin/staff-operations-ranking"
import { withAdminCapability } from "@/lib/auth/api-auth"
import type { StaffOperationsPriority, StaffOperationsSummary, StaffOperationsTask } from "@/types/staff-operations"

const DAY_MS = 86_400_000

/** staff_documents statuses that should not surface as expiring credentials. */
const INACTIVE_DOCUMENT_STATUSES = new Set(["expired", "rejected", "revoked", "archived", "deleted"])

function priority(value: unknown): StaffOperationsPriority {
  if (value === "urgent" || value === "critical") return "critical"
  if (value === "high" || value === "warning") return "high"
  if (value === "low") return "low"
  return "normal"
}

function dueIsOverdue(value: unknown, now: Date) {
  if (typeof value !== "string") return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp < now.getTime()
}

function unavailable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.code === "42703" || error.message?.includes("does not exist")))
}

/** Earliest expiry across the two expiry columns staff_documents carries. */
function documentExpiry(row: Record<string, unknown>): string | null {
  const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null
  const expirationDate = typeof row.expiration_date === "string" ? row.expiration_date : null
  if (expiresAt && expirationDate) return expiresAt < expirationDate ? expiresAt : expirationDate
  return expiresAt ?? expirationDate
}

export const GET = withAdminCapability(
  "workforce.view",
  async (_request, { supabase, admin, user }) => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const through = new Date(now.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)
    const conflictThrough = new Date(now.getTime() + 30 * DAY_MS).toISOString().slice(0, 10)
    const unavailableSources: string[] = []

    const membersResult = await supabase
      .from("staff_members")
      .select("id, user_id, name, status")
      .eq("employer_entity_type", "organization")
      .eq("employer_entity_id", admin.profileId)
      .limit(500)

    if (membersResult.error && !unavailable(membersResult.error)) {
      return NextResponse.json({ error: "Unable to load the active workforce." }, { status: 503 })
    }
    if (membersResult.error) unavailableSources.push("team")
    const members = (membersResult.data ?? []) as Array<Record<string, unknown>>
    const staffIds = members.map((row) => String(row.id)).filter(Boolean)

    // --- Schedule: real staff_shifts rows for the org's staff (next 7 days) ---
    const shiftsResult = staffIds.length
      ? await supabase
          .from("staff_shifts")
          .select("id, staff_member_id, shift_date, start_time, end_time, role_assignment, zone_assignment, status")
          .in("staff_member_id", staffIds)
          .gte("shift_date", today)
          .lte("shift_date", through)
          .neq("status", "cancelled")
          .order("shift_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(200)
      : { data: [], error: null }
    if (shiftsResult.error) unavailableSources.push("schedule")
    const shifts = (shiftsResult.data ?? []) as Array<Record<string, unknown>>

    // --- Conflicts: double-bookings derived from real staff_shifts (next 30 days) ---
    const conflictShiftsResult = staffIds.length
      ? await supabase
          .from("staff_shifts")
          .select("id, staff_member_id, shift_date, start_time, end_time, role_assignment, status")
          .in("staff_member_id", staffIds)
          .gte("shift_date", today)
          .lte("shift_date", conflictThrough)
          .neq("status", "cancelled")
          .limit(500)
      : { data: [], error: null }
    if (conflictShiftsResult.error) unavailableSources.push("conflicts")
    const conflicts = detectDoubleBookings(
      (conflictShiftsResult.data ?? []) as Array<{
        id: string
        staff_member_id: string | null
        shift_date: string | null
        start_time: string | null
        end_time: string | null
        role_assignment: string | null
        status: string | null
      }>,
    )

    // --- Assignment responses: shifts still waiting on a crew response ---
    // "scheduled" = offered, awaiting confirmation. "open"/"offered" = coverage gap.
    const assignments = shifts.filter((row) => {
      const status = typeof row.status === "string" ? row.status.toLowerCase() : "scheduled"
      return status === "scheduled" || status === "open" || status === "offered" || status === "pending"
    })

    // --- Credentials: staff documents expiring within 30 days ---
    const credentialCutoff = new Date(now.getTime() + 30 * DAY_MS)
    const documentsResult = await supabase
      .from("staff_documents")
      .select("id, document_name, document_type, credential_type, expires_at, expiration_date, status, staff_member_id")
      .eq("employer_entity_type", "organization")
      .eq("employer_entity_id", admin.profileId)
      .limit(200)
    if (documentsResult.error) unavailableSources.push("credentials")
    const credentials = ((documentsResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => {
        const status = typeof row.status === "string" ? row.status.toLowerCase() : ""
        if (INACTIVE_DOCUMENT_STATUSES.has(status)) return false
        const expiry = documentExpiry(row)
        if (!expiry) return false
        const timestamp = new Date(expiry).getTime()
        return Number.isFinite(timestamp) && timestamp <= credentialCutoff.getTime()
      })
      .sort((a, b) => String(documentExpiry(a)).localeCompare(String(documentExpiry(b))))
      .slice(0, 50)

    // --- Event tasks: logistics + workflow tasks on the org's real events ---
    let logistics: Array<Record<string, unknown>> = []
    let eventTasks: Array<Record<string, unknown>> = []
    const canViewEventTasks = admin.capabilities.includes("event.view") || admin.capabilities.includes("logistics.view")
    if (canViewEventTasks) {
      const eventsResult = await supabase.from("events").select("id").eq("org_id", admin.orgId).limit(500)
      const eventIds = (eventsResult.data ?? []).map((row: { id: string }) => row.id)
      if (eventsResult.error) unavailableSources.push("event tasks")
      if (eventIds.length) {
        const logisticsPromise = admin.capabilities.includes("logistics.view")
          ? supabase
              .from("logistics_tasks")
              .select("id, event_id, title, description, status, priority, due_date, assigned_to_user_id")
              .in("event_id", eventIds)
              .in("status", ["pending", "in_progress", "needs_attention"])
              .order("due_date", { ascending: true, nullsFirst: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null })
        const threadsPromise = admin.capabilities.includes("event.view")
          ? supabase
              .from("workflow_threads")
              .select("id, scope_id")
              .eq("scope_type", "event")
              .in("scope_id", eventIds)
              .limit(500)
          : Promise.resolve({ data: [], error: null })
        const [logisticsResult, threadsResult] = await Promise.all([
          logisticsPromise,
          threadsPromise,
        ])
        if (logisticsResult.error) unavailableSources.push("event tasks")
        logistics = (logisticsResult.data ?? []) as Array<Record<string, unknown>>
        if (threadsResult.error) unavailableSources.push("workflow tasks")
        const threadEvent = new Map((threadsResult.data ?? []).map((row: { id: string; scope_id: string }) => [row.id, row.scope_id]))
        const threadIds = Array.from(threadEvent.keys())
        if (threadIds.length) {
          const workflowResult = await supabase
            .from("workflow_tasks")
            .select("id, thread_id, title, description, status, priority, due_at, assignee_id")
            .in("thread_id", threadIds)
            .in("status", ["todo", "doing", "blocked"])
            .order("due_at", { ascending: true, nullsFirst: false })
            .limit(100)
          if (workflowResult.error) unavailableSources.push("workflow tasks")
          eventTasks = ((workflowResult.data ?? []) as Array<Record<string, unknown>>).map((task) => ({
            ...task,
            event_id: threadEvent.get(String(task.thread_id)) ?? null,
          }))
        }
      }
    }

    const notificationsResult = await supabase
      .from("notifications")
      .select("id, type, title, content, metadata, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .eq("target_profile_id", admin.profileId)
      .eq("target_account_type", "organization")
      .eq("is_read", false)
      .in("type", [
        "workflow_task_completed", "event_task_completed", "task_completed", "shift_assignment_response",
        "staff_time_off_request", "workforce_availability_request", "shift_swap_request",
        "shift_drop_request", "shift_pickup_request", "workforce_request_submitted",
      ])
      .limit(100)
    if (notificationsResult.error) unavailableSources.push("updates")

    const tasks: StaffOperationsTask[] = []
    for (const conflict of conflicts) {
      tasks.push({
        id: conflict.id,
        source: "scheduling",
        kind: conflict.conflictType,
        title: conflict.severity === "critical" ? "Critical scheduling conflict" : "Scheduling conflict",
        description: conflict.description,
        priority: conflict.severity === "critical" ? "critical" : "high",
        status: conflict.status,
        dueAt: null,
        actorName: null,
        actionHref: "/admin/dashboard/staff?tab=scheduling",
        isOverdue: conflict.severity === "critical",
      })
    }
    for (const row of assignments) {
      const status = typeof row.status === "string" ? row.status.toLowerCase() : "scheduled"
      const isCoverageGap = status === "open" || status === "offered"
      const dueAt = typeof row.shift_date === "string" ? row.shift_date : null
      const role = String(row.role_assignment ?? "shift")
      tasks.push({
        id: `assignment:${String(row.id)}`,
        source: isCoverageGap ? "scheduling" : "request",
        kind: isCoverageGap ? "coverage_gap" : "assignment_response",
        title: isCoverageGap ? `Open ${role} shift` : `Response needed for ${role}`,
        description: isCoverageGap
          ? "This shift still needs an approved team member."
          : dueIsOverdue(dueAt, now) ? "The assignment response deadline has passed." : "A crew assignment is waiting for a response.",
        priority: dueIsOverdue(dueAt, now) ? "critical" : "high",
        status: isCoverageGap ? "open" : "pending",
        dueAt,
        actorName: null,
        actionHref: "/admin/dashboard/staff?tab=team",
        isOverdue: dueIsOverdue(dueAt, now),
      })
    }
    for (const row of credentials) {
      const dueAt = documentExpiry(row)
      const label = String(row.document_name ?? row.credential_type ?? row.document_type ?? "Credential")
      tasks.push({
        id: `credential:${String(row.id)}`,
        source: "credential",
        kind: "credential_expiry",
        title: `${label} expires soon`,
        description: "Review or renew this workforce credential before it expires.",
        priority: dueIsOverdue(dueAt, now) ? "critical" : "high",
        status: "active",
        dueAt,
        actorName: null,
        actionHref: "/admin/dashboard/staff?tab=team",
        isOverdue: dueIsOverdue(dueAt, now),
      })
    }
    for (const row of logistics) {
      const dueAt = typeof row.due_date === "string" ? row.due_date : null
      tasks.push({
        id: `logistics:${String(row.id)}`,
        source: "logistics_task",
        kind: "event_logistics",
        title: String(row.title ?? "Event logistics task"),
        description: typeof row.description === "string" ? row.description : null,
        priority: priority(row.priority),
        status: String(row.status ?? "pending"),
        dueAt,
        actorName: null,
        actionHref: row.event_id ? `/admin/dashboard/events/${String(row.event_id)}?tab=logistics` : "/admin/dashboard/logistics",
        isOverdue: dueIsOverdue(dueAt, now),
      })
    }
    for (const row of eventTasks) {
      const dueAt = typeof row.due_at === "string" ? row.due_at : null
      tasks.push({
        id: `event-task:${String(row.id)}`,
        source: "event_task",
        kind: "event_workflow",
        title: String(row.title ?? "Event workflow task"),
        description: typeof row.description === "string" ? row.description : null,
        priority: priority(row.priority),
        status: String(row.status ?? "todo"),
        dueAt,
        actorName: null,
        actionHref: row.event_id ? `/admin/dashboard/events/${String(row.event_id)}?tab=tasks` : "/admin/dashboard/events",
        isOverdue: dueIsOverdue(dueAt, now),
      })
    }
    for (const row of (notificationsResult.data ?? []) as Array<Record<string, unknown>>) {
      const type = String(row.type ?? "")
      if (!["staff_time_off_request", "workforce_availability_request", "shift_swap_request", "shift_drop_request", "shift_pickup_request", "workforce_request_submitted"].includes(type)) continue
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {}
      const link = typeof metadata.link === "string" && metadata.link.startsWith("/")
        ? metadata.link
        : "/admin/dashboard/staff?tab=scheduling"
      tasks.push({
        id: `request-notification:${String(row.id)}`,
        source: "request",
        kind: type,
        title: String(row.title ?? "Workforce request"),
        description: typeof row.content === "string" ? row.content : null,
        priority: type === "workforce_availability_request" ? "normal" : "high",
        status: "pending",
        dueAt: typeof row.created_at === "string" ? row.created_at : null,
        actorName: null,
        actionHref: link,
        isOverdue: false,
      })
    }

    const upcomingShifts = shifts.slice(0, 8).map((row) => ({
      id: String(row.id),
      shiftDate: String(row.shift_date),
      startTime: typeof row.start_time === "string" ? row.start_time : null,
      endTime: typeof row.end_time === "string" ? row.end_time : null,
      role: typeof row.role_assignment === "string" ? row.role_assignment : null,
      zone: typeof row.zone_assignment === "string" ? row.zone_assignment : null,
      status: String(row.status ?? "scheduled"),
      isOpen: !row.staff_member_id || row.status === "open",
    }))
    const openAssignmentCount = assignments.filter((row) => {
      const status = typeof row.status === "string" ? row.status.toLowerCase() : ""
      return status === "open" || status === "offered"
    }).length
    const openShifts = upcomingShifts.filter((shift) => shift.isOpen).length + openAssignmentCount
    const active = members.filter((row) => row.status === "active").length
    const onLeave = members.filter((row) => row.status === "on_leave").length
    const pending = members.filter((row) => row.status === "pending").length

    const response: StaffOperationsSummary = {
      metrics: {
        activeStaff: active,
        shiftsNextSevenDays: shifts.length,
        openShifts,
        pendingRequests: assignments.length - openAssignmentCount,
        unreadUpdates: notificationsResult.count ?? 0,
        openConflicts: conflicts.length,
      },
      topTasks: rankStaffOperationsTasks(tasks, now).slice(0, 12),
      upcomingShifts,
      coverage: { filledShifts: Math.max(0, shifts.length - openShifts), openShifts, openConflicts: conflicts.length },
      team: { active, onLeave, pending },
      freshAt: now.toISOString(),
      unavailableSources: Array.from(new Set(unavailableSources)),
    }
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } })
  },
)
