/**
 * Shared logistics status vocabulary.
 * Domains keep native DB statuses; UI maps through these helpers.
 */

export type LogisticsOperationalStatus =
  | 'draft'
  | 'requested'
  | 'quoted'
  | 'planned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'issue'

export type LogisticsApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'

export type LogisticsAssignmentResponse =
  | 'unassigned'
  | 'pending'
  | 'acknowledged'
  | 'declined'
  | 'completed'

const OPERATIONAL_ALIASES: Record<string, LogisticsOperationalStatus> = {
  draft: 'draft',
  pending: 'draft',
  requested: 'requested',
  quoted: 'quoted',
  held: 'quoted',
  scheduled: 'planned',
  reserved: 'planned',
  planned: 'planned',
  transport_arranged: 'planned',
  confirmed: 'confirmed',
  booked: 'confirmed',
  ordered: 'confirmed',
  approved: 'confirmed',
  fulfilled: 'confirmed',
  sourcing: 'planned',
  partial: 'in_progress',
  en_route: 'in_progress',
  boarding: 'in_progress',
  in_flight: 'in_progress',
  in_transit: 'in_progress',
  checked_in: 'in_progress',
  delivered: 'in_progress',
  deployed: 'in_progress',
  served: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  landed: 'completed',
  arrived: 'completed',
  checked_out: 'completed',
  returned: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  delayed: 'issue',
  damaged: 'issue',
  lost: 'issue',
  no_show: 'issue',
  unavailable: 'issue',
  issue: 'issue',
}

const TERMINAL_OPERATIONAL = new Set<LogisticsOperationalStatus>([
  'completed',
  'cancelled',
])

export function mapToOperationalStatus(raw: string | null | undefined): LogisticsOperationalStatus {
  if (!raw) return 'draft'
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return OPERATIONAL_ALIASES[key] ?? 'draft'
}

export function isTerminalOperationalStatus(status: LogisticsOperationalStatus): boolean {
  return TERMINAL_OPERATIONAL.has(status)
}

export function requiresReapprovalOnChange(args: {
  previousStatus: string | null | undefined
  isCriticalFieldChanged: boolean
}): boolean {
  const mapped = mapToOperationalStatus(args.previousStatus)
  if (!args.isCriticalFieldChanged) return false
  return mapped === 'confirmed' || mapped === 'in_progress' || mapped === 'completed'
}

export function mapApprovalStatus(raw: string | null | undefined): LogisticsApprovalStatus {
  if (!raw) return 'not_required'
  const key = raw.trim().toLowerCase()
  if (key === 'pending' || key === 'awaiting') return 'pending'
  if (key === 'approved' || key === 'accepted') return 'approved'
  if (key === 'changes_requested' || key === 'needs_changes') return 'changes_requested'
  if (key === 'rejected' || key === 'declined') return 'rejected'
  if (key === 'not_required' || key === 'none') return 'not_required'
  return 'pending'
}

export function mapAssignmentResponse(raw: string | null | undefined): LogisticsAssignmentResponse {
  if (!raw) return 'unassigned'
  const key = raw.trim().toLowerCase()
  if (key === 'pending' || key === 'assigned') return 'pending'
  if (key === 'acknowledged' || key === 'acked' || key === 'confirmed') return 'acknowledged'
  if (key === 'declined' || key === 'rejected') return 'declined'
  if (key === 'completed' || key === 'done') return 'completed'
  if (key === 'unassigned' || key === 'none') return 'unassigned'
  return 'pending'
}

export function readinessLabelForOperational(status: LogisticsOperationalStatus): string {
  if (status === 'completed') return 'Ready'
  if (status === 'confirmed' || status === 'in_progress') return 'In Progress'
  if (status === 'issue') return 'At Risk'
  if (status === 'cancelled') return 'Cancelled'
  return 'Not Started'
}
