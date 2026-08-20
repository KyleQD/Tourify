export const PROMOTER_PROGRAM_STATUSES = [
  'draft',
  'scheduled',
  'open',
  'paused',
  'closed',
  'cancelled',
] as const

export type PromoterProgramStatus = (typeof PROMOTER_PROGRAM_STATUSES)[number]

export const PROMOTER_MEMBERSHIP_STATUSES = [
  'approved',
  'suspended',
  'revoked',
  'completed',
] as const

export type PromoterMembershipStatus = (typeof PROMOTER_MEMBERSHIP_STATUSES)[number]

export const PROMOTER_APPLICATION_STATUSES = [
  'invited',
  'applied',
  'approved',
  'rejected',
  'withdrawn',
  'expired',
] as const

export type PromoterApplicationStatus = (typeof PROMOTER_APPLICATION_STATUSES)[number]

const PROGRAM_TRANSITIONS: Readonly<Record<PromoterProgramStatus, readonly PromoterProgramStatus[]>> = {
  draft: ['scheduled', 'open', 'cancelled'],
  scheduled: ['open', 'cancelled'],
  open: ['paused', 'closed'],
  paused: ['open', 'closed'],
  closed: [],
  cancelled: [],
}

const MEMBERSHIP_TRANSITIONS: Readonly<Record<PromoterMembershipStatus, readonly PromoterMembershipStatus[]>> = {
  approved: ['suspended', 'revoked', 'completed'],
  suspended: ['approved', 'revoked'],
  revoked: [],
  completed: [],
}

const APPLICATION_TRANSITIONS: Readonly<Record<PromoterApplicationStatus, readonly PromoterApplicationStatus[]>> = {
  invited: ['approved', 'rejected', 'expired'],
  applied: ['approved', 'rejected', 'withdrawn'],
  approved: [],
  rejected: [],
  withdrawn: [],
  expired: [],
}

export function canTransitionProgram(
  from: PromoterProgramStatus,
  to: PromoterProgramStatus,
): boolean {
  return PROGRAM_TRANSITIONS[from].includes(to)
}

export function canTransitionMembership(
  from: PromoterMembershipStatus,
  to: PromoterMembershipStatus,
): boolean {
  return MEMBERSHIP_TRANSITIONS[from].includes(to)
}

export function assertProgramTransition(from: PromoterProgramStatus, to: PromoterProgramStatus): void {
  if (!canTransitionProgram(from, to)) {
    throw new Error(`Invalid promoter program transition: ${from} -> ${to}`)
  }
}

export function assertMembershipTransition(
  from: PromoterMembershipStatus,
  to: PromoterMembershipStatus,
): void {
  if (!canTransitionMembership(from, to)) {
    throw new Error(`Invalid promoter membership transition: ${from} -> ${to}`)
  }
}

export function canTransitionApplication(
  from: PromoterApplicationStatus,
  to: PromoterApplicationStatus,
): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to)
}

export function assertApplicationTransition(
  from: PromoterApplicationStatus,
  to: PromoterApplicationStatus,
): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Invalid promoter application transition: ${from} -> ${to}`)
  }
}

export function createCommissionIdempotencyKey(input: {
  paymentOrSaleId: string
  ticketOrLineItemId: string
  membershipId: string
  entryType: 'earned' | 'refund_reversal' | 'chargeback_reversal' | 'dispute_reinstatement' | 'admin_adjustment'
}): string {
  return `promoter_commission:${input.paymentOrSaleId}:${input.ticketOrLineItemId}:${input.membershipId}:${input.entryType}`
}
