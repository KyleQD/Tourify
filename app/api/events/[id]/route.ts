import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import {
  mapIncomingStatusToV2,
  mapV2RowToAdminEvent,
  mapUiStatusToV2ForPatch,
  resolveVenueName,
  type AdminUiEventStatus,
} from '../_lib/events-v2-admin'

function mapEventRow(row: Record<string, unknown>) {
  const settings =
    row.settings && typeof row.settings === 'object' && row.settings !== null
      ? (row.settings as Record<string, unknown>)
      : {}
  const description =
    typeof row.description === 'string'
      ? row.description
      : typeof settings.description === 'string'
        ? settings.description
        : null
  const tourEvents = row.tour_events as { tour_id: string }[] | null | undefined
  const tourId =
    typeof row.tour_id === 'string'
      ? row.tour_id
      : Array.isArray(tourEvents) && tourEvents[0]?.tour_id
        ? tourEvents[0].tour_id
        : null

  return {
    id: row.id as string,
    name: row.title as string,
    description,
    status: row.status as string,
    event_date: row.start_at as string,
    end_date: row.end_at as string,
    venue_id: (row.venue_id as string | null) ?? null,
    capacity: (row.capacity as number | null) ?? null,
    created_at: row.created_at as string,
    tour_id: tourId
  }
}

function combineDateTimeToIso(date?: string, time?: string): string | null {
  if (!date?.trim()) return null
  const t = (time?.trim() || '00:00').slice(0, 5)
  const ms = Date.parse(`${date.trim()}T${t}:00`)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

const patchBodySchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.string().min(1).optional(),
  start_at: z.string().min(1).optional(),
  end_at: z.string().min(1).optional(),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  venue_id: z.string().uuid().optional().nullable(),
  venue_name: z.string().optional(),
  capacity: z.union([z.number().int(), z.string()]).optional().nullable(),
  tour_id: z.string().uuid().optional().nullable()
})

const selectFields =
  'id, title, status, start_at, end_at, venue_id, capacity, created_at, created_by, settings, tour_events(tour_id)'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_request, { user, supabase }) => {
    try {
      const { data: row, error } = await supabase
        .from('events_v2')
        .select(selectFields)
        .eq('id', id)
        .eq('created_by', user.id)
        .maybeSingle()

      if (error) {
        console.error('[events/:id GET] query failed:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch event' }, { status: 500 })
      }
      if (!row) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
      }

      const rowRecord = row as Record<string, unknown>
      const base = mapEventRow(rowRecord)
      const venueName = await resolveVenueName(supabase, rowRecord.venue_id as string | null)
      const adminShape = mapV2RowToAdminEvent(row, venueName)

      const [tasksCount, staffCount, vendorCount, ticketData, financialData] = await Promise.allSettled([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('event_id', id),
        supabase.from('staff_shifts').select('id', { count: 'exact', head: true }).eq('event_id', id),
        supabase.from('event_vendor_requests').select('id', { count: 'exact', head: true }).eq('event_id', id),
        supabase.from('ticket_sales').select('quantity, total_amount').eq('event_id', id).eq('payment_status', 'completed'),
        supabase.from('financial_transactions').select('type, amount').eq('event_id', id),
      ])

      const taskTotal = tasksCount.status === 'fulfilled' ? (tasksCount.value.count ?? 0) : 0
      const staffTotal = staffCount.status === 'fulfilled' ? (staffCount.value.count ?? 0) : 0
      const vendorTotal = vendorCount.status === 'fulfilled' ? (vendorCount.value.count ?? 0) : 0

      const tickets = ticketData.status === 'fulfilled' ? (ticketData.value.data || []) : []
      const ticketsSold = tickets.reduce((s: number, t: any) => s + (Number(t.quantity) || 0), 0)
      const ticketRevenue = tickets.reduce((s: number, t: any) => s + (Number(t.total_amount) || 0), 0)

      const finRows = financialData.status === 'fulfilled' ? (financialData.value.data || []) : []
      const expenseTotal = finRows.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0)

      return NextResponse.json({
        success: true,
        event: {
          ...adminShape,
          tour_id: base.tour_id ?? adminShape.tour_id,
          end_date: base.end_date,
          tickets_sold: ticketsSold,
          expected_revenue: ticketRevenue,
          actual_revenue: ticketRevenue,
          expenses: expenseTotal,
          tasks_count: taskTotal,
          staff_count: staffTotal,
          vendor_count: vendorTotal,
        },
      })
    } catch (err) {
      console.error('[events/:id GET] unexpected error:', err)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_request, { user, supabase }) => {
    try {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
      }

      const parsed = patchBodySchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { data: existing, error: fetchError } = await supabase
        .from('events_v2')
        .select('id, created_by, title, settings')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        console.error('[events/:id PATCH] fetch failed:', fetchError)
        return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 })
      }
      if (!existing || existing.created_by !== user.id) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
      }

      const patch = parsed.data
      const updatePayload: Record<string, unknown> = {}

      const nextTitle = patch.title?.trim() || patch.name?.trim()
      if (nextTitle) {
        updatePayload.title = nextTitle
        updatePayload.slug = nextTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 60)
      }

      if (patch.status !== undefined) {
        const s = patch.status.toLowerCase()
        const uiLike = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'].includes(s)
        updatePayload.status = uiLike
          ? mapUiStatusToV2ForPatch(patch.status as AdminUiEventStatus)
          : mapIncomingStatusToV2(patch.status)
      }

      const combinedStart = combineDateTimeToIso(patch.event_date, patch.event_time)
      if (patch.start_at !== undefined) updatePayload.start_at = patch.start_at
      else if (combinedStart) updatePayload.start_at = combinedStart

      if (patch.end_at !== undefined) updatePayload.end_at = patch.end_at
      if (patch.venue_id !== undefined) updatePayload.venue_id = patch.venue_id

      if (patch.capacity !== undefined && patch.capacity !== null && patch.capacity !== '') {
        const n = typeof patch.capacity === 'string' ? parseInt(patch.capacity, 10) : patch.capacity
        if (!Number.isNaN(n)) updatePayload.capacity = n
      } else if (patch.capacity === null) updatePayload.capacity = null

      const prevSettings =
        existing.settings && typeof existing.settings === 'object' && existing.settings !== null
          ? { ...(existing.settings as Record<string, unknown>) }
          : {}
      let settingsDirty = false
      const nextSettings = { ...prevSettings }

      if (patch.description !== undefined) {
        settingsDirty = true
        if (patch.description === null || patch.description === '') delete nextSettings.description
        else nextSettings.description = patch.description
      }

      if (patch.venue_name !== undefined) {
        settingsDirty = true
        if (patch.venue_name === '') delete nextSettings.venue_label
        else nextSettings.venue_label = patch.venue_name
      }

      if (settingsDirty) updatePayload.settings = nextSettings

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase.from('events_v2').update(updatePayload).eq('id', id)

        if (updateError) {
          console.error('[events/:id PATCH] update failed:', updateError)
          return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 })
        }
      }

      if (patch.tour_id !== undefined) {
        const { error: delError } = await supabase.from('tour_events').delete().eq('event_id', id)
        if (delError) {
          console.error('[events/:id PATCH] tour_events delete failed:', delError)
          return NextResponse.json({ success: false, error: 'Failed to update tour link' }, { status: 500 })
        }
        if (patch.tour_id !== null) {
          const { error: insError } = await supabase
            .from('tour_events')
            .insert({ tour_id: patch.tour_id, event_id: id })
          if (insError) {
            console.error('[events/:id PATCH] tour_events insert failed:', insError)
            return NextResponse.json({ success: false, error: 'Failed to update tour link' }, { status: 500 })
          }
        }
      }

      const { data: row, error: outError } = await supabase
        .from('events_v2')
        .select(selectFields)
        .eq('id', id)
        .single()

      if (outError || !row) {
        console.error('[events/:id PATCH] refetch failed:', outError)
        return NextResponse.json({ success: false, error: 'Failed to load updated event' }, { status: 500 })
      }

      const rowRecord = row as Record<string, unknown>
      const patchBase = mapEventRow(rowRecord)
      const patchVenueName = await resolveVenueName(supabase, rowRecord.venue_id as string | null)
      const patchAdminShape = mapV2RowToAdminEvent(row, patchVenueName)

      return NextResponse.json({
        success: true,
        event: {
          ...patchAdminShape,
          tour_id: patchBase.tour_id ?? patchAdminShape.tour_id,
          end_date: patchBase.end_date,
        },
      })
    } catch (err) {
      console.error('[events/:id PATCH] unexpected error:', err)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_request, { user, supabase }) => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('events_v2')
        .select('id, created_by')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        console.error('[events/:id DELETE] fetch failed:', fetchError)
        return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 })
      }
      if (!existing || existing.created_by !== user.id) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
      }

      const { error: deleteError } = await supabase.from('events_v2').delete().eq('id', id)

      if (deleteError) {
        console.error('[events/:id DELETE] delete failed:', deleteError)
        return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[events/:id DELETE] unexpected error:', err)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
