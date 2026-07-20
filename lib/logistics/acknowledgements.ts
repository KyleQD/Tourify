export type LogisticsAckStatus = 'pending' | 'acknowledged' | 'declined'

export interface LogisticsAckRecord {
  id?: string
  sourceType: string
  sourceId: string
  userId: string
  status: LogisticsAckStatus
  required: boolean
  acknowledgedAt?: string | null
  comment?: string | null
}

export function isAckSatisfied(record: Pick<LogisticsAckRecord, 'required' | 'status'>): boolean {
  if (!record.required) return true
  return record.status === 'acknowledged'
}

export function pendingAcks(records: LogisticsAckRecord[]): LogisticsAckRecord[] {
  return records.filter((r) => r.required && r.status === 'pending')
}

export function buildAckInsert(args: {
  sourceType: string
  sourceId: string
  userId: string
  required?: boolean
  orgId?: string | null
  eventId?: string | null
  tourId?: string | null
}) {
  return {
    source_type: args.sourceType,
    source_id: args.sourceId,
    user_id: args.userId,
    status: 'pending' as const,
    required: args.required !== false,
    org_id: args.orgId || null,
    event_id: args.eventId || null,
    tour_id: args.tourId || null,
  }
}
