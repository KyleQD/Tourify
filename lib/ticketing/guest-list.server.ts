import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { EmailDeliveryService } from '@/lib/services/email-delivery.service'
import { generateCredentialToken } from '@/lib/ticketing/credentials'
import {
  getDefaultAllocationReleaseAt,
  normalizeInviteEmail,
  type AdmissionSource,
  type EligibleRecipient,
  type EventTicketingWorkspaceDto,
  type TicketAllocationSummary,
  type TicketInviteSummary,
  type UnifiedAttendee,
} from '@/lib/ticketing/guest-list'
import { generateInviteToken, hashInviteToken } from '@/lib/ticketing/guest-list-token.server'
import { hasTicketingPermission, type TicketingPermissionClient } from '@/lib/ticketing/permissions'
import { notifyCompIssued, notifyTicketInvite } from '@/lib/ticketing/notifications'
import { getUpcomingAttendingEvents } from '@/lib/events/get-upcoming-attending-events'

type Db = SupabaseClient<any, 'public', any>

export class TicketingAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message)
  }
}

export interface TicketingActorAccess {
  isCreator: boolean
  canManageGuestList: boolean
  canViewAttendees: boolean
  canViewOrders: boolean
  canViewFinancials: boolean
  canScan: boolean
  canViewContact: boolean
  managerAllocationIds: string[]
  managerOnly: boolean
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ticketing request failed'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function appOrigin(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (explicit) return explicit.startsWith('http') ? explicit.replace(/\/$/, '') : `https://${explicit.replace(/\/$/, '')}`
  const vercel = (process.env.VERCEL_URL || '').trim()
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

function profileName(profile: any, fallback = 'Tourify user'): string {
  return profile?.full_name || profile?.name || profile?.username || fallback
}

async function invoke<T>(service: Db, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await service.rpc(fn, args)
  if (error) throw new TicketingAccessError(error.message, 400)
  return data as T
}

export async function expireTicketInvites(service = createServiceRoleClient() as Db) {
  return invoke<{ expired_invites: number; released_allocations: number }>(
    service,
    'ticketing_expire_invites_and_allocations',
    {},
  )
}

export async function getTicketingActorAccess(input: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
}): Promise<TicketingActorAccess> {
  const service = createServiceRoleClient() as Db
  const { data: event } = await service
    .from('events_v2')
    .select('created_by')
    .eq('id', input.eventId)
    .maybeSingle()
  if (!event) throw new TicketingAccessError('Event not found', 404)

  const [manage, attendees, orders, finances, scan, contact, overview, managers] = await Promise.all([
    hasTicketingPermission({ ...input, permission: 'manage_guestlist' }),
    hasTicketingPermission({ ...input, permission: 'view_attendees' }),
    hasTicketingPermission({ ...input, permission: 'view_orders' }),
    hasTicketingPermission({ ...input, permission: 'view_full_financials' }),
    hasTicketingPermission({ ...input, permission: 'scan_tickets' }),
    hasTicketingPermission({ ...input, permission: 'view_attendee_contact' }),
    hasTicketingPermission({ ...input, permission: 'view_overview' }),
    service
      .from('ticket_allocation_managers')
      .select('allocation_id, ticket_allocations!inner(event_id)')
      .eq('user_id', input.userId)
      .eq('ticket_allocations.event_id', input.eventId),
  ])

  const managerAllocationIds = (managers.data || []).map((row: any) => row.allocation_id)
  const isCreator = event.created_by === input.userId
  const fullAccess = Boolean(manage || attendees || orders || finances || scan || overview || isCreator)
  if (!fullAccess && managerAllocationIds.length === 0) throw new TicketingAccessError('Forbidden')

  return {
    isCreator,
    canManageGuestList: Boolean(manage || isCreator),
    canViewAttendees: Boolean(attendees || isCreator),
    canViewOrders: Boolean(orders || isCreator),
    canViewFinancials: Boolean(finances || isCreator),
    canScan: Boolean(scan || isCreator),
    canViewContact: Boolean(contact || isCreator),
    managerAllocationIds,
    managerOnly: !fullAccess && managerAllocationIds.length > 0,
  }
}

export async function requireAllocationManager(input: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
  allocationId: string
}): Promise<TicketingActorAccess> {
  const access = await getTicketingActorAccess(input)
  if (!access.canManageGuestList && !access.managerAllocationIds.includes(input.allocationId)) {
    throw new TicketingAccessError('You can only manage guest invitations in your own allocation')
  }
  return access
}

export async function loadTicketingWorkspace(input: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
}): Promise<EventTicketingWorkspaceDto> {
  const service = createServiceRoleClient() as Db
  await expireTicketInvites(service)
  const access = await getTicketingActorAccess(input)

  const [eventResult, typeResult, allocationResult, inviteResult, ticketResult, checkinResult] = await Promise.all([
    service.from('events_v2').select('id, title, start_at, timezone').eq('id', input.eventId).single(),
    service.from('ticket_types').select('id, name, visibility, access_level, quantity_available, quantity_sold, quantity_reserved, sale_end').eq('event_id', input.eventId).order('priority_order'),
    service.from('ticket_allocations').select('*').eq('event_id', input.eventId).order('created_at', { ascending: false }),
    service.from('ticket_invites').select('*').eq('event_id', input.eventId).order('created_at', { ascending: false }),
    service.from('tickets').select('id, is_complimentary, metadata').eq('event_id', input.eventId).in('status', ['valid', 'assigned', 'checked_in']),
    service.from('ticket_checkins').select('id').eq('event_id', input.eventId).eq('result', 'valid').is('reversed_at', null),
  ])

  if (eventResult.error || !eventResult.data) throw new TicketingAccessError('Event not found', 404)
  for (const result of [typeResult, allocationResult, inviteResult, ticketResult, checkinResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  let allocations = allocationResult.data || []
  let invites = inviteResult.data || []
  if (access.managerOnly) {
    const allowed = new Set(access.managerAllocationIds)
    allocations = allocations.filter((row: any) => allowed.has(row.id))
    invites = invites.filter((row: any) => allowed.has(row.allocation_id))
  }

  const allocationIds = allocations.map((row: any) => row.id)
  const { data: allManagers } = allocationIds.length
    ? await service.from('ticket_allocation_managers').select('allocation_id, user_id').in('allocation_id', allocationIds)
    : { data: [] as any[] }
  const managerIds = [...new Set((allManagers || []).map((row: any) => row.user_id))]
  const { data: profiles } = managerIds.length
    ? await service.from('profiles').select('id, full_name, name, username').in('id', managerIds)
    : { data: [] as any[] }

  const types = new Map((typeResult.data || []).map((row: any) => [row.id, row]))
  const managerByAllocation = new Map((allManagers || []).map((row: any) => [row.allocation_id, row.user_id]))
  const profileById = new Map((profiles || []).map((row: any) => [row.id, row]))
  const pendingByAllocation = new Map<string, number>()
  for (const invite of invites) {
    if (invite.status === 'pending') {
      pendingByAllocation.set(invite.allocation_id, (pendingByAllocation.get(invite.allocation_id) || 0) + 1)
    }
  }

  const allocationDtos: TicketAllocationSummary[] = allocations.map((row: any) => {
    const managerId = managerByAllocation.get(row.id) || row.account_id || ''
    const pendingCount = pendingByAllocation.get(row.id) || 0
    return {
      id: row.id,
      eventId: row.event_id,
      ticketTypeId: row.ticket_type_id,
      ticketTypeName: types.get(row.ticket_type_id)?.name || 'Admission',
      managerUserId: managerId,
      managerName: profileName(profileById.get(managerId)),
      label: row.label,
      purpose: row.purpose,
      quantityTotal: row.quantity_total,
      quantityIssued: row.quantity_issued,
      pendingCount,
      remainingCount: Math.max(row.quantity_total - row.quantity_issued - pendingCount, 0),
      releaseAt: row.release_at,
      status: row.status,
    }
  })

  const inviteDtos: TicketInviteSummary[] = invites.map((row: any) => ({
    id: row.id,
    allocationId: row.allocation_id,
    recipientUserId: row.recipient_user_id,
    recipientEmail: access.canViewContact || access.managerOnly ? row.recipient_email_normalized : null,
    recipientName: row.recipient_name,
    purpose: row.purpose,
    status: row.status,
    expiresAt: row.expires_at,
    issuedTicketId: row.issued_ticket_id,
    lastSentAt: row.last_sent_at,
    sendCount: row.send_count,
  }))

  const activeTickets = ticketResult.data || []
  const compTickets = activeTickets.filter((ticket: any) => ticket.is_complimentary)
  const paidTickets = activeTickets.filter((ticket: any) => !ticket.is_complimentary)
  const crewTickets = compTickets.filter((ticket: any) => ['staff', 'crew'].includes(ticket.metadata?.admission_source))

  return {
    event: {
      id: eventResult.data.id,
      title: eventResult.data.title,
      startAt: eventResult.data.start_at,
      timezone: eventResult.data.timezone,
    },
    permissions: { ...access },
    metrics: {
      paidAdmissions: access.canViewOrders ? paidTickets.length : null,
      complimentaryAdmissions: compTickets.length,
      pendingInvites: inviteDtos.filter((invite) => invite.status === 'pending').length,
      crewAdmissions: crewTickets.length,
      heldCapacity: allocationDtos
        .filter((allocation) => allocation.status === 'active')
        .reduce((sum, allocation) => sum + allocation.quantityTotal - allocation.quantityIssued, 0),
      checkedIn: (checkinResult.data || []).length,
    },
    ticketTypes: (typeResult.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      visibility: row.visibility,
      accessLevel: row.access_level,
      available: row.quantity_available,
      sold: row.quantity_sold,
      reserved: row.quantity_reserved,
    })),
    allocations: allocationDtos,
    invites: inviteDtos,
  }
}

export async function createAllocation(input: {
  eventId: string
  ticketTypeId: string
  managerUserId: string
  label: string
  quantity: number
  releaseAt?: string | null
  purpose: Exclude<AdmissionSource, 'paid'>
  notes?: string | null
  actorUserId: string
}) {
  const service = createServiceRoleClient() as Db
  const [{ data: event }, { data: ticketType }, { data: manager }] = await Promise.all([
    service.from('events_v2').select('start_at').eq('id', input.eventId).single(),
    service.from('ticket_types').select('sale_end').eq('id', input.ticketTypeId).single(),
    service.from('profiles').select('id').eq('id', input.managerUserId).maybeSingle(),
  ])
  if (!manager) throw new TicketingAccessError('Allocation manager must already be a Tourify user', 400)
  const releaseAt = input.releaseAt || getDefaultAllocationReleaseAt({ saleEnd: ticketType?.sale_end, eventStart: event?.start_at })
  const allocationType = input.purpose === 'artist_guest' ? 'artist' : input.purpose === 'staff' || input.purpose === 'crew' ? 'staff' : 'general'
  return invoke<any>(service, 'ticketing_create_allocation', {
    p_event_id: input.eventId,
    p_ticket_type_id: input.ticketTypeId,
    p_manager_user_id: input.managerUserId,
    p_label: input.label,
    p_quantity: input.quantity,
    p_release_at: releaseAt,
    p_allocation_type: allocationType,
    p_purpose: input.purpose,
    p_notes: input.notes || null,
    p_created_by: input.actorUserId,
  })
}

export async function resizeAllocation(input: { allocationId: string; quantity: number; releaseAt?: string | null }) {
  return invoke<any>(createServiceRoleClient() as Db, 'ticketing_resize_allocation', {
    p_allocation_id: input.allocationId,
    p_quantity: input.quantity,
    p_release_at: input.releaseAt || null,
  })
}

export async function releaseAllocation(input: { allocationId: string; cancel?: boolean }) {
  return invoke<any>(createServiceRoleClient() as Db, 'ticketing_release_allocation', {
    p_allocation_id: input.allocationId,
    p_status: input.cancel ? 'canceled' : 'released',
  })
}

async function resolveInviteRecipient(service: Db, input: { userId?: string | null; email?: string | null }) {
  const normalizedEmail = normalizeInviteEmail(input.email)
  let profile: any = null
  if (input.userId) {
    const result = await service.from('profiles').select('id, email, full_name, name, username').eq('id', input.userId).maybeSingle()
    profile = result.data
  } else if (normalizedEmail) {
    const result = await service.from('profiles').select('id, email, full_name, name, username').ilike('email', normalizedEmail).maybeSingle()
    profile = result.data
  }
  return {
    userId: profile?.id || input.userId || null,
    email: normalizeInviteEmail(profile?.email || normalizedEmail),
    name: profileName(profile, ''),
  }
}

export async function createInvite(input: {
  eventId: string
  allocationId: string
  recipientUserId?: string | null
  recipientEmail?: string | null
  recipientName?: string | null
  purpose: Exclude<AdmissionSource, 'paid'>
  expiresAt: string
  sourceType?: string | null
  sourceId?: string | null
  actorUserId: string
}) {
  const service = createServiceRoleClient() as Db
  const recipient = await resolveInviteRecipient(service, { userId: input.recipientUserId, email: input.recipientEmail })
  const token = generateInviteToken()
  const invite = await invoke<any>(service, 'ticketing_create_invite', {
    p_event_id: input.eventId,
    p_allocation_id: input.allocationId,
    p_recipient_user_id: recipient.userId,
    p_recipient_email: recipient.email,
    p_recipient_name: input.recipientName || recipient.name || null,
    p_purpose: input.purpose,
    p_token_hash: hashInviteToken(token),
    p_expires_at: input.expiresAt,
    p_source_type: input.sourceType || null,
    p_source_id: input.sourceId || null,
    p_invited_by: input.actorUserId,
  })
  const delivery = await deliverInvite({ service, invite, token })
  return { invite, token, delivery }
}

async function deliverInvite(input: { service: Db; invite: any; token: string }) {
  const [{ data: event }, { data: ticketType }, { data: inviter }] = await Promise.all([
    input.service.from('events_v2').select('title, start_at').eq('id', input.invite.event_id).single(),
    input.service.from('ticket_types').select('name').eq('id', input.invite.ticket_type_id).single(),
    input.invite.invited_by
      ? input.service.from('profiles').select('full_name, name, username').eq('id', input.invite.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const url = `${appOrigin()}/tickets/invite/${input.token}`
  if (input.invite.recipient_user_id) {
    await notifyTicketInvite({
      userId: input.invite.recipient_user_id,
      inviteId: input.invite.id,
      eventTitle: event?.title,
      eventId: input.invite.event_id,
      inviteUrl: url,
    })
  }
  if (!input.invite.recipient_email_normalized) return { email: 'not_available', copyLink: url }

  const title = escapeHtml(event?.title || 'an event')
  const typeName = escapeHtml(ticketType?.name || 'admission')
  const inviterName = escapeHtml(profileName(inviter, 'An event organizer'))
  const result = await EmailDeliveryService.sendNotificationEmail({
    to: input.invite.recipient_email_normalized,
    subject: `Your invitation to ${event?.title || 'an event'}`,
    html: `<p>${inviterName} invited you to <strong>${title}</strong>.</p><p>Your ${typeName} is reserved until ${escapeHtml(new Date(input.invite.expires_at).toLocaleString())}.</p><p><a href="${escapeHtml(url)}">Review and accept invitation</a></p><p>A Tourify account is required. Your ticket and QR code are created only after you accept.</p>`,
    text: `${profileName(inviter, 'An event organizer')} invited you to ${event?.title || 'an event'}. Review and accept: ${url}`,
  })
  return { email: result.success ? 'sent' : 'failed', error: result.error, copyLink: url }
}

export async function resendInvite(input: { inviteId: string }) {
  const service = createServiceRoleClient() as Db
  const token = generateInviteToken()
  const invite = await invoke<any>(service, 'ticketing_rotate_invite_token', {
    p_invite_id: input.inviteId,
    p_token_hash: hashInviteToken(token),
  })
  return { invite, token, delivery: await deliverInvite({ service, invite, token }) }
}

export async function revokeInvite(input: { inviteId: string; actorUserId: string; doorOverride?: boolean }) {
  return invoke<any>(createServiceRoleClient() as Db, 'ticketing_revoke_invite', {
    p_invite_id: input.inviteId,
    p_actor_user_id: input.actorUserId,
    p_door_override: Boolean(input.doorOverride),
  })
}

export async function replaceInvite(input: {
  inviteId: string
  recipientUserId?: string | null
  recipientEmail?: string | null
  recipientName?: string | null
  expiresAt: string
  actorUserId: string
  doorOverride?: boolean
}) {
  const service = createServiceRoleClient() as Db
  const recipient = await resolveInviteRecipient(service, { userId: input.recipientUserId, email: input.recipientEmail })
  const token = generateInviteToken()
  const invite = await invoke<any>(service, 'ticketing_replace_invite', {
    p_invite_id: input.inviteId,
    p_recipient_user_id: recipient.userId,
    p_recipient_email: recipient.email,
    p_recipient_name: input.recipientName || recipient.name || null,
    p_token_hash: hashInviteToken(token),
    p_expires_at: input.expiresAt,
    p_actor_user_id: input.actorUserId,
    p_door_override: Boolean(input.doorOverride),
  })
  return { invite, token, delivery: await deliverInvite({ service, invite, token }) }
}

export async function getInvitePreview(token: string) {
  const service = createServiceRoleClient() as Db
  await expireTicketInvites(service)
  const { data: invite } = await service
    .from('ticket_invites')
    .select('id, event_id, ticket_type_id, recipient_email_normalized, recipient_name, purpose, status, expires_at, invited_by')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle()
  if (!invite) throw new TicketingAccessError('Invitation not found', 404)
  const [{ data: event }, { data: type }, { data: inviter }] = await Promise.all([
    service.from('events_v2').select('title, start_at, timezone').eq('id', invite.event_id).single(),
    service.from('ticket_types').select('name').eq('id', invite.ticket_type_id).single(),
    invite.invited_by
      ? service.from('profiles').select('full_name, name, username').eq('id', invite.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const [local, domain] = String(invite.recipient_email_normalized || '').split('@')
  return {
    id: invite.id,
    event,
    ticketType: type?.name || 'Admission',
    inviterName: profileName(inviter, 'Event organizer'),
    recipientName: invite.recipient_name,
    recipientEmailHint: local && domain ? `${local.slice(0, 2)}***@${domain}` : null,
    purpose: invite.purpose,
    status: invite.status,
    expiresAt: invite.expires_at,
  }
}

export async function acceptInvite(input: { token: string; userId: string; verifiedEmail: string | null }) {
  const service = createServiceRoleClient() as Db
  await expireTicketInvites(service)
  const result = await invoke<any>(service, 'ticketing_accept_invite', {
    p_token_hash: hashInviteToken(input.token),
    p_user_id: input.userId,
    p_verified_email: normalizeInviteEmail(input.verifiedEmail),
    p_credential_token: generateCredentialToken(),
  })
  if (result?.ticket_id) {
    const { data: event } = result.event_id
      ? await service.from('events_v2').select('title').eq('id', result.event_id).maybeSingle()
      : { data: null }
    await notifyCompIssued({
      userId: input.userId,
      ticketId: result.ticket_id,
      eventId: result.event_id,
      eventTitle: event?.title,
    })
  }
  return result
}

export async function declineInvite(input: { token: string; userId: string; verifiedEmail: string | null }) {
  return invoke<any>(createServiceRoleClient() as Db, 'ticketing_decline_invite', {
    p_token_hash: hashInviteToken(input.token),
    p_user_id: input.userId,
    p_verified_email: normalizeInviteEmail(input.verifiedEmail),
  })
}

export async function loadTicketWallet(input: { userId: string; ticketId?: string | null }) {
  const service = createServiceRoleClient() as Db
  if (input.ticketId) {
    const { data: ticket, error } = await service
      .from('tickets')
      .select(`
        *,
        ticket_types(id, name, category, description),
        events_v2(id, title, start_at, end_at, venue_id),
        ticket_credentials!inner(id, token, status, issued_at)
      `)
      .eq('id', input.ticketId)
      .eq('owner_user_id', input.userId)
      .eq('ticket_credentials.status', 'active')
      .maybeSingle()
    if (error || !ticket) throw new TicketingAccessError('Ticket not found', 404)
    return { ticket }
  }

  const { data: tickets, error } = await service
    .from('tickets')
    .select(`
      id, status, is_complimentary, issued_at, event_id, ticket_type_id, order_id, metadata,
      ticket_types(id, name, category),
      events_v2(id, title, start_at),
      ticket_credentials(token, status)
    `)
    .eq('owner_user_id', input.userId)
    .in('status', ['valid', 'assigned', 'transferred', 'checked_in'])
    .order('issued_at', { ascending: false })
  if (error) throw new Error(error.message)

  return {
    tickets: (tickets || []).map((ticket: any) => ({
      ...ticket,
      qr_token: (ticket.ticket_credentials || []).find((credential: any) => credential.status === 'active')?.token || null,
      ticket_credentials: undefined,
    })),
  }
}

export async function loadUpcomingEventsForUser(input: { userId: string; limit?: number }) {
  return getUpcomingAttendingEvents({
    supabase: createServiceRoleClient(),
    userId: input.userId,
    limit: input.limit,
  })
}

export async function listEligibleRecipients(input: { eventId: string; kind: 'artist' | 'staff' | 'user'; query?: string }) {
  const service = createServiceRoleClient() as Db
  const recipients: EligibleRecipient[] = []
  if (input.kind === 'user') {
    const query = input.query?.trim()
    if (!query || query.length < 2) return recipients
    const safe = query.replace(/[%(),.]/g, ' ').trim()
    if (!safe) return recipients
    const { data } = await service
      .from('profiles')
      .select('id, full_name, name, username, email, avatar_url')
      .or(`full_name.ilike.%${safe}%,name.ilike.%${safe}%,username.ilike.%${safe}%,email.ilike.%${safe}%`)
      .limit(20)
    return (data || []).map((profile: any) => ({
      userId: profile.id,
      name: profileName(profile),
      email: profile.email,
      avatarUrl: profile.avatar_url,
      kind: 'user' as const,
      roleLabel: null,
      sourceId: null,
    }))
  }

  if (input.kind === 'artist') {
    const { data: bookings } = await service
      .from('booking_requests')
      .select('id, artist_user_id, artist_id')
      .eq('event_v2_id', input.eventId)
      .eq('status', 'accepted')
    const ids = [...new Set((bookings || []).map((row: any) => row.artist_user_id || row.artist_id).filter(Boolean))]
    const { data: profiles } = ids.length
      ? await service.from('profiles').select('id, full_name, name, username, email, avatar_url').in('id', ids)
      : { data: [] as any[] }
    const bookingByUser = new Map((bookings || []).map((row: any) => [row.artist_user_id || row.artist_id, row.id]))
    return (profiles || []).map((profile: any) => ({
      userId: profile.id,
      name: profileName(profile),
      email: profile.email,
      avatarUrl: profile.avatar_url,
      kind: 'artist' as const,
      roleLabel: 'Booked artist',
      sourceId: bookingByUser.get(profile.id) || null,
    }))
  }

  const { data: assignments } = await service
    .from('employment_assignments')
    .select('id, user_id, role_title')
    .eq('event_v2_id', input.eventId)
    .in('status', ['confirmed', 'active'])
  const ids = [...new Set((assignments || []).map((row: any) => row.user_id).filter(Boolean))]
  const { data: profiles } = ids.length
    ? await service.from('profiles').select('id, full_name, name, username, email, avatar_url').in('id', ids)
    : { data: [] as any[] }
  const assignmentByUser = new Map((assignments || []).map((row: any) => [row.user_id, row]))
  return (profiles || []).map((profile: any) => ({
    userId: profile.id,
    name: profileName(profile),
    email: profile.email,
    avatarUrl: profile.avatar_url,
    kind: 'staff' as const,
    roleLabel: assignmentByUser.get(profile.id)?.role_title || 'Crew',
    sourceId: assignmentByUser.get(profile.id)?.id || null,
  }))
}

export async function listUnifiedAttendees(input: { eventId: string; includeContact: boolean }): Promise<UnifiedAttendee[]> {
  const service = createServiceRoleClient() as Db
  const [{ data: tickets, error }, { data: checkins }] = await Promise.all([
    service
      .from('tickets')
      .select('id, owner_user_id, owner_name, owner_email, status, is_complimentary, metadata, ticket_types(name)')
      .eq('event_id', input.eventId)
      .order('created_at', { ascending: false }),
    service.from('ticket_checkins').select('ticket_id, created_at').eq('event_id', input.eventId).eq('result', 'valid').is('reversed_at', null),
  ])
  if (error) throw new Error(error.message)
  const checkinByTicket = new Map((checkins || []).map((row: any) => [row.ticket_id, row.created_at]))
  return (tickets || []).map((ticket: any) => {
    const rawSource = ticket.is_complimentary ? ticket.metadata?.admission_source || 'guest' : 'paid'
    const source: AdmissionSource = ['paid', 'guest', 'artist_guest', 'staff', 'crew'].includes(rawSource) ? rawSource : 'guest'
    return {
      id: ticket.id,
      userId: ticket.owner_user_id,
      name: ticket.owner_name || 'Ticket holder',
      email: input.includeContact ? ticket.owner_email : null,
      ticketTypeName: ticket.ticket_types?.name || 'Admission',
      source,
      status: ticket.status,
      checkedIn: checkinByTicket.has(ticket.id),
      checkedInAt: checkinByTicket.get(ticket.id) || null,
    }
  })
}

export function ticketingErrorResponse(error: unknown) {
  const status = error instanceof TicketingAccessError
    ? error.status
    : error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: number }).status) || 500
      : 500
  return { status, message: safeMessage(error) }
}
