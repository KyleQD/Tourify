import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"
import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
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
      "id, role_title, department, event_id, venue_id, organizer_id, starts_at, ends_at, status, permissions",
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_ASSIGNMENT_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error("[work-mode] assignment read failed", assignmentError.message)
    throw new WorkModeReadError()
  }

  const assignments: WorkModeAssignmentListItem[] = (assignmentRows ?? []).map((row) => ({
    id: row.id,
    roleTitle: row.role_title,
    department: row.department,
    eventId: row.event_id,
    venueId: row.venue_id,
    organizerId: row.organizer_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as EmploymentAssignmentStatus,
    permissions: asPermissions(row.permissions),
    source: "assignment",
    publicationType: null,
    href: null,
    siteMapId: null,
  }))

  const publicationEventIds = Array.from(
    new Set(
      assignments
        .filter((assignment) => assignment.status === "confirmed" || assignment.status === "active")
        .map((assignment) => assignment.eventId)
        .filter((eventId): eventId is string => Boolean(eventId)),
    ),
  )

  let publications: WorkModePublication[] = []
  if (publicationEventIds.length > 0) {
    const { data: publicationRows, error: publicationError } = await supabase
      .from("work_mode_publications")
      .select("id, event_id, tour_id, site_map_id, publication_type, title, payload, published_at")
      .in("event_id", publicationEventIds)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100)

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

  return {
    assignments,
    publications,
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
