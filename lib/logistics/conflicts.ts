import { hasInsufficientBuffer, parseLogisticsDate } from '@/lib/logistics/time'

export type ConflictSeverity = 'info' | 'warning' | 'blocking'

export interface LogisticsConflict {
  id: string
  severity: ConflictSeverity
  code: string
  message: string
  recordIds: string[]
  impactedPeople?: string[]
}

export function detectCapacityOverflow(args: {
  id: string
  capacity: number | null | undefined
  assigned: number | null | undefined
}): LogisticsConflict | null {
  const capacity = typeof args.capacity === 'number' ? args.capacity : null
  const assigned = typeof args.assigned === 'number' ? args.assigned : 0
  if (capacity === null || capacity < 0) return null
  if (assigned <= capacity) return null
  return {
    id: `capacity-${args.id}`,
    severity: 'blocking',
    code: 'capacity_overflow',
    message: `Assigned ${assigned} exceeds capacity ${capacity}`,
    recordIds: [args.id],
  }
}

export function detectWindowOverlap(args: {
  idA: string
  idB: string
  startA: string | Date | null | undefined
  endA: string | Date | null | undefined
  startB: string | Date | null | undefined
  endB: string | Date | null | undefined
  label?: string
}): LogisticsConflict | null {
  const startA = parseLogisticsDate(args.startA)
  const endA = parseLogisticsDate(args.endA)
  const startB = parseLogisticsDate(args.startB)
  const endB = parseLogisticsDate(args.endB)
  if (!startA || !endA || !startB || !endB) return null
  const overlaps = startA < endB && startB < endA
  if (!overlaps) return null
  return {
    id: `overlap-${args.idA}-${args.idB}`,
    severity: 'blocking',
    code: 'schedule_overlap',
    message: args.label || 'Schedule windows overlap',
    recordIds: [args.idA, args.idB],
  }
}

export function detectDoubleBookedKey(args: {
  key: string
  occurrences: Array<{ id: string; start: string | Date; end: string | Date }>
}): LogisticsConflict[] {
  const conflicts: LogisticsConflict[] = []
  for (let i = 0; i < args.occurrences.length; i += 1) {
    for (let j = i + 1; j < args.occurrences.length; j += 1) {
      const a = args.occurrences[i]
      const b = args.occurrences[j]
      const overlap = detectWindowOverlap({
        idA: a.id,
        idB: b.id,
        startA: a.start,
        endA: a.end,
        startB: b.start,
        endB: b.end,
        label: `Double-booked ${args.key}`,
      })
      if (overlap) {
        conflicts.push({
          ...overlap,
          id: `double-${args.key}-${a.id}-${b.id}`,
          code: 'double_booking',
          impactedPeople: [args.key],
        })
      }
    }
  }
  return conflicts
}

export function detectTransferBufferConflict(args: {
  id: string
  earlierEnd: string | Date | null | undefined
  laterStart: string | Date | null | undefined
  requiredMinutes: number
  label?: string
}): LogisticsConflict | null {
  if (!hasInsufficientBuffer({
    earlierEnd: args.earlierEnd,
    laterStart: args.laterStart,
    requiredMinutes: args.requiredMinutes,
  })) return null

  return {
    id: `buffer-${args.id}`,
    severity: 'warning',
    code: 'insufficient_transfer_buffer',
    message: args.label || `Less than ${args.requiredMinutes} minutes between legs`,
    recordIds: [args.id],
  }
}

export function detectMissingRequired(args: {
  id: string
  field: string
  value: unknown
}): LogisticsConflict | null {
  const isMissing =
    args.value === null ||
    args.value === undefined ||
    (typeof args.value === 'string' && args.value.trim() === '') ||
    (Array.isArray(args.value) && args.value.length === 0)

  if (!isMissing) return null
  return {
    id: `missing-${args.id}-${args.field}`,
    severity: 'blocking',
    code: 'missing_required',
    message: `Missing required ${args.field}`,
    recordIds: [args.id],
  }
}

export function summarizeConflicts(conflicts: LogisticsConflict[]): {
  blocking: number
  warning: number
  info: number
  hasBlocking: boolean
} {
  const blocking = conflicts.filter((c) => c.severity === 'blocking').length
  const warning = conflicts.filter((c) => c.severity === 'warning').length
  const info = conflicts.filter((c) => c.severity === 'info').length
  return { blocking, warning, info, hasBlocking: blocking > 0 }
}
