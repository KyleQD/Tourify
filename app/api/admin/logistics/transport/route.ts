import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  OrgScopedMutationError,
  orgScopedUpdate,
} from '@/lib/admin/org-scoped-mutation'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import {
  detectCapacityOverflow,
  detectDoubleBookedKey,
  detectMissingRequired,
} from '@/lib/logistics/conflicts'
import { buildLogisticsTaskInsert } from '@/lib/logistics/tasks-adapter'
import { buildAckInsert } from '@/lib/logistics/acknowledgements'
import { sendLogisticsNotifications } from '@/lib/logistics/notifications-adapter'
import { notifyTransportChange } from '@/lib/logistics/travel-change-notify'

const segmentSchema = z.object({
  transport_type: z.enum(['shuttle_bus', 'limo', 'van', 'car', 'train', 'subway', 'walking', 'truck', 'rental', 'rideshare', 'other']).or(z.string().min(1)),
  provider_name: z.string().optional().nullable(),
  pickup_location: z.string().min(1),
  dropoff_location: z.string().min(1),
  pickup_time: z.string().min(1),
  estimated_dropoff_time: z.string().min(1),
  vehicle_capacity: z.number().int().positive().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  driver_phone: z.string().optional().nullable(),
  vehicle_plate: z.string().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  flight_id: z.string().uuid().optional().nullable(),
  total_cost: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  cargo_notes: z.string().optional().nullable(),
  is_passenger: z.boolean().optional(),
  is_cargo: z.boolean().optional(),
  travel_buffer_minutes: z.number().int().optional().nullable(),
  status: z.string().optional(),
  passenger_member_ids: z.array(z.string().uuid()).optional(),
  create_task: z.boolean().optional(),
  require_ack: z.boolean().optional(),
  notify: z.boolean().optional(),
})

const TRANSPORT_TYPES = new Set([
  'shuttle_bus', 'limo', 'van', 'car', 'train', 'subway', 'walking',
])

function normalizeTransportType(value: string): string {
  if (TRANSPORT_TYPES.has(value)) return value
  if (value === 'truck' || value === 'rental') return 'van'
  if (value === 'rideshare') return 'car'
  return 'car'
}

export const GET = withAdminCapability('logistics.view', async (request: NextRequest, { user, admin }) => {
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
        .from('ground_transportation_coordination')
        .select('*, transportation_passenger_assignments(*)')
        .order('pickup_time', { ascending: true })
        .limit(200)

      query = applyOrgLogisticsTaskFilter({
        query,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: false,
      })

      const { data, error } = await query
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const segments = data || []
      const conflicts = []
      for (const segment of segments) {
        const capacityConflict = detectCapacityOverflow({
          id: segment.id,
          capacity: segment.vehicle_capacity,
          assigned: segment.assigned_passengers ?? segment.transportation_passenger_assignments?.length ?? 0,
        })
        if (capacityConflict) conflicts.push(capacityConflict)

        const missingDriver = detectMissingRequired({
          id: segment.id,
          field: 'driver_name',
          value: segment.driver_name,
        })
        if (missingDriver && segment.status !== 'cancelled') conflicts.push(missingDriver)
      }

      const driverBookings = segments
        .filter((s: { driver_name?: string | null; status?: string }) => s.driver_name && s.status !== 'cancelled')
        .map((s: { id: string; driver_name: string; pickup_time: string; estimated_dropoff_time: string }) => ({
          key: s.driver_name,
          id: s.id,
          start: s.pickup_time,
          end: s.estimated_dropoff_time,
        }))

      const byDriver = new Map<string, Array<{ id: string; start: string; end: string }>>()
      for (const row of driverBookings) {
        const list = byDriver.get(row.key) || []
        list.push({ id: row.id, start: row.start, end: row.end })
        byDriver.set(row.key, list)
      }
      for (const [key, occurrences] of byDriver) {
        conflicts.push(...detectDoubleBookedKey({ key, occurrences }))
      }

      return NextResponse.json({ segments, conflicts })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to load transport' }, { status: 500 })
    }
})

export const POST = withAdminCapability('logistics.manage', async (request: NextRequest, { user, admin }) => {
    try {
      const body = await request.json()
      const parsed = segmentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }

      const input = parsed.data
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: input.event_id,
        tourId: input.tour_id,
      })

      if (input.event_id && !scope.eventIds.includes(input.event_id)) {
        return NextResponse.json({ error: 'Event not authorized' }, { status: 403 })
      }
      if (input.tour_id && !scope.tourIds.includes(input.tour_id)) {
        return NextResponse.json({ error: 'Tour not authorized' }, { status: 403 })
      }

      const passengerIds = input.passenger_member_ids || []
      const insertRow = {
        transport_type: normalizeTransportType(input.transport_type),
        provider_name: input.provider_name || null,
        pickup_location: input.pickup_location,
        dropoff_location: input.dropoff_location,
        pickup_time: input.pickup_time,
        estimated_dropoff_time: input.estimated_dropoff_time,
        vehicle_capacity: input.vehicle_capacity ?? null,
        assigned_passengers: passengerIds.length,
        driver_name: input.driver_name || null,
        driver_phone: input.driver_phone || null,
        vehicle_plate: input.vehicle_plate || null,
        group_id: input.group_id || null,
        event_id: input.event_id || null,
        tour_id: input.tour_id || null,
        flight_id: input.flight_id || null,
        total_cost: input.total_cost ?? null,
        timezone: input.timezone || 'UTC',
        cargo_notes: input.cargo_notes || null,
        is_passenger: input.is_passenger !== false,
        is_cargo: Boolean(input.is_cargo),
        travel_buffer_minutes: input.travel_buffer_minutes ?? 0,
        status: input.status || 'scheduled',
        assigned_by: user.id,
        org_id: scope.orgId,
      }

      const { data: segment, error } = await scope.service
        .from('ground_transportation_coordination')
        .insert(insertRow)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (passengerIds.length > 0) {
        const assignments = passengerIds.map((memberId) => ({
          transportation_id: segment.id,
          group_member_id: memberId,
          status: 'confirmed',
          // TRAVEL-101 — denormalized org scope from acting logistics scope
          org_id: scope.orgId,
        }))
        await scope.service.from('transportation_passenger_assignments').insert(assignments)

        if (input.require_ack !== false) {
          const ackRows = passengerIds.map((memberId) =>
            buildAckInsert({
              sourceType: 'transport_segment',
              sourceId: segment.id,
              userId: memberId,
              orgId: scope.orgId,
              eventId: input.event_id,
              tourId: input.tour_id,
            })
          )
          // user_id on ack expects auth users; store member mapping in metadata path via source only when member?user
          await scope.service.from('logistics_acknowledgements').upsert(
            ackRows.map((row) => ({ ...row, user_id: user.id })),
            { onConflict: 'source_type,source_id,user_id', ignoreDuplicates: true }
          )
        }
      }

      let task = null
      if (input.create_task !== false) {
        const taskInsert = buildLogisticsTaskInsert({
          eventId: input.event_id,
          tourId: input.tour_id,
          type: 'transportation',
          title: `Transport: ${input.pickup_location} ? ${input.dropoff_location}`,
          description: `Pickup ${input.pickup_time}`,
          status: 'pending',
          createdBy: user.id,
          sourceType: 'transport_segment',
          sourceId: segment.id,
          budget: input.total_cost ?? null,
        })
        const { data: createdTask } = await scope.service
          .from('logistics_tasks')
          .insert(taskInsert)
          .select('*')
          .maybeSingle()
        task = createdTask
      }

      if (input.notify) {
        await sendLogisticsNotifications({
          notify: async (payload) => {
            await scope.service.from('notifications').insert(
              (payload.userIds as string[]).map((userId: string) => ({
                user_id: userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                link: payload.link,
                metadata: payload.metadata,
              }))
            )
          },
          actorUserId: user.id,
          recipients: [{ userId: user.id, isAuthorized: true }],
          payload: {
            type: 'transport_assigned',
            title: 'Transport segment created',
            message: `${input.pickup_location} ? ${input.dropoff_location}`,
            sourceType: 'transport_segment',
            sourceId: segment.id,
            requireAck: Boolean(input.require_ack),
          },
          idempotencyKey: `transport-create-${segment.id}`,
        })
      }

      const capacityConflict = detectCapacityOverflow({
        id: segment.id,
        capacity: segment.vehicle_capacity,
        assigned: passengerIds.length,
      })

      return NextResponse.json({
        segment,
        task,
        conflicts: capacityConflict ? [capacityConflict] : [],
      }, { status: 201 })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to create transport' }, { status: 500 })
    }
})

export const PATCH = withAdminCapability('logistics.manage', async (request: NextRequest, { user, admin }) => {
    try {
      const body = await request.json()
      const id = body.id as string | undefined
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: body.event_id,
        tourId: body.tour_id,
      })

      const { data: before, error: beforeError } = await scope.service
        .from('ground_transportation_coordination')
        .select('*')
        .eq('id', id)
        .eq('org_id', admin.orgId)
        .maybeSingle()
      if (beforeError) return NextResponse.json({ error: beforeError.message }, { status: 500 })
      if (!before) return NextResponse.json({ error: 'Transport not found', code: 'entity_not_found' }, { status: 404 })

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      const allowed = [
        'status', 'pickup_location', 'dropoff_location', 'pickup_time', 'estimated_dropoff_time',
        'driver_name', 'driver_phone', 'vehicle_plate', 'vehicle_capacity', 'total_cost',
        'cargo_notes', 'timezone', 'actual_dropoff_time',
      ]
      for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key]
      }
      if (body.transport_type) updates.transport_type = normalizeTransportType(body.transport_type)

      // SEC-110: update predicates include target id + acting org_id.
      let data
      try {
        const result = await orgScopedUpdate({
          supabase: scope.service,
          table: 'ground_transportation_coordination',
          id,
          orgId: admin.orgId,
          patch: updates,
        })
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        if (!result.data) {
          return NextResponse.json({ error: 'Transport not found', code: 'entity_not_found' }, { status: 404 })
        }
        data = result.data
      } catch (error) {
        if (error instanceof OrgScopedMutationError) {
          return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
        }
        throw error
      }

      try {
        await notifyTransportChange({
          supabase: scope.service,
          actorUserId: user.id,
          before,
          after: data,
        })
      } catch (notifyError) {
        console.warn('[Transport API] change notify failed', notifyError)
      }

      return NextResponse.json({ segment: data })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to update transport' }, { status: 500 })
    }
})
