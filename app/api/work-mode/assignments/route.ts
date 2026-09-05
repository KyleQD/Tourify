import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"

const ACTIVE_ASSIGNMENT_STATUSES = ["invited", "confirmed", "active"] as const

type QueryClient = {
  from(table: string): any
}

function asBooleanPermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  )
}

function publicationAssignment(publication: WorkModePublication): WorkModeAssignmentListItem {
  const payload =
    publication.payload && typeof publication.payload === "object" && !Array.isArray(publication.payload)
      ? publication.payload
      : {}
  const siteMapId = typeof payload.site_map_id === "string" ? payload.site_map_id : null
  const workerUrl =
    (typeof payload.worker_url === "string" && payload.worker_url.startsWith("/")
      ? payload.worker_url
      : null) ||
    (typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : null) ||
    (siteMapId ? `/work/site-maps/${siteMapId}` : null)

  return {
    id: `pub:${publication.id}`,
    role_title: publication.title || "Published work package",
    department: publication.publication_type,
    event_id: publication.event_id,
    status: "confirmed",
    permissions: {},
    source: "publication",
    publication_type: publication.publication_type,
    starts_at: publication.published_at ?? null,
    href: workerUrl,
    site_map_id: siteMapId,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: "Sign in to view Work Mode.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  const queryClient = supabase as unknown as QueryClient

  try {
    const { data: assignmentRows, error: assignmentError } = await queryClient
      .from("employment_assignments")
      .select(
        "id, role_title, department, event_id, venue_id, organizer_id, starts_at, ends_at, status, permissions",
      )
      .eq("user_id", user.id)
      .in("status", ACTIVE_ASSIGNMENT_STATUSES)
      .order("starts_at", { ascending: true, nullsFirst: false })

    if (assignmentError) {
      console.error("[work-mode] assignment read failed", assignmentError.message)
      return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
        { error: "Work Mode is temporarily unavailable.", code: "unavailable" },
        { status: 503 },
      )
    }

    const assignments: WorkModeAssignmentListItem[] = (assignmentRows ?? []).map((row: any) => ({
      id: row.id,
      role_title: row.role_title,
      department: row.department ?? null,
      event_id: row.event_id ?? null,
      venue_id: row.venue_id ?? null,
      organizer_id: row.organizer_id ?? null,
      starts_at: row.starts_at ?? null,
      ends_at: row.ends_at ?? null,
      status: row.status,
      permissions: asBooleanPermissions(row.permissions),
      source: "assignment",
      publication_type: null,
      href: null,
      site_map_id: null,
    }))

    const eventIds = new Set<string>()
    for (const assignment of assignments) {
      if (assignment.event_id) eventIds.add(assignment.event_id)
    }

    // Preserve the existing shift-derived event visibility without relying on the
    // stale event_participants table. This read is scoped to the authenticated
    // worker through the staff_members relationship and is optional enrichment.
    const { data: shiftRows, error: shiftError } = await queryClient
      .from("staff_shifts")
      .select("event_id, staff_members!inner(user_id)")
      .eq("staff_members.user_id", user.id)
      .limit(100)

    if (shiftError) {
      console.warn("[work-mode] shift event scope unavailable", shiftError.message)
    } else {
      for (const row of shiftRows ?? []) {
        if (typeof row.event_id === "string") eventIds.add(row.event_id)
      }
    }

    let publications: WorkModePublication[] = []
    if (eventIds.size > 0) {
      const { data: publicationRows, error: publicationError } = await queryClient
        .from("work_mode_publications")
        .select("id, event_id, publication_type, title, payload, published_at")
        .in("event_id", Array.from(eventIds))
        .order("published_at", { ascending: false })
        .limit(50)

      if (publicationError) {
        console.warn("[work-mode] publication read unavailable", publicationError.message)
      } else {
        publications = (publicationRows ?? []) as WorkModePublication[]
      }
    }

    const assignedEventIds = new Set(
      assignments.map((assignment) => assignment.event_id).filter((eventId): eventId is string => Boolean(eventId)),
    )
    const publicationAssignments = publications
      .filter((publication) => publication.event_id && !assignedEventIds.has(publication.event_id))
      .map(publicationAssignment)

    const data: WorkModeAssignmentsPayload = {
      assignments: [...assignments, ...publicationAssignments],
      publications,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    console.error("[work-mode] unexpected assignment read failure", error)
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: "Work Mode is temporarily unavailable.", code: "unavailable" },
      { status: 503 },
    )
  }
}
