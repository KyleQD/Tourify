import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { generalNotificationTarget } from '@/lib/notifications/notification-target'

const publicationSchema = z.object({
  publication_type: z.enum(['advance', 'day_sheet', 'command_broadcast', 'site_map', 'event_publish', 'tour_publish']).optional(),
  type: z.enum(['advance', 'day_sheet', 'command_broadcast', 'site_map', 'event_publish', 'tour_publish']).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  site_map_id: z.string().uuid().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  requires_acknowledgement: z.boolean().default(false),
  audience_mode: z.enum(['all_assigned', 'selected_workers']).default('all_assigned'),
  worker_user_ids: z.array(z.string().uuid()).max(500).default([]),
}).refine((value) => Boolean(value.publication_type || value.type), {
  message: 'publication_type is required',
}).refine((value) => value.audience_mode !== 'selected_workers' || value.worker_user_ids.length > 0, {
  message: 'Select at least one assigned worker',
  path: ['worker_user_ids'],
})

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

async function loadEligibleWorkers(db: { from(table: string): any }, eventId: string) {
  const { data: eventShifts } = await db.from('staff_shifts').select('id').eq('event_id', eventId).is('deleted_at', null)
  const shiftIds = (eventShifts || []).map((shift: { id: string }) => shift.id)
  const [directAssignments, shiftAssignments] = await Promise.all([
    db.from('employment_assignments').select('user_id,role_title,staff_member_id').eq('event_id', eventId).in('status', ['confirmed', 'active']),
    shiftIds.length
      ? db.from('employment_assignments').select('user_id,role_title,staff_member_id').in('staff_shift_id', shiftIds).in('status', ['confirmed', 'active'])
      : Promise.resolve({ data: [], error: null }),
  ])
  const rows = Array.from(new Map([...(directAssignments.data || []), ...(shiftAssignments.data || [])].map((row: any) => [row.user_id, row])).values()) as any[]
  const memberIds = rows.map((row) => row.staff_member_id).filter(Boolean)
  const memberResult = memberIds.length ? await db.from('staff_members').select('id,name,email,position,role').in('id', memberIds) : { data: [] }
  const members = new Map((memberResult.data || []).map((member: any) => [member.id, member]))
  return rows.map((row) => {
    const member: any = members.get(row.staff_member_id)
    return { user_id: row.user_id, staff_member_id: row.staff_member_id, name: member?.name || member?.email || 'Assigned worker', role: member?.position || member?.role || row.role_title || 'Staff' }
  })
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const { data, error } = await supabase
    .from('work_mode_publications')
    .select('*')
    .eq('event_id', eventId)
    .order('published_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ publications: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const eligibleWorkers = await loadEligibleWorkers(supabase as unknown as { from(table: string): any }, eventId)
  return NextResponse.json({ publications: data || [], eligible_workers: eligibleWorkers })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const parsed = publicationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid worker event brief', details: parsed.error.issues }, { status: 400 })
  const body = parsed.data
  const publicationType = body.publication_type || body.type as string

  const db = supabase as unknown as { from(table: string): any }
  const eligibleWorkers = await loadEligibleWorkers(db, eventId)
  const eligibleWorkerIds = eligibleWorkers.map((worker) => worker.user_id)
  const audienceWorkerIds = body.audience_mode === 'selected_workers'
    ? Array.from(new Set(body.worker_user_ids))
    : eligibleWorkerIds
  const ineligibleWorkerIds = audienceWorkerIds.filter((workerId) => !eligibleWorkerIds.includes(workerId))
  if (ineligibleWorkerIds.length) {
    return NextResponse.json({ error: 'Audience includes workers without a confirmed or active event assignment' }, { status: 422 })
  }
  if (!audienceWorkerIds.length) {
    return NextResponse.json({ error: 'No confirmed or active workers are available for this event' }, { status: 422 })
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim()
    : `Event ${publicationType}`

  const previousResult = await db
    .from('work_mode_publications')
    .select('id,version')
    .eq('event_id', eventId)
    .eq('publication_type', publicationType)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const version = (previousResult.data?.version || 0) + 1

  const { data, error } = await db
    .from('work_mode_publications')
    .insert({
      event_id: eventId,
      site_map_id: body.site_map_id || null,
      publication_type: publicationType,
      title,
      payload: body.payload || {},
      visible_to: ['assigned_workers'],
      status: 'draft',
      version,
      supersedes_publication_id: previousResult.data?.id || null,
      requires_acknowledgement: body.requires_acknowledgement,
      published_by: user.id,
      published_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const audienceResult = await db.from('work_mode_publication_audiences').insert(
    audienceWorkerIds.map((workerId) => ({
      publication_id: data.id,
      worker_user_id: workerId,
      assigned_by: user.id,
    })),
  )
  if (audienceResult.error) {
    return NextResponse.json({ error: 'The worker audience could not be saved' }, { status: 500 })
  }

  const publishedResult = await db
    .from('work_mode_publications')
    .update({ status: 'published' })
    .eq('id', data.id)
    .eq('published_by', user.id)
    .select()
    .single()
  if (publishedResult.error || !publishedResult.data) {
    return NextResponse.json({ error: 'The worker audience was saved, but the brief could not be published' }, { status: 500 })
  }
  const publication = publishedResult.data

  await Promise.allSettled(audienceWorkerIds.map((workerId) =>
    OptimizedNotificationService.createNotification({
      userId: workerId,
      type: 'work_mode_publication',
      title: `New event information: ${title}`,
      content: body.requires_acknowledgement
        ? 'Review and acknowledge this event update in Work Hub.'
        : 'New worker-visible event information is available in Work Hub.',
      priority: body.requires_acknowledgement ? 'high' : 'normal',
      ...generalNotificationTarget(workerId),
      metadata: {
        publication_id: publication.id,
        event_id: eventId,
        publication_type: publicationType,
        version,
        link: `/work/publications/${publication.id}`,
      },
    }),
  ))

  return NextResponse.json({ publication, audience_count: audienceWorkerIds.length }, { status: 201 })
})
