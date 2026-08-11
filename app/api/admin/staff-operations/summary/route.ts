import { NextResponse } from "next/server"

import { rankStaffOperationsTasks } from "@/lib/admin/staff-operations-ranking"
import { withAdminCapability } from "@/lib/auth/api-auth"
import type { StaffOperationsPriority, StaffOperationsSummary, StaffOperationsTask } from "@/types/staff-operations"

const DAY_MS = 86_400_000

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

export const GET = withAdminCapability(
  "workforce.view",
  async (_request, { supabase, admin, user }) => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const through = new Date(now.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)
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

    const shiftsResult = staffIds.length
      ? await supabase
          .from("staff_shifts")
          .select("id, staff_member_id, shift_date, start_time, end_time, role_assignment, zone_assignment, status")
          .in("staff_member_id", staffIds)
          .is("deleted_at", null)
          .gte("shift_date", today)
          .lte("shift_date", through)
          .neq("status", "cancelled")
          .order("shift_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(200)
      : { data: [], error: null }
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

    const conflictsResult = await supabase
      .from("assignment_conflicts")
      .select("id, conflict_type, severity, description, status, created_at, shift_id")
      .eq("org_id", admin.orgId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100)
    if (conflictsResult.error) unavailableSources.push("conflicts")
    const conflicts = (conflictsResult.data ?? []) as Array<Record<string, unknown>>

    const assignmentsResult = await supabase
      .from("work_assignments")
      .select("*")
      .eq("org_id", admin.orgId)
      .in("status", ["offered", "open", "pending"])
      .limit(100)
    if (assignmentsResult.error) unavailableSources.push("assignment responses")
    const assignments = (assignmentsResult.data ?? []) as Array<Record<string, unknown>>

    const credentialsResult = await supabase
      .from("worker_credentials")
      .select("id, credential_type, expires_at, status, person_id")
      .eq("org_id", admin.orgId)
      .eq("status", "active")
      .lte("expires_at", new Date(now.getTime() + 30 * DAY_MS).toISOString())
      .order("expires_at", { ascending: true })
      .limit(50)
    if (credentialsResult.error) unavailableSources.push("credentials")
    const credentials = (credentialsResult.data ?? []) as Array<Record<string, unknown>>

    const accountResult = await supabase
      .from("organizer_accounts")
      .select("user_id")
      .eq("id", admin.profileId)
      .maybeSingle()
    const ownerUserId = accountResult.data?.user_id as string | undefined
    let logistics: Array<Record<string, unknown>> = []
    let eventTasks: Array<Record<string, unknown>> = []
    const canViewEventTasks = admin.capabilities.includes("event.view") || admin.capabilities.includes("logistics.view")
    if (ownerUserId && canViewEventTasks) {
      const eventsResult = await supabase.from("events").select("id").eq("user_id", ownerUserId).limit(500)
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
              .select("id, context_id")
              .eq("context_type", "event")
              .in("context_id", eventIds)
              .limit(500)
          : Promise.resolve({ data: [], error: null })
        const [logisticsResult, threadsResult] = await Promise.all([
          logisticsPromise,
          threadsPromise,
        ])
        if (logisticsResult.error) unavailableSources.push("event tasks")
        logistics = (logisticsResult.data ?? []) as Array<Record<string, unknown>>
        if (threadsResult.error) unavailableSources.push("workflow tasks")
        const threadEvent = new Map((threadsResult.data ?? []).map((row: { id: string; context_id: string }) => [row.id, row.context_id]))
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
    for (const row of conflicts) {
      const severity = priority(row.severity)
      tasks.push({
        id: `conflict:${String(row.id)}`,
        source: "scheduling",
        kind: String(row.conflict_type ?? "scheduling_conflict"),
        title: severity === "critical" ? "Critical scheduling conflict" : "Scheduling conflict",
        description: typeof row.description === "string" ? row.description : null,
        priority: severity,
        status: "open",
        dueAt: typeof row.created_at === "string" ? row.created_at : null,
        actorName: null,
        actionHref: "/admin/dashboard/staff?tab=scheduling",
        isOverdue: severity === "critical",
      })
    }
    for (const row of assignments) {
      const isCoverageGap = row.status === "open"
      const dueAt = typeof row.response_deadline === "string"
        ? row.response_deadline
        : typeof row.starts_at === "string" ? row.starts_at : typeof row.shift_date === "string" ? row.shift_date : null
      const role = String(row.role_name ?? row.role_title ?? "shift")
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
      const dueAt = typeof row.expires_at === "string" ? row.expires_at : null
      tasks.push({
        id: `credential:${String(row.id)}`,
        source: "credential",
        kind: "credential_expiry",
        title: `${String(row.credential_type ?? "Credential")} expires soon`,
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
      isOpen: !row.staff_member_id,
    }))
    const openAssignmentCount = assignments.filter((row) => row.status === "open").length
    const openShifts = upcomingShifts.filter((shift) => shift.isOpen).length + openAssignmentCount
    const active = members.filter((row) => row.status === "active").length
    const onLeave = members.filter((row) => row.status === "on_leave").length
    const pending = members.filter((row) => row.status === "pending").length

    const response: StaffOperationsSummary = {
      metrics: {
        activeStaff: active,
        shiftsNextSevenDays: shifts.length,
        openShifts,
        pendingRequests: assignments.filter((row) => row.status !== "open").length,
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
