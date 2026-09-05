import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"

const ACTIVE_WORK_STATUSES: EmploymentAssignmentStatus[] = [
  "invited",
  "confirmed",
  "active",
]

function asBooleanPermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  )
}

export class WorkModeReadError extends Error {
  readonly code = "unavailable"

  constructor(message = "Work Mode is temporarily unavailable.") {
    super(message)
    this.name = "WorkModeReadError"
  }
}

/**
 * Build the worker-facing Work Mode read model from relationships the server has
 * explicitly scoped to the authenticated user. `employment_assignments` is the
 * authorization anchor. Shift and publication data may enrich those assignments,
 * but they never independently grant Work access.
 */
export async function getWorkModeAssignments(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<WorkModeAssignmentsPayload> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("employment_assignments")
    .select(
      "id, role_title, department, event_id, venue_id, organizer_id, staff_shift_id, tour_id, starts_at, ends_at, status, permissions",
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_WORK_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error("[work-mode] assignment read failed", assignmentError.message)
    throw new WorkModeReadError()
  }

  const rows = assignmentRows ?? []
  const shiftIds = Array.from(
    new Set(
      rows
        .map((row: any) => row.staff_shift_id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
    ),
  )

  const { data: shiftRows, error: shiftError } = shiftIds.length
    ? await supabase
        .from("staff_shifts")
        .select("id, event_id")
        .in("id", shiftIds)
        .is("deleted_at", null)
    : { data: [], error: null }

  if (shiftError) {
    console.warn("[work-mode] shift enrichment unavailable", shiftError.message)
  }

  const shiftEventIds = new Map<string, string | null>()
  for (const shift of shiftRows ?? []) {
    shiftEventIds.set(shift.id, shift.event_id ?? null)
  }

  const assignments: WorkModeAssignmentListItem[] = rows.map((row: any) => ({
    id: row.id,
    role_title: row.role_title,
    department: row.department ?? null,
    event_id:
      (row.staff_shift_id ? shiftEventIds.get(row.staff_shift_id) : null) ??
      row.event_id ??
      null,
    venue_id: row.venue_id ?? null,
    organizer_id: row.organizer_id ?? null,
    staff_shift_id: row.staff_shift_id ?? null,
    tour_id: row.tour_id ?? null,
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    status: row.status as EmploymentAssignmentStatus,
    permissions: asBooleanPermissions(row.permissions),
    source: "assignment",
    publication_type: null,
    href: null,
    site_map_id: null,
  }))

  const authorizedEventIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.event_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  )

  let publications: WorkModePublication[] = []
  if (authorizedEventIds.length > 0) {
    const { data: publicationRows, error: publicationError } = await supabase
      .from("work_mode_publications")
      .select("id, event_id, publication_type, title, payload, published_at")
      .in("event_id", authorizedEventIds)
      .order("published_at", { ascending: false })
      .limit(50)

    if (publicationError) {
      console.warn("[work-mode] publication enrichment unavailable", publicationError.message)
    } else {
      publications = (publicationRows ?? []).map((row: any) => ({
        id: row.id,
        event_id: row.event_id ?? null,
        publication_type: row.publication_type,
        title: row.title,
        payload:
          row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
            ? row.payload
            : null,
        published_at: row.published_at ?? null,
      }))
    }
  }

  return {
    assignments,
    publications,
    generatedAt: new Date().toISOString(),
  }
}
