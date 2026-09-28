/**
 * Notify involved parties when travel arrangements change
 * (flights, lodging, ground transport — delays, cancellations, material field edits).
 */

import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { generalNotificationTarget } from '@/lib/notifications/notification-target'
import { sendSMSNotification } from '@/lib/services/notification-channels'
import { sendLogisticsNotifications } from '@/lib/logistics/notifications-adapter'
import {
  diffMaterialFields,
  resolveFlightNotifyType,
  resolveLodgingNotifyType,
  type TravelChangeKind,
} from '@/lib/logistics/travel-change-helpers'

export type { TravelChangeKind }
export {
  diffMaterialFields,
  resolveFlightNotifyType,
  resolveLodgingNotifyType,
} from '@/lib/logistics/travel-change-helpers'

const FLIGHT_MATERIAL_FIELDS = [
  'flight_number',
  'airline',
  'departure_airport',
  'arrival_airport',
  'departure_time',
  'arrival_time',
  'status',
  'booking_reference',
  'gate',
  'terminal',
] as const

const LODGING_MATERIAL_FIELDS = [
  'check_in_date',
  'check_out_date',
  'check_in_time',
  'check_out_time',
  'primary_guest_name',
  'confirmation_number',
  'status',
  'provider_id',
  'room_type_id',
  'rooms_booked',
] as const

const TRANSPORT_MATERIAL_FIELDS = [
  'status',
  'pickup_location',
  'dropoff_location',
  'pickup_time',
  'estimated_dropoff_time',
  'driver_name',
  'driver_phone',
  'vehicle_plate',
] as const

function titleForType(type: TravelChangeKind): string {
  switch (type) {
    case 'flight_delayed':
      return 'Flight delayed'
    case 'flight_cancelled':
      return 'Flight cancelled'
    case 'flight_changed':
      return 'Flight updated'
    case 'lodging_cancelled':
      return 'Hotel reservation cancelled'
    case 'lodging_changed':
      return 'Hotel reservation updated'
    case 'transport_changed':
      return 'Transport updated'
    default:
      return 'Travel arrangement updated'
  }
}

async function resolveOrgAdminUserIds(
  supabase: any,
  eventId?: string | null,
  tourId?: string | null,
): Promise<string[]> {
  const ids = new Set<string>()

  if (eventId) {
    const { data: event } = await supabase
      .from('events_v2')
      .select('created_by, org_id')
      .eq('id', eventId)
      .maybeSingle()
    if (event?.created_by) ids.add(String(event.created_by))
    if (event?.org_id) {
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, role')
        .eq('org_id', event.org_id)
        .in('role', ['owner', 'admin', 'organizer'])
      for (const row of members || []) {
        if (row.user_id) ids.add(String(row.user_id))
      }
    }
  }

  if (tourId) {
    const { data: tour } = await supabase
      .from('tours')
      .select('created_by, org_id, owner_id')
      .eq('id', tourId)
      .maybeSingle()
    if (tour?.created_by) ids.add(String(tour.created_by))
    if (tour?.owner_id) ids.add(String(tour.owner_id))
    if (tour?.org_id) {
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, role')
        .eq('org_id', tour.org_id)
        .in('role', ['owner', 'admin', 'organizer'])
      for (const row of members || []) {
        if (row.user_id) ids.add(String(row.user_id))
      }
    }
  }

  return Array.from(ids)
}

async function resolveFlightPassengerUserIds(supabase: any, flightId: string): Promise<string[]> {
  const { data: assignments } = await supabase
    .from('flight_passenger_assignments')
    .select('group_member_id, travel_group_members(user_id)')
    .eq('flight_id', flightId)

  const ids: string[] = []
  for (const row of assignments || []) {
    const member = Array.isArray(row.travel_group_members)
      ? row.travel_group_members[0]
      : row.travel_group_members
    if (member?.user_id) ids.push(String(member.user_id))
  }
  return ids
}

async function resolveTransportPassengerUserIds(
  supabase: any,
  transportId: string,
): Promise<string[]> {
  const { data: assignments } = await supabase
    .from('transportation_passenger_assignments')
    .select('group_member_id, travel_group_members(user_id)')
    .eq('transportation_id', transportId)

  const ids: string[] = []
  for (const row of assignments || []) {
    const member = Array.isArray(row.travel_group_members)
      ? row.travel_group_members[0]
      : row.travel_group_members
    if (member?.user_id) ids.push(String(member.user_id))
  }
  return ids
}

async function resolveLinkedTransportPartiesForFlight(
  supabase: any,
  flight: { id: string; event_id?: string | null; tour_id?: string | null; departure_time?: string | null },
): Promise<{ userIds: string[]; driverPhones: string[] }> {
  const userIds = new Set<string>()
  const driverPhones = new Set<string>()

  let query = supabase
    .from('ground_transportation_coordination')
    .select('id, driver_phone, event_id, tour_id, pickup_time, status')
    .neq('status', 'cancelled')

  if (flight.event_id) query = query.eq('event_id', flight.event_id)
  else if (flight.tour_id) query = query.eq('tour_id', flight.tour_id)
  else return { userIds: [], driverPhones: [] }

  const { data: segments } = await query
  const flightDay = flight.departure_time ? String(flight.departure_time).slice(0, 10) : null

  for (const segment of segments || []) {
    if (flightDay && segment.pickup_time && String(segment.pickup_time).slice(0, 10) !== flightDay)
      continue
    if (segment.driver_phone) driverPhones.add(String(segment.driver_phone))
    const passengers = await resolveTransportPassengerUserIds(supabase, segment.id)
    for (const id of passengers) userIds.add(id)
  }

  return { userIds: Array.from(userIds), driverPhones: Array.from(driverPhones) }
}

async function resolveLodgingGuestUserIds(supabase: any, bookingId: string): Promise<string[]> {
  const { data: guests } = await supabase
    .from('lodging_guest_assignments')
    .select('assigned_user_id, team_member_id, venue_team_members(user_id)')
    .eq('booking_id', bookingId)

  const ids = new Set<string>()
  for (const row of guests || []) {
    if (row.assigned_user_id) ids.add(String(row.assigned_user_id))
    const team = Array.isArray(row.venue_team_members)
      ? row.venue_team_members[0]
      : row.venue_team_members
    if (team?.user_id) ids.add(String(team.user_id))
  }

  const { data: roomAssignments } = await supabase
    .from('hotel_room_assignments')
    .select('group_member_id, travel_group_members(user_id)')
    .eq('lodging_booking_id', bookingId)

  for (const row of roomAssignments || []) {
    const member = Array.isArray(row.travel_group_members)
      ? row.travel_group_members[0]
      : row.travel_group_members
    if (member?.user_id) ids.add(String(member.user_id))
  }

  return Array.from(ids)
}

async function notifyUsers(args: {
  actorUserId: string
  userIds: string[]
  type: TravelChangeKind
  title: string
  content: string
  link: string
  metadata?: Record<string, unknown>
}): Promise<string[]> {
  const unique = Array.from(new Set(args.userIds.filter(Boolean)))
  const result = await sendLogisticsNotifications({
    actorUserId: args.actorUserId,
    recipients: unique.map((userId) => ({ userId, isAuthorized: true })),
    payload: {
      type: args.type,
      title: args.title,
      message: args.content,
      link: args.link,
      metadata: args.metadata,
      sourceType: 'travel',
      sourceId: String(args.metadata?.source_id || ''),
    },
    notify: async (input) => {
      const batch = (input.userIds as string[]).map((userId) => ({
        userId,
        type: input.type as string,
        title: input.title as string,
        content: input.message as string,
        priority: 'high' as const,
        ...generalNotificationTarget(userId),
        metadata: {
          ...(input.metadata || {}),
          link: input.link,
        },
        relatedContentId: String(args.metadata?.source_id || ''),
        relatedContentType: 'travel',
      }))
      return OptimizedNotificationService.createBatchNotifications(batch)
    },
  })
  return result.sentTo
}

async function notifyDriverPhones(phones: string[], message: string): Promise<void> {
  for (const phone of phones) {
    if (!phone?.trim()) continue
    try {
      await sendSMSNotification({ to: phone.trim(), body: message })
    } catch (error) {
      console.warn('[travel-change-notify] SMS to driver failed', error)
    }
  }
}

export async function notifyFlightChange(args: {
  supabase: any
  actorUserId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
}): Promise<{ sentTo: string[]; changedFields: string[] }> {
  const changedFields = diffMaterialFields(args.before, args.after, FLIGHT_MATERIAL_FIELDS)
  if (changedFields.length === 0) return { sentTo: [], changedFields: [] }

  const type = resolveFlightNotifyType(String(args.after.status || args.before.status || ''))
  const flightId = String(args.after.id || args.before.id)
  const label = `${args.after.airline || args.before.airline || ''} ${args.after.flight_number || args.before.flight_number || ''}`.trim()
  const changeSummary = changedFields.join(', ')
  const title = titleForType(type)
  const content = `${label || 'Flight'} was updated (${changeSummary}).`

  const adminIds = await resolveOrgAdminUserIds(
    args.supabase,
    (args.after.event_id || args.before.event_id) as string | null,
    (args.after.tour_id || args.before.tour_id) as string | null,
  )
  const passengerIds = await resolveFlightPassengerUserIds(args.supabase, flightId)
  const assignedBy = args.after.assigned_by || args.before.assigned_by
  const transport = await resolveLinkedTransportPartiesForFlight(args.supabase, {
    id: flightId,
    event_id: (args.after.event_id || args.before.event_id) as string | null,
    tour_id: (args.after.tour_id || args.before.tour_id) as string | null,
    departure_time: (args.after.departure_time || args.before.departure_time) as string | null,
  })

  const userIds = [
    ...adminIds,
    ...passengerIds,
    ...transport.userIds,
    ...(assignedBy ? [String(assignedBy)] : []),
  ]

  const sentTo = await notifyUsers({
    actorUserId: args.actorUserId,
    userIds,
    type,
    title,
    content,
    link: '/admin/dashboard/logistics?tab=accommodations',
    metadata: {
      source_id: flightId,
      source_type: 'flight_coordination',
      changed_fields: changedFields,
      status: args.after.status,
    },
  })

  if (transport.driverPhones.length > 0)
    await notifyDriverPhones(transport.driverPhones, `${title}: ${content}`)

  return { sentTo, changedFields }
}

export async function notifyLodgingChange(args: {
  supabase: any
  actorUserId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
}): Promise<{ sentTo: string[]; changedFields: string[] }> {
  const changedFields = diffMaterialFields(args.before, args.after, LODGING_MATERIAL_FIELDS)
  if (changedFields.length === 0) return { sentTo: [], changedFields: [] }

  const type = resolveLodgingNotifyType(String(args.after.status || args.before.status || ''))
  const bookingId = String(args.after.id || args.before.id)
  const guest = String(args.after.primary_guest_name || args.before.primary_guest_name || 'Guest')
  const confirmation = String(args.after.confirmation_number || args.before.confirmation_number || '')
  const title = titleForType(type)
  const content = `Hotel for ${guest}${confirmation ? ` (${confirmation})` : ''} was updated (${changedFields.join(', ')}).`

  const adminIds = await resolveOrgAdminUserIds(
    args.supabase,
    (args.after.event_id || args.before.event_id) as string | null,
    (args.after.tour_id || args.before.tour_id) as string | null,
  )
  const guestIds = await resolveLodgingGuestUserIds(args.supabase, bookingId)

  // Transportation parties linked to same event/tour around check-in day
  const transport = await resolveLinkedTransportPartiesForFlight(args.supabase, {
    id: bookingId,
    event_id: (args.after.event_id || args.before.event_id) as string | null,
    tour_id: (args.after.tour_id || args.before.tour_id) as string | null,
    departure_time: (args.after.check_in_date || args.before.check_in_date) as string | null,
  })

  const sentTo = await notifyUsers({
    actorUserId: args.actorUserId,
    userIds: [...adminIds, ...guestIds, ...transport.userIds],
    type,
    title,
    content,
    link: '/admin/dashboard/logistics?tab=accommodations',
    metadata: {
      source_id: bookingId,
      source_type: 'lodging_bookings',
      changed_fields: changedFields,
      status: args.after.status,
    },
  })

  if (transport.driverPhones.length > 0)
    await notifyDriverPhones(transport.driverPhones, `${title}: ${content}`)

  return { sentTo, changedFields }
}

export async function notifyTransportChange(args: {
  supabase: any
  actorUserId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
}): Promise<{ sentTo: string[]; changedFields: string[] }> {
  const changedFields = diffMaterialFields(args.before, args.after, TRANSPORT_MATERIAL_FIELDS)
  if (changedFields.length === 0) return { sentTo: [], changedFields: [] }

  const transportId = String(args.after.id || args.before.id)
  const title = titleForType('transport_changed')
  const route = `${args.after.pickup_location || args.before.pickup_location || '?'} → ${args.after.dropoff_location || args.before.dropoff_location || '?'}`
  const content = `Transport ${route} was updated (${changedFields.join(', ')}).`

  const adminIds = await resolveOrgAdminUserIds(
    args.supabase,
    (args.after.event_id || args.before.event_id) as string | null,
    (args.after.tour_id || args.before.tour_id) as string | null,
  )
  const passengerIds = await resolveTransportPassengerUserIds(args.supabase, transportId)
  const assignedBy = args.after.assigned_by || args.before.assigned_by
  const driverPhone = String(args.after.driver_phone || args.before.driver_phone || '')

  const sentTo = await notifyUsers({
    actorUserId: args.actorUserId,
    userIds: [...adminIds, ...passengerIds, ...(assignedBy ? [String(assignedBy)] : [])],
    type: 'transport_changed',
    title,
    content,
    link: '/admin/dashboard/logistics?tab=transportation',
    metadata: {
      source_id: transportId,
      source_type: 'ground_transportation_coordination',
      changed_fields: changedFields,
      status: args.after.status,
    },
  })

  if (driverPhone) await notifyDriverPhones([driverPhone], `${title}: ${content}`)

  return { sentTo, changedFields }
}
