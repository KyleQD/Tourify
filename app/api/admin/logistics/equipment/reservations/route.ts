import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import { detectWindowOverlap } from '@/lib/logistics/conflicts'
import { buildLogisticsTaskInsert } from '@/lib/logistics/tasks-adapter'

const reservationSchema = z.object({
  equipment_asset_id: z.string().uuid().optional().nullable(),
  catalog_item_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  status: z.string().optional(),
  responsible_user_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  projected_cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  create_task: z.boolean().optional(),
  allow_overlap: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  return withAdminCapability('logistics.view', async (_req, { user, admin }) => {
    try {
      const { searchParams } = new URL(request.url)
      const eventId = searchParams.get('eventId') || searchParams.get('event_id')
      const tourId = searchParams.get('tourId') || searchParams.get('tour_id')
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId,
        tourId,
      })

      let query = scope.service
        .from('equipment_reservations')
        .select('*')
        .order('starts_at', { ascending: true })
        .limit(200)

      query = applyOrgLogisticsTaskFilter({
        query,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: true,
      })

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') return NextResponse.json({ reservations: [], needsMigration: true })
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ reservations: data || [] })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to load reservations' }, { status: 500 })
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminCapability('logistics.manage', async (req, { user, admin }) => {
    try {
      const body = await req.json()
      const parsed = reservationSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      const input = parsed.data

      if (!input.equipment_asset_id && !input.catalog_item_id) {
        return NextResponse.json({ error: 'equipment_asset_id or catalog_item_id is required' }, { status: 400 })
      }

      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: input.event_id,
        tourId: input.tour_id,
      })

      const conflicts = []
      if (input.equipment_asset_id && !input.allow_overlap) {
        const { data: existing } = await scope.service
          .from('equipment_reservations')
          .select('id, starts_at, ends_at, status')
          .eq('equipment_asset_id', input.equipment_asset_id)
          .not('status', 'in', '(cancelled,returned)')

        for (const row of existing || []) {
          const overlap = detectWindowOverlap({
            idA: 'new',
            idB: row.id,
            startA: input.starts_at,
            endA: input.ends_at,
            startB: row.starts_at,
            endB: row.ends_at,
            label: 'Equipment asset already reserved in this window',
          })
          if (overlap) conflicts.push(overlap)
        }

        if (conflicts.length > 0) {
          return NextResponse.json({ error: 'Reservation conflict', conflicts }, { status: 409 })
        }
      }

      const { data: reservation, error } = await scope.service
        .from('equipment_reservations')
        .insert({
          org_id: scope.orgId,
          event_id: input.event_id || null,
          tour_id: input.tour_id || null,
          equipment_asset_id: input.equipment_asset_id || null,
          catalog_item_id: input.catalog_item_id || null,
          quantity: input.quantity,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          status: input.status || 'requested',
          responsible_user_id: input.responsible_user_id || null,
          vendor_id: input.vendor_id || null,
          projected_cost: input.projected_cost ?? null,
          notes: input.notes || null,
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'equipment_reservations missing — apply logistics foundation migration' }, { status: 503 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let task = null
      if (input.create_task !== false) {
        const { data: createdTask } = await scope.service
          .from('logistics_tasks')
          .insert(buildLogisticsTaskInsert({
            eventId: input.event_id,
            tourId: input.tour_id,
            type: 'equipment',
            title: 'Equipment reservation',
            description: input.notes || null,
            createdBy: user.id,
            sourceType: 'equipment_reservation',
            sourceId: reservation.id,
            assignedToUserId: input.responsible_user_id,
            budget: input.projected_cost ?? null,
          }))
          .select('*')
          .maybeSingle()
        task = createdTask
      }

      return NextResponse.json({ reservation, task, conflicts: [] }, { status: 201 })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create reservation' }, { status: 500 })
    }
  })(request)
}
