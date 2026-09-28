import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { adminAccessErrorResponse, assertAdminEventAccess } from "@/lib/admin/admin-tour-event-access"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"

const uuid = z.string().uuid()

function eventIdFromUrl(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminCapability("workforce.view", async (request: NextRequest, { supabase, user, admin }) => {
  if (process.env.FEATURE_WORK_MODE_WORKER_ACTIONS !== "1") {
    return NextResponse.json({ error: "Worker attendance is not enabled.", code: "unavailable" }, { status: 503 })
  }
  const eventId = eventIdFromUrl(request.url)
  if (!eventId || !uuid.safeParse(eventId).success) {
    return NextResponse.json({ error: "A valid event ID is required.", code: "validation" }, { status: 422 })
  }

  try {
    await assertAdminEventAccess({ supabase, userId: user.id, eventId, orgId: admin.orgId })
  } catch (error) {
    const denied = adminAccessErrorResponse(error, "Event not found.", 404)
    return NextResponse.json({ error: denied.message, code: "not_found" }, { status: denied.status })
  }

  try {
    const events = await executeServiceRoleJob(
      {
        orgId: admin.orgId,
        reason: "Read authorized event worker attendance evidence",
        moduleId: "admin.workforce.attendance",
        target: { eventId },
      },
      async (service) => {
        // The active database types do not include the archived worker-action table.
        const db = service as typeof service & { from(table: "work_mode_check_in_events"): any }
        const { data, error } = await db
          .from("work_mode_check_in_events")
          .select("id, assignment_id, user_id, action, occurred_at")
          .eq("event_id", eventId)
          .order("occurred_at", { ascending: false })
          .limit(100)
        if (error) throw error

        const rows = (data ?? []) as Array<{
          id: string
          assignment_id: string
          user_id: string
          action: "check_in" | "check_out"
          occurred_at: string
        }>
        const assignmentIds = Array.from(new Set(rows.map((row) => row.assignment_id)))
        const workerIds = Array.from(new Set(rows.map((row) => row.user_id)))
        const { data: assignments, error: assignmentError } = assignmentIds.length
          ? await service.from("employment_assignments")
              .select("id, role_title")
              .in("id", assignmentIds)
          : { data: [], error: null }
        if (assignmentError) throw assignmentError
        const roles = new Map((assignments ?? []).map((assignment) => [assignment.id, assignment.role_title]))
        const { data: profiles, error: profileError } = workerIds.length
          ? await service.from("profiles")
              .select("id, full_name")
              .in("id", workerIds)
          : { data: [], error: null }
        if (profileError) throw profileError
        const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))

        return rows.map((row) => ({
          id: row.id,
          assignmentId: row.assignment_id,
          workerId: row.user_id,
          workerName: names.get(row.user_id) || "Worker",
          roleTitle: roles.get(row.assignment_id) ?? "Worker",
          action: row.action,
          occurredAt: row.occurred_at,
        }))
      },
    )
    return NextResponse.json({ data: events }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[admin/work-mode/attendance] read failed", error)
    return NextResponse.json({ error: "Worker attendance is temporarily unavailable.", code: "unavailable" }, { status: 503 })
  }
})
