import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import {
  canTransitionTravelStatus,
  parseTravelCoordinationCommand,
} from '@/lib/admin/travel-command-schemas'
import {
  resolveTravelScopeOrgId,
  withParentOrgId,
} from '@/lib/admin/travel-tenant-keys'
import {
  formatAutoCoordinateMessage,
  summarizeAutoCoordinateDrafts,
} from '@/lib/admin/travel-coordination-lifecycle'
import { notifyFlightChange } from '@/lib/logistics/travel-change-notify'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import {
  projectTravelerNestedRecord,
  projectTravelerRecords,
} from '@/lib/admin/traveler-field-projection'

function ok(data: unknown, message?: string) {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) })
}

function err(msg: string, status = 500) {
  return NextResponse.json({ success: false, error: msg }, { status })
}

async function requireAuth(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { denied: err('Unauthorized', 401), auth: null as never, admin: null as never }
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return { denied: err('Forbidden', 403), auth: null as never, admin: null as never }
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse)
    return { denied: admin, auth: null as never, admin: null as never }
  return { denied: null, auth, admin }
}

/** TRAVEL-103 — record/parent org must match acting org when both are known. */
function assertOrgMatch(actingOrgId: string, recordOrgId: string | null | undefined, label: string) {
  if (!recordOrgId) return err(`${label} is outside a resolvable organization scope`, 422)
  if (recordOrgId !== actingOrgId)
    return err(`${label} does not belong to the acting organization`, 403)
  return null
}

function stripCommandMeta(data: Record<string, unknown>) {
  const { action: _a, id: _i, ...rest } = data
  return rest
}

// =============================================================================
// GET
// =============================================================================

export async function GET(request: NextRequest) {
  const { denied, auth, admin } = await requireAuth(request)
  if (denied || !auth || !admin) return denied!

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'groups'
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)
  const offset = Number(searchParams.get('offset') || '0')
  const status = searchParams.get('status')
  const groupType = searchParams.get('group_type')
  const eventId = searchParams.get('event_id')
  const tourId = searchParams.get('tour_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const capabilities = admin.capabilities

  try {
    switch (type) {
      case 'groups':
        return await getGroups(auth.supabase, { limit, offset, status, groupType, eventId, tourId, dateFrom, dateTo })
      case 'group_members':
        return await getGroupMembers(auth.supabase, { limit, offset, status, groupType }, capabilities)
      case 'flights':
        return await getFlights(auth.supabase, { limit, offset, status, eventId, tourId, dateFrom, dateTo })
      case 'flight_passengers':
        return await getFlightPassengers(auth.supabase, { limit, offset, status }, capabilities)
      case 'transportation':
        return await getTransportation(auth.supabase, { limit, offset, status, eventId, tourId, dateFrom, dateTo })
      case 'transportation_passengers':
        return await getTransportationPassengers(auth.supabase, { limit, offset, status }, capabilities)
      case 'hotel_assignments':
        return await getHotelAssignments(auth.supabase, { limit, offset, status }, capabilities)
      case 'timeline':
        return await getTimeline(auth.supabase, { limit, offset, dateFrom, dateTo })
      case 'analytics':
        return await getAnalytics(auth.supabase)
      case 'utilization':
        return await getUtilization(auth.supabase, { limit, offset })
      default:
        return err(`Unknown type: ${type}`, 400)
    }
  } catch (error: any) {
    console.error(`[Travel Coordination] GET (${type}) error:`, error)
    return err(error.message || 'Failed to fetch travel coordination data')
  }
}

// =============================================================================
// POST
// =============================================================================

export async function POST(request: NextRequest) {
  const { denied, auth, admin } = await requireAuth(request)
  if (denied || !auth || !admin) return denied!

  try {
    const rawBody = await request.json()
    const parsed = parseTravelCoordinationCommand(rawBody)
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error, details: parsed.details },
        { status: 400 },
      )
    }

    const action = parsed.action
    const body = parsed.data
    const actingOrgId = admin.orgId

    switch (action) {
      case 'create_travel_group': {
        const groupData = stripCommandMeta(body)
        const parentOrgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          tourId: typeof groupData.tour_id === 'string' ? groupData.tour_id : null,
          eventId: typeof groupData.event_id === 'string' ? groupData.event_id : null,
        })
        if (groupData.tour_id || groupData.event_id) {
          const mismatch = assertOrgMatch(actingOrgId, parentOrgId, 'Tour/event parent')
          if (mismatch) return mismatch
        }
        const orgId = parentOrgId || actingOrgId
        const { data, error } = await auth.supabase
          .from('travel_groups')
          .insert({ ...groupData, created_by: auth.user.id, org_id: orgId })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Travel group created successfully')
      }

      case 'create_group_member': {
        const memberData = stripCommandMeta(body)
        const stamped = await withParentOrgId({
          supabase: auth.supabase,
          parentTable: 'travel_groups',
          parentId: typeof memberData.group_id === 'string' ? memberData.group_id : null,
          payload: memberData,
        })
        const mismatch = assertOrgMatch(actingOrgId, stamped.org_id, 'Travel group parent')
        if (mismatch) return mismatch
        const { data, error } = await auth.supabase
          .from('travel_group_members')
          .insert(stamped)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Group member added successfully')
      }

      case 'bulk_create_group_members': {
        const group_id = body.group_id as string
        const members = body.members as Record<string, unknown>[]

        const orgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          groupId: group_id,
        })
        const mismatch = assertOrgMatch(actingOrgId, orgId, 'Travel group parent')
        if (mismatch) return mismatch
        const rows = members.map((m) => ({
          ...m,
          group_id,
          org_id: orgId,
        }))
        const { data, error } = await auth.supabase
          .from('travel_group_members')
          .insert(rows)
          .select('*')
        if (error) throw error
        return ok(data, `${data.length} group members added successfully`)
      }

      case 'create_flight': {
        const flightData = stripCommandMeta(body)
        const parentOrgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          tourId: typeof flightData.tour_id === 'string' ? flightData.tour_id : null,
          eventId: typeof flightData.event_id === 'string' ? flightData.event_id : null,
          groupId: typeof flightData.group_id === 'string' ? flightData.group_id : null,
        })
        if (flightData.tour_id || flightData.event_id || flightData.group_id) {
          const mismatch = assertOrgMatch(actingOrgId, parentOrgId, 'Flight parent')
          if (mismatch) return mismatch
        }
        const orgId = parentOrgId || actingOrgId
        const { data, error } = await auth.supabase
          .from('flight_coordination')
          .insert({ ...flightData, assigned_by: auth.user.id, org_id: orgId })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Flight created successfully')
      }

      case 'create_flight_with_passenger': {
        const passenger_name = String(body.passenger_name || '')
        const passenger_user_id = typeof body.passenger_user_id === 'string' ? body.passenger_user_id : null
        const passenger_email = typeof body.passenger_email === 'string' ? body.passenger_email : null
        const existingGroupId = typeof body.group_id === 'string' ? body.group_id : undefined
        const flight_number = String(body.flight_number || '')
        const airline = String(body.airline || '')
        const departure_airport = String(body.departure_airport || '')
        const arrival_airport = String(body.arrival_airport || '')
        const departure_time = String(body.departure_time || '')
        const arrival_time = String(body.arrival_time || '')
        const booking_reference = typeof body.booking_reference === 'string' ? body.booking_reference : null
        const status = typeof body.status === 'string' ? body.status : 'scheduled'
        const event_id = typeof body.event_id === 'string' ? body.event_id : null
        const tour_id = typeof body.tour_id === 'string' ? body.tour_id : null
        const gate = typeof body.gate === 'string' ? body.gate : null
        const terminal = typeof body.terminal === 'string' ? body.terminal : null

        let groupId = existingGroupId
        const scopeOrgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          tourId: tour_id,
          eventId: event_id,
          groupId: groupId || null,
        })
        if (tour_id || event_id || groupId) {
          const mismatch = assertOrgMatch(actingOrgId, scopeOrgId, 'Flight parent')
          if (mismatch) return mismatch
        }
        const memberOrgId = scopeOrgId || actingOrgId

        if (!groupId) {
          const { data: group, error: groupError } = await auth.supabase
            .from('travel_groups')
            .insert({
              name: `Travel party — ${passenger_name}`.slice(0, 120),
              group_type: 'crew',
              event_id,
              tour_id,
              created_by: auth.user.id,
              status: 'planning',
              org_id: memberOrgId,
            })
            .select('id, org_id')
            .single()
          if (groupError) throw groupError
          groupId = group.id
        }

        const { data: member, error: memberError } = await auth.supabase
          .from('travel_group_members')
          .insert({
            group_id: groupId,
            member_name: passenger_name.trim(),
            member_email: passenger_email || null,
            user_id: passenger_user_id,
            status: 'confirmed',
            org_id: memberOrgId,
          })
          .select('*')
          .single()
        if (memberError) throw memberError

        const { data: flight, error: flightError } = await auth.supabase
          .from('flight_coordination')
          .insert({
            flight_number,
            airline,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference,
            status,
            gate,
            terminal,
            event_id,
            tour_id,
            group_id: groupId,
            assigned_by: auth.user.id,
            org_id: memberOrgId,
          })
          .select('*')
          .single()
        if (flightError) throw flightError

        let assignment: Record<string, unknown> | null = null
        const passengerPayload = {
          flight_id: flight.id,
          group_member_id: member.id,
          passenger_name: passenger_name.trim(),
          status: 'confirmed',
          org_id: memberOrgId,
        }
        const firstAttempt = await auth.supabase
          .from('flight_passenger_assignments')
          .insert(passengerPayload)
          .select('*')
          .single()
        if (firstAttempt.error) {
          // Pre-migration fallback if passenger_name column is not yet applied
          const { passenger_name: _ignored, ...withoutName } = passengerPayload
          const secondAttempt = await auth.supabase
            .from('flight_passenger_assignments')
            .insert(withoutName)
            .select('*')
            .single()
          if (secondAttempt.error) throw firstAttempt.error
          assignment = secondAttempt.data
        } else {
          assignment = firstAttempt.data
        }

        return ok({ flight, member, assignment }, 'Flight created with passenger')
      }

      case 'create_ground_transportation': {
        const transportData = stripCommandMeta(body)
        const parentOrgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          tourId: typeof transportData.tour_id === 'string' ? transportData.tour_id : null,
          eventId: typeof transportData.event_id === 'string' ? transportData.event_id : null,
          groupId: typeof transportData.group_id === 'string' ? transportData.group_id : null,
        })
        if (transportData.tour_id || transportData.event_id || transportData.group_id) {
          const mismatch = assertOrgMatch(actingOrgId, parentOrgId, 'Transport parent')
          if (mismatch) return mismatch
        }
        const orgId = parentOrgId || actingOrgId
        const { data, error } = await auth.supabase
          .from('ground_transportation_coordination')
          .insert({ ...transportData, assigned_by: auth.user.id, org_id: orgId })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Ground transportation created successfully')
      }

      case 'create_flight_passenger': {
        const assignmentData = stripCommandMeta(body)
        const stamped = await withParentOrgId({
          supabase: auth.supabase,
          parentTable: 'flight_coordination',
          parentId: typeof assignmentData.flight_id === 'string' ? assignmentData.flight_id : null,
          payload: assignmentData,
        })
        const mismatch = assertOrgMatch(actingOrgId, stamped.org_id, 'Flight parent')
        if (mismatch) return mismatch
        const { data, error } = await auth.supabase
          .from('flight_passenger_assignments')
          .insert(stamped)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Passenger assigned to flight')
      }

      case 'create_transportation_passenger': {
        const assignmentData = stripCommandMeta(body)
        const stamped = await withParentOrgId({
          supabase: auth.supabase,
          parentTable: 'ground_transportation_coordination',
          parentId:
            typeof assignmentData.transportation_id === 'string'
              ? assignmentData.transportation_id
              : null,
          payload: assignmentData,
        })
        const mismatch = assertOrgMatch(actingOrgId, stamped.org_id, 'Transport parent')
        if (mismatch) return mismatch
        const { data, error } = await auth.supabase
          .from('transportation_passenger_assignments')
          .insert(stamped)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Passenger assigned to transportation')
      }

      case 'create_hotel_assignment': {
        const assignmentData = stripCommandMeta(body)
        const stamped = await withParentOrgId({
          supabase: auth.supabase,
          parentTable: 'lodging_bookings',
          parentId:
            typeof assignmentData.lodging_booking_id === 'string'
              ? assignmentData.lodging_booking_id
              : null,
          payload: assignmentData,
        })
        const mismatch = assertOrgMatch(actingOrgId, stamped.org_id, 'Lodging booking parent')
        if (mismatch) return mismatch
        const { data, error } = await auth.supabase
          .from('hotel_room_assignments')
          .insert(stamped)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Hotel room assigned successfully')
      }

      case 'create_timeline_entry': {
        const timelineData = stripCommandMeta(body)
        const parentOrgId = await resolveTravelScopeOrgId({
          supabase: auth.supabase,
          tourId: typeof timelineData.tour_id === 'string' ? timelineData.tour_id : null,
          eventId: typeof timelineData.event_id === 'string' ? timelineData.event_id : null,
          groupId: typeof timelineData.group_id === 'string' ? timelineData.group_id : null,
        })
        if (timelineData.tour_id || timelineData.event_id || timelineData.group_id) {
          const mismatch = assertOrgMatch(actingOrgId, parentOrgId, 'Timeline parent')
          if (mismatch) return mismatch
        }
        const orgId = parentOrgId || actingOrgId
        const { data, error } = await auth.supabase
          .from('travel_coordination_timeline')
          .insert({ ...timelineData, created_by: auth.user.id, org_id: orgId })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Timeline entry created successfully')
      }

      case 'auto_coordinate_group': {
        const group_id = body.group_id as string

        const { data: group, error: groupError } = await auth.supabase
          .from('travel_groups')
          .select('*')
          .eq('id', group_id)
          .single()
        if (groupError) throw groupError

        const coordinateOrgId =
          (typeof group.org_id === 'string' && group.org_id)
          || (await resolveTravelScopeOrgId({
            supabase: auth.supabase,
            groupId: group_id,
            tourId: group.tour_id || null,
            eventId: group.event_id || null,
          }))
        const mismatch = assertOrgMatch(actingOrgId, coordinateOrgId, 'Travel group')
        if (mismatch) return mismatch

        const now = new Date()
        const end = new Date(now.getTime() + 60 * 60 * 1000)

        // Draft planning artifacts only — does not invent bookings.
        const draftsCreated: string[] = []

        await auth.supabase
          .from('travel_coordination_timeline')
          .insert({
            entry_type: 'meeting',
            title: `Coordinate ${group.name}`,
            description: 'Auto-coordination opened a planning review. Confirm flights, lodging, and ground transport separately.',
            start_time: now.toISOString(),
            end_time: end.toISOString(),
            timezone: 'UTC',
            group_id,
            affected_members: group.total_members || 0,
            event_id: group.event_id,
            tour_id: group.tour_id,
            created_by: auth.user.id,
            org_id: coordinateOrgId,
          })
        draftsCreated.push('timeline_review')

        const arrival = group.arrival_date ? new Date(group.arrival_date) : now
        const pickup = new Date(arrival.getTime())
        const dropoff = new Date(arrival.getTime() + 90 * 60 * 1000)

        const { data: draftTransport } = await auth.supabase
          .from('ground_transportation_coordination')
          .insert({
            transport_type: 'van',
            provider_name: 'TBD',
            pickup_location: group.arrival_location || 'Airport / arrival point',
            dropoff_location: 'Venue / hotel (confirm)',
            pickup_time: pickup.toISOString(),
            estimated_dropoff_time: dropoff.toISOString(),
            group_id,
            event_id: group.event_id,
            tour_id: group.tour_id,
            status: 'scheduled',
            assigned_by: auth.user.id,
            vehicle_capacity: group.total_members || null,
            org_id: coordinateOrgId,
          })
          .select('id')
          .maybeSingle()
        if (draftTransport?.id) draftsCreated.push('ground_transport_draft')

        await auth.supabase
          .from('travel_groups')
          .update({
            coordination_status: 'review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', group_id)
          .eq('org_id', actingOrgId)

        const message = formatAutoCoordinateMessage({
          groupName: group.name,
          draftsCreated,
        })

        return ok(
          {
            group_id,
            coordination_status: 'review',
            lifecycle: 'review',
            drafts_created: draftsCreated,
            drafts: summarizeAutoCoordinateDrafts(draftsCreated),
            message,
          },
          message,
        )
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] POST error:', error)
    return err(error.message || 'Failed to process travel coordination request')
  }
}

// =============================================================================
// PUT
// =============================================================================

export async function PUT(request: NextRequest) {
  const { denied, auth, admin } = await requireAuth(request)
  if (denied || !auth || !admin) return denied!

  try {
    const rawBody = await request.json()
    const parsed = parseTravelCoordinationCommand(rawBody)
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error, details: parsed.details },
        { status: 400 },
      )
    }

    const action = parsed.action
    const id = parsed.data.id as string
    const updateData = stripCommandMeta(parsed.data)
    const actingOrgId = admin.orgId

    async function loadScopedRow(table: string) {
      const { data, error } = await auth!.supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      const mismatch = assertOrgMatch(actingOrgId, data?.org_id, table)
      if (mismatch) return { before: null as never, denied: mismatch }
      if (
        typeof updateData.status === 'string'
        && typeof data.status === 'string'
        && !canTransitionTravelStatus(data.status, updateData.status)
      ) {
        return {
          before: null as never,
          denied: err(
            `Status transition ${data.status} → ${updateData.status} is not allowed`,
            422,
          ),
        }
      }
      return { before: data, denied: null as NextResponse | null }
    }

    switch (action) {
      case 'update_travel_group': {
        const loaded = await loadScopedRow('travel_groups')
        if (loaded.denied) return loaded.denied
        const { data, error } = await auth.supabase
          .from('travel_groups')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('org_id', actingOrgId)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Travel group updated successfully')
      }

      case 'update_flight': {
        const loaded = await loadScopedRow('flight_coordination')
        if (loaded.denied) return loaded.denied
        const before = loaded.before

        const { data, error } = await auth.supabase
          .from('flight_coordination')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('org_id', actingOrgId)
          .select('*')
          .single()
        if (error) throw error

        try {
          await notifyFlightChange({
            supabase: auth.supabase,
            actorUserId: auth.user.id,
            before,
            after: data,
          })
        } catch (notifyError) {
          console.warn('[Travel Coordination] flight change notify failed', notifyError)
        }

        return ok(data, 'Flight updated successfully')
      }

      case 'update_ground_transportation': {
        const loaded = await loadScopedRow('ground_transportation_coordination')
        if (loaded.denied) return loaded.denied
        const { data, error } = await auth.supabase
          .from('ground_transportation_coordination')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('org_id', actingOrgId)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Ground transportation updated successfully')
      }

      case 'update_hotel_assignment': {
        const loaded = await loadScopedRow('hotel_room_assignments')
        if (loaded.denied) return loaded.denied
        const { data, error } = await auth.supabase
          .from('hotel_room_assignments')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('org_id', actingOrgId)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Hotel assignment updated successfully')
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] PUT error:', error)
    return err(error.message || 'Failed to update travel coordination data')
  }
}

// =============================================================================
// DELETE
// =============================================================================

export async function DELETE(request: NextRequest) {
  const { denied, auth, admin } = await requireAuth(request)
  if (denied || !auth || !admin) return denied!

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id = searchParams.get('id')

  if (!id) return err('id is required', 400)

  try {
    switch (action) {
      case 'delete_travel_group': {
        const { data: existing, error: loadError } = await auth.supabase
          .from('travel_groups')
          .select('id, org_id')
          .eq('id', id)
          .single()
        if (loadError) throw loadError
        const mismatch = assertOrgMatch(admin.orgId, existing?.org_id, 'Travel group')
        if (mismatch) return mismatch
        const { error } = await auth.supabase
          .from('travel_groups')
          .delete()
          .eq('id', id)
          .eq('org_id', admin.orgId)
        if (error) throw error
        return ok(null, 'Travel group deleted successfully')
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] DELETE error:', error)
    return err(error.message || 'Failed to delete travel coordination data')
  }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

interface Pagination { limit: number; offset: number }
interface GroupFilters extends Pagination { status?: string | null; groupType?: string | null; eventId?: string | null; tourId?: string | null; dateFrom?: string | null; dateTo?: string | null }

async function getGroups(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('travel_groups')
    .select('*')
    .order('arrival_date', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.groupType) query = query.eq('group_type', f.groupType)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('arrival_date', f.dateFrom)
  if (f.dateTo) query = query.lte('departure_date', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getGroupMembers(
  supabase: any,
  f: Pagination & { status?: string | null; groupType?: string | null },
  capabilities: readonly AdminCapability[],
) {
  let query = supabase
    .from('travel_group_members')
    .select(`
      *,
      travel_groups(name, group_type, department),
      staff_profiles:staff_id(first_name, last_name, email),
      venue_crew_members:crew_member_id(name, specialty),
      venue_team_members:team_member_id(name, role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.groupType) query = query.eq('travel_groups.group_type', f.groupType)

  const { data, error } = await query
  if (error) throw error
  return ok(
    projectTravelerRecords({
      rows: (data || []) as Record<string, unknown>[],
      capabilities,
    }),
  )
}

async function getFlights(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('flight_coordination')
    .select('*, travel_groups:group_id(name, group_type, department)')
    .order('departure_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('departure_time', f.dateFrom)
  if (f.dateTo) query = query.lte('departure_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getFlightPassengers(
  supabase: any,
  f: Pagination & { status?: string | null },
  capabilities: readonly AdminCapability[],
) {
  let query = supabase
    .from('flight_passenger_assignments')
    .select(`
      *,
      flight_coordination:flight_id(flight_number, airline, departure_airport, arrival_airport),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(
    ((data || []) as Record<string, unknown>[]).map((row) =>
      projectTravelerNestedRecord({ row, capabilities }),
    ),
  )
}

async function getTransportation(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('ground_transportation_coordination')
    .select('*, travel_groups:group_id(name, group_type, department), flight_coordination:flight_id(flight_number, airline)')
    .order('pickup_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('pickup_time', f.dateFrom)
  if (f.dateTo) query = query.lte('pickup_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getTransportationPassengers(
  supabase: any,
  f: Pagination & { status?: string | null },
  capabilities: readonly AdminCapability[],
) {
  let query = supabase
    .from('transportation_passenger_assignments')
    .select(`
      *,
      ground_transportation_coordination:transportation_id(transport_type, provider_name, pickup_location, dropoff_location),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(
    ((data || []) as Record<string, unknown>[]).map((row) =>
      projectTravelerNestedRecord({ row, capabilities }),
    ),
  )
}

async function getHotelAssignments(
  supabase: any,
  f: Pagination & { status?: string | null },
  capabilities: readonly AdminCapability[],
) {
  let query = supabase
    .from('hotel_room_assignments')
    .select(`
      *,
      lodging_bookings:lodging_booking_id(booking_number, lodging_providers(name)),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(
    ((data || []) as Record<string, unknown>[]).map((row) =>
      projectTravelerNestedRecord({ row, capabilities }),
    ),
  )
}

async function getTimeline(supabase: any, f: Pagination & { dateFrom?: string | null; dateTo?: string | null }) {
  let query = supabase
    .from('travel_coordination_timeline')
    .select('*, travel_groups:group_id(name, group_type)')
    .order('start_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.dateFrom) query = query.gte('start_time', f.dateFrom)
  if (f.dateTo) query = query.lte('start_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getAnalytics(supabase: any) {
  const now = new Date().toISOString()

  const [groupsRes, flightsRes, transportRes, hotelRes] = await Promise.all([
    supabase.from('travel_groups').select('id, status, coordination_status, total_members, confirmed_members'),
    supabase.from('flight_coordination').select('id, status, total_cost, booked_seats'),
    supabase.from('ground_transportation_coordination').select('id, status, total_cost, assigned_passengers'),
    supabase.from('hotel_room_assignments').select('id, check_in_status, status'),
  ])

  if (groupsRes.error) throw groupsRes.error
  if (flightsRes.error) throw flightsRes.error
  if (transportRes.error) throw transportRes.error
  if (hotelRes.error) throw hotelRes.error

  const groups = groupsRes.data || []
  const flights = flightsRes.data || []
  const transport = transportRes.data || []
  const hotel = hotelRes.data || []

  const totalTravelers = groups.reduce((sum: number, g: any) => sum + (g.total_members || 0), 0)
  const confirmedMembers = groups.reduce((sum: number, g: any) => sum + (g.confirmed_members || 0), 0)
  const arrivedGroups = groups.filter((g: any) => g.status === 'arrived').length
  const fullyCoordinated = groups.filter((g: any) => g.coordination_status === 'complete').length
  const completedFlights = flights.filter((f: any) => f.status === 'landed').length
  const completedTransport = transport.filter((t: any) => t.status === 'completed').length
  const checkedIn = hotel.filter((h: any) => h.check_in_status === 'checked_in').length
  const totalFlightCost = flights.reduce((sum: number, f: any) => sum + (f.total_cost || 0), 0)
  const totalTransportCost = transport.reduce((sum: number, t: any) => sum + (t.total_cost || 0), 0)

  const analytics = [{
    date: now.slice(0, 10),
    week: `W${Math.ceil(new Date().getDate() / 7)}`,
    month: now.slice(0, 7),
    total_groups: groups.length,
    total_travelers: totalTravelers,
    arrived_groups: arrivedGroups,
    fully_coordinated_groups: fullyCoordinated,
    total_flights: flights.length,
    total_flight_passengers: flights.reduce((sum: number, f: any) => sum + (f.booked_seats || 0), 0),
    completed_flights: completedFlights,
    total_transport_runs: transport.length,
    total_transport_passengers: transport.reduce((sum: number, t: any) => sum + (t.assigned_passengers || 0), 0),
    completed_transport: completedTransport,
    total_hotel_bookings: hotel.length,
    total_room_assignments: hotel.length,
    checked_in_guests: checkedIn,
    total_flight_cost: totalFlightCost,
    total_transport_cost: totalTransportCost,
    total_hotel_cost: 0,
    total_travel_cost: totalFlightCost + totalTransportCost,
    coordination_completion_rate: groups.length > 0 ? Math.round((fullyCoordinated / groups.length) * 100) : 0,
    arrival_success_rate: totalTravelers > 0 ? Math.round((confirmedMembers / totalTravelers) * 100) : 0,
  }]

  return ok(analytics)
}

async function getUtilization(supabase: any, f: Pagination) {
  const { data: groups, error: groupsError } = await supabase
    .from('travel_groups')
    .select('id, name, group_type, department, priority_level, total_members, confirmed_members, coordination_status, status')
    .order('priority_level', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (groupsError) throw groupsError
  if (!groups || groups.length === 0) return ok([])

  const groupIds = groups.map((g: any) => g.id)

  const [flightsRes, transportRes, hotelRes] = await Promise.all([
    supabase.from('flight_coordination').select('id, group_id, total_cost, booked_seats, total_seats'),
    supabase.from('ground_transportation_coordination').select('id, group_id, total_cost, assigned_passengers, vehicle_capacity'),
    supabase.from('hotel_room_assignments').select('id, group_member_id, travel_group_members!inner(group_id)'),
  ])

  const flights = flightsRes.data || []
  const transport = transportRes.data || []
  const hotelRaw = hotelRes.data || []

  const utilization = groups.map((g: any) => {
    const gFlights = flights.filter((f: any) => f.group_id === g.id)
    const gTransport = transport.filter((t: any) => t.group_id === g.id)
    const gHotel = hotelRaw.filter((h: any) => h.travel_group_members?.group_id === g.id)

    const flightSeatsBooked = gFlights.reduce((s: number, f: any) => s + (f.booked_seats || 0), 0)
    const flightSeatsTotal = gFlights.reduce((s: number, f: any) => s + (f.total_seats || 0), 0)
    const transportPassengers = gTransport.reduce((s: number, t: any) => s + (t.assigned_passengers || 0), 0)
    const transportCapacity = gTransport.reduce((s: number, t: any) => s + (t.vehicle_capacity || 0), 0)
    const flightCost = gFlights.reduce((s: number, f: any) => s + (f.total_cost || 0), 0)
    const transportCost = gTransport.reduce((s: number, t: any) => s + (t.total_cost || 0), 0)

    return {
      group_id: g.id,
      group_name: g.name,
      group_type: g.group_type,
      department: g.department,
      priority_level: g.priority_level,
      total_members: g.total_members,
      confirmed_members: g.confirmed_members,
      total_flights: gFlights.length,
      flight_passengers: flightSeatsBooked,
      flight_utilization_percentage: flightSeatsTotal > 0 ? Math.round((flightSeatsBooked / flightSeatsTotal) * 100) : 0,
      total_transport_runs: gTransport.length,
      transport_passengers: transportPassengers,
      transport_utilization_percentage: transportCapacity > 0 ? Math.round((transportPassengers / transportCapacity) * 100) : 0,
      total_hotel_bookings: gHotel.length,
      hotel_guests: gHotel.length,
      hotel_utilization_percentage: g.total_members > 0 ? Math.round((gHotel.length / g.total_members) * 100) : 0,
      coordination_status: g.coordination_status,
      group_status: g.status,
      total_flight_cost: flightCost,
      total_transport_cost: transportCost,
      total_hotel_cost: 0,
      total_group_cost: flightCost + transportCost,
      confirmation_rate: g.total_members > 0 ? Math.round((g.confirmed_members / g.total_members) * 100) : 0,
    }
  })

  return ok(utilization)
}
