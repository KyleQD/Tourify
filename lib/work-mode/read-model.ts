import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import type {
  EmploymentAssignmentStatus,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
  WorkerAssignmentSchedule,
} from '@/types/hiring-roster-work-mode'

const ACTIVE_WORK_STATUSES: EmploymentAssignmentStatus[] = [
  'invited',
  'confirmed',
  'active',
]

type WorkReadClient = {
  from(table: string): any
}

function asBooleanPermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
    )
  )
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function publicationHref(payload: Record<string, unknown>, siteMapId: string | null) {
  if (typeof payload.worker_url === 'string' && payload.worker_url.startsWith('/')) {
    return payload.worker_url
  }
  if (typeof payload.url === 'string' && payload.url.startsWith('/')) {
    return payload.url
  }
  return siteMapId ? `/work/site-maps/${siteMapId}` : null
}

export class WorkModeReadError extends Error {
  readonly code = 'unavailable'

  constructor(message = 'Work Mode is temporarily unavailable.') {
    super(message)
    this.name = 'WorkModeReadError'
  }
}

export async function getWorkModeAssignments(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<WorkModeAssignmentsPayload> {
  // Database types can lag additive Supabase migrations. The live schema is audited
  // separately, so keep this adapter localized instead of weakening types app-wide.
  const db = supabase as unknown as WorkReadClient

  const { data: assignmentRows, error: assignmentError } = await db
    .from('employment_assignments')
    .select(
      'id, role_title, department, event_id, venue_id, organizer_id, starts_at, ends_at, status, permissions, staff_shift_id'
    )
    .eq('user_id', userId)
    .in('status', ACTIVE_WORK_STATUSES)
    .order('starts_at', { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error('[work-mode] assignment read failed', assignmentError.message)
    throw new WorkModeReadError()
  }

  const rows = (assignmentRows ?? []) as Array<Record<string, any>>
  const shiftIds = Array.from(
    new Set(
      rows
        .map((row) => row.staff_shift_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const { data: shiftRows, error: shiftError } = shiftIds.length
    ? await db
        .from('staff_shifts')
        .select(
          'id, event_id, shift_date, start_time, end_time, break_duration, zone_assignment, role_assignment, notes, status'
        )
        .in('id', shiftIds)
    : { data: [], error: null }

  if (shiftError) {
    console.error('[work-mode] shift read failed', shiftError.message)
    throw new WorkModeReadError('Assignments loaded, but schedules are unavailable.')
  }

  const schedules = new Map<string, WorkerAssignmentSchedule>()
  for (const shift of (shiftRows ?? []) as Array<Record<string, any>>) {
    schedules.set(shift.id, {
      shiftId: shift.id,
      eventId: shift.event_id ?? null,
      date: shift.shift_date ?? null,
      startTime: shift.start_time ?? null,
      endTime: shift.end_time ?? null,
      breakDurationMinutes:
        typeof shift.break_duration === 'number' ? shift.break_duration : 0,
      zone: shift.zone_assignment ?? null,
      role: shift.role_assignment ?? null,
      notes: shift.notes ?? null,
      status: shift.status ?? null,
    })
  }

  const assignments: WorkModeAssignmentListItem[] = rows.map((row) => {
    const schedule =
      typeof row.staff_shift_id === 'string'
        ? schedules.get(row.staff_shift_id) ?? null
        : null
    const eventId = schedule?.eventId ?? row.event_id ?? null

    return {
      id: row.id,
      role_title: row.role_title,
      department: row.department ?? null,
      event_id: eventId,
      venue_id: row.venue_id ?? null,
      organizer_id: row.organizer_id ?? null,
      staff_shift_id: row.staff_shift_id ?? null,
      starts_at: row.starts_at ?? null,
      ends_at: row.ends_at ?? null,
      status: row.status as EmploymentAssignmentStatus,
      permissions: asBooleanPermissions(row.permissions),
      source: 'assignment',
      publication_type: null,
      href: null,
      site_map_id: null,
      schedule,
    }
  })

  // Publications are intentionally scoped only to events already authorized by an
  // employment assignment (including its linked shift). We do not infer access from
  // the removed event_participants dependency.
  const eventIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.event_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  let publications: WorkModePublication[] = []
  if (eventIds.length > 0) {
    const { data: publicationRows, error: publicationError } = await db
      .from('work_mode_publications')
      .select('id, event_id, publication_type, title, payload, published_at')
      .in('event_id', eventIds)
      .order('published_at', { ascending: false })
      .limit(50)

    if (publicationError) {
      console.error('[work-mode] publication read failed', publicationError.message)
      throw new WorkModeReadError('Assignments loaded, but publications are unavailable.')
    }

    publications = ((publicationRows ?? []) as Array<Record<string, any>>).map((row) => {
      const payload = asPayload(row.payload)
      const siteMapId =
        typeof payload.site_map_id === 'string' ? payload.site_map_id : null

      return {
        id: row.id,
        event_id: row.event_id ?? null,
        publication_type: row.publication_type,
        title: row.title,
        payload,
        published_at: row.published_at ?? null,
        href: publicationHref(payload, siteMapId),
        site_map_id: siteMapId,
      }
    })
  }

  return {
    assignments,
    publications,
    generatedAt: new Date().toISOString(),
  }
}
