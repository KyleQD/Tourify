import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"
import { resolveHiringEntityDisplayName } from "@/lib/auth/hiring-entity-resolver"
import type { HiringEntityType } from "@/types/hiring-entity"
import type {
  EmploymentAssignmentStatus,
  WorkerAssignmentAttendance,
  WorkerAssignmentSchedule,
  WorkerSharedShiftPlan,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode"

const WORK_HUB_ASSIGNMENT_STATUSES: EmploymentAssignmentStatus[] = [
  "invited",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "declined",
]

type ActionReadClient = { from(table: string): any }

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
  publicationId: string,
  payload: Record<string, unknown>,
  siteMapId: string | null,
): string | null {
  if (typeof payload.worker_url === "string" && payload.worker_url.startsWith("/")) {
    return payload.worker_url
  }
  if (typeof payload.url === "string" && payload.url.startsWith("/")) {
    return payload.url
  }
  return siteMapId ? `/work/site-maps/${siteMapId}` : `/work/publications/${publicationId}`
}

function publicationVersion(payload: Record<string, unknown>): number {
  const version = payload.version
  return typeof version === "number" && Number.isInteger(version) && version > 0 ? version : 1
}

function requiresAcknowledgement(payload: Record<string, unknown>): boolean {
  return payload.requires_acknowledgement === true || payload.requiresAcknowledgement === true
}

function defaultAttendance(): WorkerAssignmentAttendance {
  return { state: "not_checked_in", checkedInAt: null, checkedOutAt: null }
}

function planAttachments(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : []
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
  const actionClient = supabase as unknown as ActionReadClient
  const { data: assignmentRows, error: assignmentError } = await actionClient
    .from("employment_assignments")
    .select(
      "id, role_title, department, event_id, venue_id, organizer_id, staff_member_id, staff_shift_id, job_application_id, job_posting_id, tour_id, assignment_kind, employer_entity_type, employer_entity_id, starts_at, ends_at, status, permissions",
    )
    .eq("user_id", userId)
    .in("status", WORK_HUB_ASSIGNMENT_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error("[work-mode] assignment read failed", assignmentError.message)
    throw new WorkModeReadError()
  }
  const rows = (assignmentRows ?? []) as any[]

  const assignmentEventIds = Array.from(
    new Set<string>(
      rows
        .map((row: any) => row.event_id)
        .filter((eventId: unknown): eventId is string => typeof eventId === "string"),
    ),
  )
  const venueIds = Array.from(
    new Set<string>(
      rows
        .map((row: any) => row.venue_id)
        .filter((venueId: unknown): venueId is string => typeof venueId === "string"),
    ),
  )

  const shiftIds = Array.from(
    new Set<string>(
      rows
        .map((row: any) => row.staff_shift_id)
        .filter((shiftId: unknown): shiftId is string => typeof shiftId === "string"),
    ),
  )
  const staffMemberIds = Array.from(
    new Set(
      rows
        .map((row: any) => row.staff_member_id)
        .filter((memberId: unknown): memberId is string => typeof memberId === "string"),
    ),
  )
  const { data: shiftRows, error: shiftError } = shiftIds.length
    ? await actionClient
        .from("staff_shifts")
        .select(
          "id, event_id, staff_shift_plan_id, shift_date, start_time, end_time, break_duration, zone_assignment, role_assignment, notes, status",
        )
        .in("id", shiftIds)
        .is("deleted_at", null)
    : { data: [], error: null }

  if (shiftError) {
    console.error("[work-mode] shift read failed", shiftError.message)
    throw new WorkModeReadError("Assignments loaded, but schedules are unavailable.")
  }

  const schedulesById = new Map<string, WorkerAssignmentSchedule>()
  const shiftRowsById = new Map<string, any>()
  for (const shift of (shiftRows ?? []) as any[]) {
    shiftRowsById.set(shift.id, shift)
    schedulesById.set(shift.id, {
      shiftId: shift.id,
      eventId: shift.event_id,
      date: shift.shift_date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      breakDurationMinutes: shift.break_duration ?? 0,
      zone: shift.zone_assignment,
      role: shift.role_assignment,
      notes: shift.notes,
      status: shift.status,
    })
  }

  const shiftPlanIds = Array.from(new Set<string>(
    ((shiftRows ?? []) as any[])
      .map((shift: any) => shift.staff_shift_plan_id)
      .filter((planId: unknown): planId is string => typeof planId === "string"),
  ))
  const shiftPlansResponse = shiftPlanIds.length
    ? await actionClient
        .from("staff_shift_plans")
        .select("id,title,role,department,shift_type,priority,required_headcount,starts_at,ends_at,timezone,break_duration_minutes,break_requirements,location_type,reporting_name,reporting_address,directions,access_instructions,worker_instructions,supervisor_name,supervisor_contact,attire_ppe_credentials,hazards,emergency_procedure,emergency_contact,attachments,version")
        .in("id", shiftPlanIds)
    : { data: [], error: null }
  if (shiftPlansResponse.error) {
    console.warn("[work-mode] shared shift details unavailable", shiftPlansResponse.error.message)
  }
  const sharedPlansById = new Map<string, WorkerSharedShiftPlan>()
  for (const plan of (shiftPlansResponse.data ?? []) as any[]) {
    sharedPlansById.set(plan.id, {
      id: plan.id,
      title: plan.title,
      role: plan.role ?? null,
      department: plan.department ?? null,
      shiftType: plan.shift_type,
      priority: plan.priority,
      requiredHeadcount: plan.required_headcount,
      startsAt: plan.starts_at ?? null,
      endsAt: plan.ends_at ?? null,
      timezone: plan.timezone,
      breakDurationMinutes: plan.break_duration_minutes ?? 0,
      breakRequirements: plan.break_requirements ?? null,
      locationType: plan.location_type,
      reportingName: plan.reporting_name ?? null,
      reportingAddress: plan.reporting_address ?? null,
      directions: plan.directions ?? null,
      accessInstructions: plan.access_instructions ?? null,
      workerInstructions: plan.worker_instructions ?? null,
      supervisorName: plan.supervisor_name ?? null,
      supervisorContact: plan.supervisor_contact ?? null,
      attirePpeCredentials: plan.attire_ppe_credentials ?? null,
      hazards: plan.hazards ?? null,
      emergencyProcedure: plan.emergency_procedure ?? null,
      emergencyContact: plan.emergency_contact ?? null,
      attachments: planAttachments(plan.attachments),
      version: plan.version ?? 1,
    })
  }

  const eventIds = Array.from(
    new Set<string>([
      ...assignmentEventIds,
      ...((shiftRows ?? []) as any[])
        .map((shift: any) => shift.event_id)
        .filter((eventId: unknown): eventId is string => typeof eventId === "string"),
    ]),
  )

  const [eventsV2Response, eventsResponse, venuesResponse, venuesV2Response] = await Promise.all([
    eventIds.length
      ? actionClient
          .from("events_v2")
          .select("id, title, venue_id, timezone")
          .in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? actionClient
          .from("events")
          .select("id, title, venue_name, location")
          .in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? actionClient.from("venues").select("id, name, city, state").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? actionClient.from("venues_v2").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const venueLabels = new Map<string, string>()
  for (const venue of (venuesResponse.data ?? []) as any[]) {
    venueLabels.set(
      venue.id,
      [venue.name, venue.city, venue.state].filter(Boolean).join(" · ") || venue.name || "Venue",
    )
  }
  for (const venue of (venuesV2Response.data ?? []) as any[]) {
    venueLabels.set(venue.id, venue.name || "Venue")
  }
  const eventLabels = new Map<
    string,
    { title: string | null; venueLabel: string | null; timezone: string | null }
  >()
  for (const event of (eventsResponse.data ?? []) as any[]) {
    eventLabels.set(event.id, {
      title: event.title ?? null,
      venueLabel: event.venue_name || event.location || null,
      timezone: null,
    })
  }
  for (const event of (eventsV2Response.data ?? []) as any[]) {
    eventLabels.set(event.id, {
      title: event.title ?? null,
      venueLabel: event.venue_id ? venueLabels.get(event.venue_id) ?? null : null,
      timezone: event.timezone ?? null,
    })
  }
  const employerKeys = Array.from(
    new Set<string>(
      rows
        .filter((row: any) => row.employer_entity_type && row.employer_entity_id)
        .map((row: any) => `${row.employer_entity_type}:${row.employer_entity_id}`),
    ),
  )
  const employerLabels = new Map<string, string>()
  await Promise.all(
    employerKeys.map(async (key) => {
      const separator = key.indexOf(":")
      const entityType = key.slice(0, separator) as HiringEntityType
      const entityId = key.slice(separator + 1)
      const label = await resolveHiringEntityDisplayName({
        supabase,
        entityType,
        entityId,
      })
      employerLabels.set(key, label)
    }),
  )

  const channelResponse = staffMemberIds.length
    ? await actionClient
        .from("workforce_channel_links")
        .select("staff_member_id, coordinator_thread_id")
        .in("staff_member_id", staffMemberIds)
        .eq("channel_kind", "coordinator")
    : { data: [], error: null }
  const channelByMember = new Map<string, string>()
  for (const link of channelResponse.data ?? []) {
    channelByMember.set(link.staff_member_id, link.coordinator_thread_id)
  }

  const assignments: WorkModeAssignmentListItem[] = rows.map((row: any) => {
    const schedule = row.staff_shift_id ? schedulesById.get(row.staff_shift_id) ?? null : null
    const shiftRow = row.staff_shift_id ? shiftRowsById.get(row.staff_shift_id) : null
    const sharedShiftPlan = shiftRow?.staff_shift_plan_id
      ? sharedPlansById.get(shiftRow.staff_shift_plan_id) ?? null
      : null
    const effectiveEventId = schedule?.eventId ?? row.event_id
    const event = effectiveEventId ? eventLabels.get(effectiveEventId) : null
    return {
      id: row.id,
      roleTitle: sharedShiftPlan?.role || row.role_title,
      department: sharedShiftPlan?.department || row.department,
      staffMemberId: row.staff_member_id,
      staffShiftId: row.staff_shift_id,
      jobApplicationId: row.job_application_id,
      jobPostingId: row.job_posting_id,
      tourId: row.tour_id,
      assignmentKind: row.assignment_kind,
      employerEntityType: row.employer_entity_type,
      employerEntityId: row.employer_entity_id,
      employerName:
        row.employer_entity_type && row.employer_entity_id
          ? employerLabels.get(`${row.employer_entity_type}:${row.employer_entity_id}`) ?? null
          : null,
      coordinatorChannel:
        row.staff_member_id && channelByMember.has(row.staff_member_id)
          ? {
              threadId: channelByMember.get(row.staff_member_id) as string,
              href: `/groups/${channelByMember.get(row.staff_member_id)}`,
            }
          : null,
      eventId: effectiveEventId,
      venueId: row.venue_id,
      organizerId: row.organizer_id,
      eventTitle: event?.title ?? null,
      venueLabel: sharedShiftPlan
        ? [sharedShiftPlan.reportingName, sharedShiftPlan.reportingAddress].filter(Boolean).join(" · ") || null
        : event?.venueLabel ?? (row.venue_id ? venueLabels.get(row.venue_id) ?? null : null),
      timezone: sharedShiftPlan?.timezone ?? event?.timezone ?? null,
      organizerLabel: null,
      schedule,
      sharedShiftPlan,
      attendance: defaultAttendance(),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
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

  const attendanceResponse = assignments.length
    ? await actionClient
        .from("work_mode_check_in_events")
        .select("assignment_id, action, occurred_at")
        .eq("user_id", userId)
        .in("assignment_id", assignments.map((assignment) => assignment.id))
        .order("occurred_at", { ascending: true })
    : { data: [], error: null }

  // Attendance is an enhancement during rollout. A failed optional read must not make the
  // assignment itself disappear, but the worker will still see actions as unavailable.
  if (attendanceResponse.error) {
    console.warn("[work-mode] attendance read unavailable", attendanceResponse.error.message)
  }
  const attendanceByAssignment = new Map<string, WorkerAssignmentAttendance>()
  for (const event of attendanceResponse.data ?? []) {
    const current = attendanceByAssignment.get(event.assignment_id) ?? defaultAttendance()
    if (event.action === "check_in") {
      attendanceByAssignment.set(event.assignment_id, {
        state: "checked_in",
        checkedInAt: event.occurred_at,
        checkedOutAt: null,
      })
    } else if (event.action === "check_out" && current.checkedInAt) {
      attendanceByAssignment.set(event.assignment_id, {
        state: "checked_out",
        checkedInAt: current.checkedInAt,
        checkedOutAt: event.occurred_at,
      })
    }
  }
  for (const assignment of assignments) {
    assignment.attendance = attendanceByAssignment.get(assignment.id) ?? defaultAttendance()
  }

  let publications: WorkModePublication[] = []
  if (publicationEventIds.length > 0 || publicationTourIds.length > 0) {
    const publicationSelect =
      "id, event_id, tour_id, site_map_id, publication_type, title, payload, published_at, version, requires_acknowledgement"
    const [eventPublicationResponse, tourPublicationResponse] = await Promise.all([
      publicationEventIds.length
        ? actionClient
            .from("work_mode_publications")
            .select(publicationSelect)
            .in("event_id", publicationEventIds)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      publicationTourIds.length
        ? actionClient
            .from("work_mode_publications")
            .select(publicationSelect)
            .in("tour_id", publicationTourIds)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ])

    const publicationError = eventPublicationResponse.error || tourPublicationResponse.error
    if (publicationError) {
      console.error("[work-mode] publication read failed", publicationError.message)
      throw new WorkModeReadError("Assignments loaded, but published work packets are unavailable.")
    }
    const publicationRows = Array.from(
      new Map(
        [...(eventPublicationResponse.data ?? []), ...(tourPublicationResponse.data ?? [])].map(
          (row: any) => [row.id, row],
        ),
      ).values(),
    ).sort((left: any, right: any) =>
      String(right.published_at ?? "").localeCompare(String(left.published_at ?? "")),
    )

    const publicationIds = publicationRows.map((row: any) => row.id)
    const acknowledgementsResponse = await (
      publicationIds.length
        ? actionClient
            .from("work_mode_publication_acknowledgements")
            .select("publication_id, acknowledged_at")
            .eq("user_id", userId)
            .in("publication_id", publicationIds)
        : Promise.resolve({ data: [], error: null })
    )

    // Worker actions are optional during rollout. A missing or inaccessible table must not
    // hide schedules and packets from a worker.
    if (acknowledgementsResponse.error) {
      console.warn("[work-mode] acknowledgement read unavailable", acknowledgementsResponse.error.message)
    }
    const acknowledgements = new Map<string, string>()
    for (const acknowledgement of acknowledgementsResponse.data ?? []) {
      acknowledgements.set(acknowledgement.publication_id, acknowledgement.acknowledged_at)
    }
    publications = publicationRows.map((row: any) => {
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
        href: publicationHref(row.id, payload, row.site_map_id),
        version: row.version ?? publicationVersion(payload),
        requiresAcknowledgement: row.requires_acknowledgement ?? requiresAcknowledgement(payload),
        acknowledgedAt: acknowledgements.get(row.id) ?? null,
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
