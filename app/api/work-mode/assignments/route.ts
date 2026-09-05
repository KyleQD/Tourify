import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from '@/types/hiring-roster-work-mode'

const ACTIVE_WORK_STATUSES = ['invited', 'confirmed', 'active'] as const

type WorkReadClient = {
  from: (table: string) => any
}

function asBooleanPermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
    )
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: 'Sign in to view Work Mode.', code: 'not_authenticated' },
      { status: 401 }
    )
  }

  // Keep this boundary deliberately assignment-first. RLS remains enabled, but
  // application authorization is also explicit: the authenticated worker may
  // only build Work context from their own employment_assignments rows.
  const workClient = supabase as unknown as WorkReadClient
  const { data: assignmentRows, error: assignmentError } = await workClient
    .from('employment_assignments')
    .select(
      'id, role_title, department, event_id, venue_id, organizer_id, starts_at, ends_at, status, permissions'
    )
    .eq('user_id', user.id)
    .in('status', ACTIVE_WORK_STATUSES)
    .order('starts_at', { ascending: true, nullsFirst: false })

  if (assignmentError) {
    console.error('[work-mode] assignment read failed', assignmentError.message)
    return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
      { error: 'Work Mode is temporarily unavailable.', code: 'unavailable' },
      { status: 503 }
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
    source: 'assignment',
    publication_type: null,
    href: null,
    site_map_id: null,
  }))

  const eventIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.event_id)
        .filter((eventId): eventId is string => Boolean(eventId))
    )
  )

  let publications: WorkModePublication[] = []
  if (eventIds.length > 0) {
    const { data: publicationRows, error: publicationError } = await workClient
      .from('work_mode_publications')
      .select('id, event_id, publication_type, title, payload, published_at')
      .in('event_id', eventIds)
      .order('published_at', { ascending: false })
      .limit(50)

    // Publications enhance an already-authorized assignment. A publication read
    // failure must not hide the worker's assignment, so degrade to an empty list.
    if (publicationError) {
      console.warn('[work-mode] publication read unavailable', publicationError.message)
    } else {
      publications = (publicationRows ?? []).map((row: any) => ({
        id: row.id,
        event_id: row.event_id ?? null,
        publication_type: row.publication_type,
        title: row.title,
        payload: asRecord(row.payload),
        published_at: row.published_at ?? null,
      }))
    }
  }

  return NextResponse.json<WorkModeApiResponse<WorkModeAssignmentsPayload>>(
    {
      data: {
        assignments,
        publications,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
