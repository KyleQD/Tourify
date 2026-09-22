import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"
import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModeAttentionItem,
  WorkModeCommunication,
  WorkModeEventPayload,
  WorkModeEventSummary,
  WorkModeOverviewPayload,
  WorkModePublication,
  WorkModeReminder,
  WorkModeSourceAvailability,
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

function asPermissions(value: Json): Record<string, boolean | string> {
  const record = asRecord(value)
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, boolean | string] =>
        typeof entry[1] === "boolean" || typeof entry[1] === "string",
    ),
  )
}

function normalizedToken(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_")
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function sourceAvailability(
  overrides: Partial<WorkModeSourceAvailability> = {},
): WorkModeSourceAvailability {
  return {
    assignments: "available",
    events: "available",
    publications: "available",
    tasks: "available",
    communications: "available",
    reminders: "available",
    ...overrides,
  }
}

function priorityLevel(value: string | null | undefined): "normal" | "high" | "urgent" {
  const priority = normalizedToken(value)
  if (["urgent", "emergency"].includes(priority)) return "urgent"
  if (["high", "important"].includes(priority)) return "high"
  return "normal"
}

function canSeeAudience(
  visibleTo: string[] | null,
  assignments: WorkModeAssignmentListItem[],
  explicitlyTargeted = false,
): boolean {
  if (explicitlyTargeted) return true
  const audiences = (visibleTo || []).map(normalizedToken)
  if (audiences.length === 0 || audiences.some((value) => ["all", "assigned_workers", "staff", "crew"].includes(value))) {
    return true
  }
  const workerTokens = new Set(assignments.flatMap((assignment) => [
    normalizedToken(assignment.roleTitle),
    normalizedToken(assignment.department),
  ]).filter(Boolean))
  return audiences.some((audience) => workerTokens.has(audience))
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
  const availability = sourceAvailability()
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("employment_assignments")
    .select(
      "id, role_title, department, event_id, event_v2_id, tour_id, staff_shift_id, venue_id, organizer_id, starts_at, ends_at, status, permissions",
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
      availability.events = "unavailable"
    } else {
      for (const shift of shiftRows ?? []) shiftById.set(shift.id, shift)
    }
  }

  const assignments: WorkModeAssignmentListItem[] = (assignmentRows ?? []).map((row) => {
    const shift = row.staff_shift_id ? shiftById.get(row.staff_shift_id) : undefined
    const derivedEventId = row.event_v2_id || row.event_id || shift?.event_id || null
    return {
      id: row.id,
      roleTitle: row.role_title,
      department: row.department,
      eventId: derivedEventId,
      tourId: row.tour_id,
      staffShiftId: row.staff_shift_id,
      eventContextSource: row.event_v2_id || row.event_id ? "assignment" : shift?.event_id ? "shift" : null,
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
      .select("id, event_id, tour_id, site_map_id, publication_type, title, payload, visible_to, published_at")
      .or(scopeFilters.join(","))
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100)
    const { data: publicationRows, error: publicationError } = await publicationQuery

    if (publicationError) {
      console.error("[work-mode] publication read failed", publicationError.message)
      availability.publications = "unavailable"
    } else {
      const publicationIds = (publicationRows ?? []).map((row) => row.id)
      const targetedPublicationIds = new Set<string>()
      if (publicationIds.length > 0) {
        const { data: audienceRows, error: audienceError } = await supabase
          .from("work_mode_publication_audiences")
          .select("publication_id")
          .eq("worker_user_id", userId)
          .in("publication_id", publicationIds)
        if (!audienceError) {
          for (const row of audienceRows ?? []) targetedPublicationIds.add(row.publication_id)
        }
      }

      publications = (publicationRows ?? []).flatMap((row) => {
      const scopedAssignments = assignments.filter((assignment) =>
        (row.event_id && assignment.eventId === row.event_id)
        || (row.tour_id && assignment.tourId === row.tour_id))
      if (!canSeeAudience(row.visible_to, scopedAssignments, targetedPublicationIds.has(row.id))) return []
      const payload = asRecord(row.payload)
      const requiredPermission = asString(payload.required_permission)
      if (requiredPermission && !scopedAssignments.some((assignment) => assignment.permissions[requiredPermission] === true)) return []
      return [{
        id: row.id,
        eventId: row.event_id,
        tourId: row.tour_id,
        siteMapId: row.site_map_id,
        publicationType: row.publication_type,
        title: row.title,
        payload,
        visibleTo: row.visible_to || [],
        publishedAt: row.published_at,
        href: publicationHref(payload, row.site_map_id),
      }]
    })
    }
  }

  const [{ data: taskRows, error: taskError }, { data: notificationRows, error: notificationError }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, event_id, title, status, due_at, priority")
      .eq("assignee_id", userId)
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
  if (taskError || notificationError) availability.tasks = "unavailable"

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
    dueDate: row.due_at,
    priority: row.priority,
    actionUrl: null,
    kind: "operational",
  }))

  return {
    assignments,
    publications,
    tasks: [...onboardingTasks, ...operationalTasks],
    sourceAvailability: availability,
    generatedAt: new Date().toISOString(),
    workerActionsAvailable: process.env.FEATURE_WORK_MODE_WORKER_ACTIONS === "1",
  }
}

export async function getWorkModeOverview(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WorkModeOverviewPayload> {
  const base = await getWorkModeAssignments(supabase, userId)
  const availability = { ...base.sourceAvailability }
  const eventIds = Array.from(new Set(base.assignments.map((assignment) => assignment.eventId).filter((id): id is string => Boolean(id))))
  const acceptedEventIds = new Set(base.assignments
    .filter((assignment) => assignment.status === "confirmed" || assignment.status === "active")
    .map((assignment) => assignment.eventId)
    .filter((id): id is string => Boolean(id)))

  const [eventResult, communicationResult, bulletinResult] = await Promise.all([
    eventIds.length
      ? supabase.from("events_v2").select("id, title, org_id, venue_id, start_at, end_at, timezone").in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("team_communications")
      .select("id, org_id, event_id, sender_id, subject, content, message_type, priority, read_by, requires_acknowledgment, acknowledged_by, sent_at, remind_at")
      .contains("recipients", [userId])
      .order("sent_at", { ascending: false })
      .limit(100),
    acceptedEventIds.size
      ? supabase
          .from("event_bulletins")
          .select("id, event_id, author_id, title, content, priority, visible_to, requires_acknowledgment, read_by, acknowledged_by, created_at")
          .in("event_id", Array.from(acceptedEventIds))
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (eventResult.error) {
    availability.events = "unavailable"
    console.warn("[work-mode] event context read failed", eventResult.error.message)
  }
  if (communicationResult.error || bulletinResult.error) {
    availability.communications = "unavailable"
    if (communicationResult.error) console.warn("[work-mode] communication read failed", communicationResult.error.message)
    if (bulletinResult.error) console.warn("[work-mode] bulletin read failed", bulletinResult.error.message)
  }
  if (communicationResult.error) availability.reminders = "unavailable"

  const eventRows = eventResult.data ?? []
  const orgIds = Array.from(new Set([
    ...eventRows.map((event) => event.org_id),
    ...(communicationResult.data ?? []).map((message) => message.org_id),
  ].filter((id): id is string => Boolean(id))))
  const venueIds = Array.from(new Set(eventRows.map((event) => event.venue_id).filter((id): id is string => Boolean(id))))
  const senderIds = Array.from(new Set([
    ...(communicationResult.data ?? []).map((message) => message.sender_id),
    ...(bulletinResult.data ?? []).map((bulletin) => bulletin.author_id),
  ].filter((id): id is string => Boolean(id))))

  const [orgResult, venueResult, profileResult] = await Promise.all([
    orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [], error: null }),
    venueIds.length ? supabase.from("venues_v2").select("id, name").in("id", venueIds) : Promise.resolve({ data: [], error: null }),
    senderIds.length ? supabase.from("profiles").select("id, full_name, name").in("id", senderIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (orgResult.error || venueResult.error) availability.events = "unavailable"

  const organizationById = new Map((orgResult.data ?? []).map((organization) => [organization.id, organization.name]))
  const venueById = new Map((venueResult.data ?? []).map((venue) => [venue.id, venue.name]))
  const senderById = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.full_name || profile.name]))
  const eventById = new Map(eventRows.map((event) => [event.id, event]))

  const events: WorkModeEventSummary[] = eventRows.map((event) => {
    const assignments = base.assignments.filter((assignment) => assignment.eventId === event.id)
    const selected = assignments.find((assignment) => assignment.status === "active")
      || assignments.find((assignment) => assignment.status === "confirmed")
      || assignments[0]
    const canOpen = assignments.some((assignment) => assignment.status === "confirmed" || assignment.status === "active")
    return {
      eventId: event.id,
      title: event.title,
      organizationId: event.org_id,
      organizationName: organizationById.get(event.org_id) || null,
      venueId: event.venue_id,
      venueName: event.venue_id ? venueById.get(event.venue_id) || null : null,
      startsAt: event.start_at || selected?.startsAt || null,
      endsAt: event.end_at || selected?.endsAt || null,
      timezone: event.timezone,
      assignments,
      href: canOpen && selected ? `/work/events/${event.id}?assignment=${selected.id}` : null,
    }
  }).sort((left, right) => {
    const leftTime = left.assignments[0]?.startsAt || left.startsAt || "9999"
    const rightTime = right.assignments[0]?.startsAt || right.startsAt || "9999"
    return leftTime.localeCompare(rightTime)
  })

  const teamMessages = communicationResult.data ?? []
  const reminders: WorkModeReminder[] = teamMessages
    .filter((message) => message.message_type === "reminder" && Boolean(message.remind_at))
    .map((message) => ({
      id: message.id,
      title: message.subject,
      body: message.content,
      eventId: message.event_id,
      organizationId: message.org_id,
      organizationName: message.org_id ? organizationById.get(message.org_id) || null : null,
      remindAt: message.remind_at as string,
      priority: message.priority,
      isRead: message.read_by.includes(userId),
      requiresAcknowledgment: message.requires_acknowledgment,
      isAcknowledged: message.acknowledged_by.includes(userId),
      href: message.event_id ? `/work/events/${message.event_id}?section=updates` : "/work/overview?panel=messages",
    }))
    .sort((left, right) => left.remindAt.localeCompare(right.remindAt))

  const communications: WorkModeCommunication[] = teamMessages
    .filter((message) => message.message_type !== "reminder")
    .map((message) => ({
      id: message.id,
      source: "team_communication" as const,
      kind: message.message_type === "update" || message.message_type === "alert" ? "update" as const : "message" as const,
      title: message.subject,
      body: message.content,
      eventId: message.event_id,
      organizationId: message.org_id,
      organizationName: message.org_id ? organizationById.get(message.org_id) || null : null,
      senderName: message.sender_id ? senderById.get(message.sender_id) || null : null,
      sentAt: message.sent_at,
      priority: message.priority,
      isRead: message.read_by.includes(userId),
      requiresAcknowledgment: message.requires_acknowledgment,
      isAcknowledged: message.acknowledged_by.includes(userId),
      href: message.event_id ? `/work/events/${message.event_id}?section=updates` : "/messages?tab=work",
    }))

  for (const bulletin of bulletinResult.data ?? []) {
    const assignments = base.assignments.filter((assignment) => assignment.eventId === bulletin.event_id)
    if (!canSeeAudience(bulletin.visible_to, assignments)) continue
    const event = eventById.get(bulletin.event_id)
    communications.push({
      id: bulletin.id,
      source: "event_bulletin",
      kind: "update",
      title: bulletin.title,
      body: bulletin.content,
      eventId: bulletin.event_id,
      organizationId: event?.org_id || null,
      organizationName: event?.org_id ? organizationById.get(event.org_id) || null : null,
      senderName: senderById.get(bulletin.author_id) || null,
      sentAt: bulletin.created_at || base.generatedAt,
      priority: bulletin.priority || "normal",
      isRead: (bulletin.read_by || []).includes(userId),
      requiresAcknowledgment: Boolean(bulletin.requires_acknowledgment),
      isAcknowledged: (bulletin.acknowledged_by || []).includes(userId),
      href: `/work/events/${bulletin.event_id}?section=updates`,
    })
  }

  for (const publication of base.publications.filter((item) => ["command_broadcast", "event_publish", "tour_publish"].includes(item.publicationType))) {
    const event = publication.eventId ? eventById.get(publication.eventId) : null
    communications.push({
      id: publication.id,
      source: "publication",
      kind: "update",
      title: publication.title,
      body: asString(publication.payload.summary) || asString(publication.payload.message) || "New event information was published.",
      eventId: publication.eventId,
      organizationId: event?.org_id || null,
      organizationName: event?.org_id ? organizationById.get(event.org_id) || null : null,
      senderName: null,
      sentAt: publication.publishedAt || base.generatedAt,
      priority: asString(publication.payload.priority) || "normal",
      isRead: false,
      requiresAcknowledgment: Boolean(publication.payload.requires_acknowledgment),
      isAcknowledged: false,
      href: publication.eventId ? `/work/events/${publication.eventId}?section=updates` : publication.href || "/work/overview",
    })
  }
  communications.sort((left, right) => right.sentAt.localeCompare(left.sentAt))

  const now = Date.now()
  const incompleteTasks = base.tasks.filter((task) => !["done", "completed", "cancelled"].includes(normalizedToken(task.status)))
  const attention: WorkModeAttentionItem[] = [
    ...base.assignments.filter((assignment) => assignment.status === "invited").map((assignment) => ({
      id: `assignment:${assignment.id}`,
      kind: "invitation" as const,
      title: `${assignment.roleTitle} shift invitation`,
      detail: assignment.department,
      eventId: assignment.eventId,
      assignmentId: assignment.id,
      dueAt: assignment.startsAt,
      priority: "high" as const,
      href: `/work/overview?assignment=${assignment.id}`,
    })),
    ...incompleteTasks.filter((task) => task.priority === "high" || task.dueDate && new Date(task.dueDate).getTime() <= now).map((task) => ({
      id: `task:${task.id}`,
      kind: "task" as const,
      title: task.title,
      detail: task.dueDate ? "Task due" : "Action required",
      eventId: task.eventId,
      assignmentId: null,
      dueAt: task.dueDate,
      priority: priorityLevel(task.priority),
      href: task.actionUrl || (task.eventId ? `/work/events/${task.eventId}?section=tasks` : "/work/tasks"),
    })),
    ...communications.filter((message) => !message.isAcknowledged && (message.requiresAcknowledgment || priorityLevel(message.priority) === "urgent")).map((message) => ({
      id: `communication:${message.source}:${message.id}`,
      kind: message.requiresAcknowledgment ? "acknowledgment" as const : "update" as const,
      title: message.title,
      detail: message.organizationName,
      eventId: message.eventId,
      assignmentId: null,
      dueAt: message.sentAt,
      priority: priorityLevel(message.priority),
      href: message.href,
    })),
    ...reminders.filter((reminder) => !reminder.isAcknowledged && (new Date(reminder.remindAt).getTime() <= now || priorityLevel(reminder.priority) !== "normal")).map((reminder) => ({
      id: `reminder:${reminder.id}`,
      kind: "reminder" as const,
      title: reminder.title,
      detail: reminder.organizationName,
      eventId: reminder.eventId,
      assignmentId: null,
      dueAt: reminder.remindAt,
      priority: priorityLevel(reminder.priority),
      href: reminder.href,
    })),
  ].sort((left, right) => {
    const rank = { urgent: 0, high: 1, normal: 2 }
    return rank[left.priority] - rank[right.priority] || String(left.dueAt || "9999").localeCompare(String(right.dueAt || "9999"))
  })

  return {
    ...base,
    events,
    communications,
    reminders,
    attention,
    unreadCount: communications.filter((message) => !message.isRead).length + reminders.filter((reminder) => !reminder.isRead).length,
    sourceAvailability: availability,
  }
}

export async function getWorkModeEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  eventId: string,
): Promise<WorkModeEventPayload | null> {
  const overview = await getWorkModeOverview(supabase, userId)
  const event = overview.events.find((item) => item.eventId === eventId)
  if (!event) return null
  const assignments = event.assignments.filter((assignment) => assignment.status === "confirmed" || assignment.status === "active")
  if (assignments.length === 0) return null
  const tourIds = new Set(assignments.map((assignment) => assignment.tourId).filter((id): id is string => Boolean(id)))
  const publications = overview.publications.filter((publication) =>
    publication.eventId === eventId || Boolean(publication.tourId && tourIds.has(publication.tourId)))
  const tasks = overview.tasks.filter((task) => task.eventId === eventId)
  const communications = overview.communications.filter((message) => message.eventId === eventId)
  const reminders = overview.reminders.filter((reminder) => reminder.eventId === eventId)
  const availableSections = Array.from(new Set([
    "overview",
    "schedule",
    ...(tasks.length ? ["tasks"] : []),
    ...(communications.length || reminders.length ? ["updates"] : []),
    ...publications.map((publication) => {
      if (publication.publicationType === "site_map") return "maps"
      if (publication.publicationType === "day_sheet") return "day-sheet"
      if (["travel", "itinerary", "lodging", "transport"].includes(publication.publicationType)) return "travel"
      if (["pay", "payroll", "compensation"].includes(publication.publicationType)) return "pay"
      if (["contacts", "crew_contacts", "contact_sheet"].includes(publication.publicationType)) return "contacts"
      return "documents"
    }),
    ...(assignments.some((assignment) => assignment.permissions.check_in_out === true) ? ["check-in"] : []),
  ]))
  return {
    event: { ...event, assignments },
    assignments,
    publications,
    tasks,
    communications,
    reminders,
    availableSections,
    sourceAvailability: overview.sourceAvailability,
    generatedAt: overview.generatedAt,
    workerActionsAvailable: overview.workerActionsAvailable,
  }
}

export function findWorkModeAssignment(
  payload: WorkModeAssignmentsPayload,
  assignmentId: string,
): WorkModeAssignmentListItem | null {
  return payload.assignments.find((assignment) => assignment.id === assignmentId) ?? null
}
