import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"
import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
  WorkModeTaskItem,
} from "@/types/hiring-roster-work-mode"

const ACTIVE_ASSIGNMENT_STATUSES: EmploymentAssignmentStatus[] = [
  "invited",
  "confirmed",
  "active",
]

function asRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asPermissions(value: Json): Record<string, boolean> {
  const record = asRecord(value)
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  )
}

function publicationHref(
  payload: Record<string, unknown>,
  siteMapId: string | null,
): string | null {
  if (typeof payload.worker_url === "string" && payload.worker_url.startsWith("/")) {
    return payload.worker_url
  }
  if (typeof payload.url === "string" && payload.url.startsWith("/")) {
    return payload.url
  }
  return siteMapId ? `/work/site-maps/${siteMapId}` : null
}

export class WorkModeReadError extends Error {
  readonly code = "unavailable"

  constructor(message = "Work Mode is temporarily unavailable.") {
    super(message)
    this.name = "WorkModeReadError"
  }
}

export async function getWorkModeAssignments(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WorkModeAssignmentsPayload> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("employment_assignments")
    .select(
      "id, role_title, department, event_id, tour_id, staff_shift_id, venue_id, organizer_id, starts_at, ends_at, status, permissions",
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_ASSIGNMENT_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error("[work-mode] assignment read failed", assignmentError.message)
    throw new WorkModeReadError()
  }

  const shiftIds = Array.from(new Set((assignmentRows ?? [])
    .map((row) => row.staff_shift_id)
    .filter((id): id is string => Boolean(id))))
  const shiftById = new Map<string, {
    event_id: string | null
    shift_date: string
    start_time: string
    end_time: string
  }>()
  if (shiftIds.length > 0) {
    const { data: shiftRows, error: shiftError } = await supabase
      .from("staff_shifts")
      .select("id, event_id, shift_date, start_time, end_time")
      .in("id", shiftIds)
    if (shiftError) {
      console.warn("[work-mode] shift context read failed", shiftError.message)
    } else {
      for (const shift of shiftRows ?? []) shiftById.set(shift.id, shift)
    }
  }

  const assignments: WorkModeAssignmentListItem[] = (assignmentRows ?? []).map((row) => {
    const shift = row.staff_shift_id ? shiftById.get(row.staff_shift_id) : undefined
    const derivedEventId = row.event_id || shift?.event_id || null
    return {
      id: row.id,
      roleTitle: row.role_title,
      department: row.department,
      eventId: derivedEventId,
      tourId: row.tour_id,
      staffShiftId: row.staff_shift_id,
      eventContextSource: row.event_id ? "assignment" : shift?.event_id ? "shift" : null,
      venueId: row.venue_id,
      organizerId: row.organizer_id,
      startsAt: row.starts_at || (shift ? `${shift.shift_date}T${shift.start_time}` : null),
      endsAt: row.ends_at || (shift ? `${shift.shift_date}T${shift.end_time}` : null),
      status: row.status as EmploymentAssignmentStatus,
      permissions: asPermissions(row.permissions),
      source: "assignment",
      publicationType: null,
      href: null,
      siteMapId: null,
    }
  })

  const publicationEventIds = Array.from(
    new Set(
      assignments
        .filter((assignment) => assignment.status === "confirmed" || assignment.status === "active")
        .map((assignment) => assignment.eventId)
        .filter((eventId): eventId is string => Boolean(eventId)),
    ),
  )
  const publicationTourIds = Array.from(
    new Set(
      assignments
        .filter((assignment) => assignment.status === "confirmed" || assignment.status === "active")
        .map((assignment) => assignment.tourId)
        .filter((tourId): tourId is string => Boolean(tourId)),
    ),
  )

  let publications: WorkModePublication[] = []
  if (publicationEventIds.length > 0 || publicationTourIds.length > 0) {
    const scopeFilters = [
      publicationEventIds.length ? `event_id.in.(${publicationEventIds.join(",")})` : null,
      publicationTourIds.length ? `tour_id.in.(${publicationTourIds.join(",")})` : null,
    ].filter((value): value is string => Boolean(value))
    const publicationQuery = supabase
      .from("work_mode_publications")
      .select("id, event_id, tour_id, site_map_id, publication_type, title, payload, published_at")
      .or(scopeFilters.join(","))
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100)
    const { data: publicationRows, error: publicationError } = await publicationQuery

    if (publicationError) {
      console.error("[work-mode] publication read failed", publicationError.message)
      throw new WorkModeReadError("Assignments loaded, but published work packets are unavailable.")
    }

    publications = (publicationRows ?? []).map((row) => {
      const payload = asRecord(row.payload)
      return {
        id: row.id,
        eventId: row.event_id,
        tourId: row.tour_id,
        siteMapId: row.site_map_id,
        publicationType: row.publication_type,
        title: row.title,
        payload,
        publishedAt: row.published_at,
        href: publicationHref(payload, row.site_map_id),
      }
    })
  }

  const [{ data: taskRows, error: taskError }, { data: notificationRows, error: notificationError }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, event_id, title, status, due_date, priority")
      .eq("assigned_to", userId)
      .limit(100),
    supabase
      .from("notifications")
      .select("id, title, type, metadata, is_read, created_at")
      .eq("user_id", userId)
      .eq("type", "hiring_onboarding_invite")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(20),
  ])
  if (taskError) console.warn("[work-mode] operational task read failed", taskError.message)
  if (notificationError) console.warn("[work-mode] onboarding task read failed", notificationError.message)

  const candidateIds = Array.from(new Set((notificationRows ?? []).map((row) => {
    const candidateId = asRecord(row.metadata).candidate_id
    return typeof candidateId === "string" ? candidateId : null
  }).filter((id): id is string => Boolean(id))))
  const completedCandidateIds = new Set<string>()
  if (candidateIds.length > 0) {
    const { data: candidates } = await supabase
      .from("staff_onboarding_candidates")
      .select("id, status, stage, onboarding_progress")
      .in("id", candidateIds)
    for (const candidate of candidates ?? []) {
      if (["submitted", "completed", "approved"].includes(candidate.status || "")
        || candidate.stage === "approved"
        || Number(candidate.onboarding_progress || 0) >= 100) {
        completedCandidateIds.add(candidate.id)
      }
    }
  }
  const onboardingTasks: WorkModeTaskItem[] = (notificationRows ?? []).flatMap((row) => {
    const metadata = asRecord(row.metadata)
    const candidateId = typeof metadata.candidate_id === "string" ? metadata.candidate_id : null
    if (candidateId && completedCandidateIds.has(candidateId)) return []
    return [{
      id: `onboarding:${row.id}`,
      eventId: null,
      title: row.title || "Complete onboarding",
      status: row.is_read ? "viewed" : "action_required",
      dueDate: null,
      priority: "high",
      actionUrl: typeof metadata.onboarding_url === "string" ? metadata.onboarding_url : null,
      kind: "onboarding",
    }]
  })
  const operationalTasks: WorkModeTaskItem[] = (taskRows ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    title: row.title || "Task",
    status: row.status,
    dueDate: row.due_date,
    priority: row.priority,
    actionUrl: null,
    kind: "operational",
  }))

  return {
    assignments,
    publications,
    tasks: [...onboardingTasks, ...operationalTasks],
    generatedAt: new Date().toISOString(),
    workerActionsAvailable: process.env.FEATURE_WORK_MODE_WORKER_ACTIONS === "1",
  }
}

export function findWorkModeAssignment(
  payload: WorkModeAssignmentsPayload,
  assignmentId: string,
): WorkModeAssignmentListItem | null {
  return payload.assignments.find((assignment) => assignment.id === assignmentId) ?? null
}
