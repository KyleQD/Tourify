export type AdmissionSource = 'paid' | 'guest' | 'artist_guest' | 'staff' | 'crew'
export type TicketInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
export type TicketAllocationStatus = 'active' | 'released' | 'canceled'

export interface TicketAllocationSummary {
  id: string
  eventId: string
  ticketTypeId: string
  ticketTypeName: string
  managerUserId: string
  managerName: string
  label: string
  purpose: Exclude<AdmissionSource, 'paid'>
  quantityTotal: number
  quantityIssued: number
  pendingCount: number
  remainingCount: number
  releaseAt: string
  status: TicketAllocationStatus
}

export interface TicketInviteSummary {
  id: string
  allocationId: string
  recipientUserId: string | null
  recipientEmail: string | null
  recipientName: string | null
  purpose: Exclude<AdmissionSource, 'paid'>
  status: TicketInviteStatus
  expiresAt: string
  issuedTicketId: string | null
  lastSentAt: string | null
  sendCount: number
}

export interface EligibleRecipient {
  userId: string
  name: string
  email: string | null
  avatarUrl: string | null
  kind: 'artist' | 'staff' | 'user'
  roleLabel: string | null
  sourceId: string | null
}

export interface UnifiedAttendee {
  id: string
  userId: string | null
  name: string
  email: string | null
  ticketTypeName: string
  source: AdmissionSource
  status: string
  checkedIn: boolean
  checkedInAt: string | null
}

export interface EventTicketingWorkspaceDto {
  event: {
    id: string
    title: string
    startAt: string | null
    timezone: string
  }
  permissions: {
    isCreator: boolean
    canManageGuestList: boolean
    canViewAttendees: boolean
    canViewOrders: boolean
    canViewFinancials: boolean
    canScan: boolean
    canViewContact: boolean
    managerOnly: boolean
  }
  metrics: {
    paidAdmissions: number | null
    complimentaryAdmissions: number
    pendingInvites: number
    crewAdmissions: number
    heldCapacity: number
    checkedIn: number
  }
  ticketTypes: Array<{
    id: string
    name: string
    visibility: string
    accessLevel: string
    available: number
    sold: number
    reserved: number
  }>
  allocations: TicketAllocationSummary[]
  invites: TicketInviteSummary[]
}

export function normalizeInviteEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() || ''
  return normalized || null
}

export function getDefaultAllocationReleaseAt(input: {
  saleEnd?: string | null
  eventStart?: string | null
  now?: Date
}): string {
  const now = input.now ?? new Date()
  const saleEnd = input.saleEnd ? new Date(input.saleEnd) : null
  if (saleEnd && Number.isFinite(saleEnd.getTime()) && saleEnd > now) return saleEnd.toISOString()

  const eventStart = input.eventStart ? new Date(input.eventStart) : null
  if (eventStart && Number.isFinite(eventStart.getTime())) {
    const cutoff = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000)
    if (cutoff > now) return cutoff.toISOString()
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

export function isUnifiedGuestListEnabled(): boolean {
  return process.env.UNIFIED_GUEST_LIST_ENABLED !== 'false'
}
