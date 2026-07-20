import { describe, expect, it } from 'vitest'
import {
  mapToOperationalStatus,
  requiresReapprovalOnChange,
  mapAssignmentResponse,
} from '@/lib/logistics/status'
import { moneyVariance, sumMoney } from '@/lib/logistics/money'
import { hasInsufficientBuffer, isValidWindow, parseLogisticsDate } from '@/lib/logistics/time'
import {
  detectCapacityOverflow,
  detectDoubleBookedKey,
  detectTransferBufferConflict,
  summarizeConflicts,
} from '@/lib/logistics/conflicts'
import { buildDietaryKitchenSummary, redactDietaryPii } from '@/lib/logistics/dietary-privacy'
import { buildTravelerMatrix } from '@/lib/logistics/traveler-matrix'
import { buildLogisticsReadiness, countsFromStatuses } from '@/lib/logistics/readiness'
import { filterAuthorizedRecipients } from '@/lib/logistics/notifications-adapter'
import { sanitizeActivityMetadata } from '@/lib/logistics/activity'
import { isAckSatisfied, pendingAcks } from '@/lib/logistics/acknowledgements'

describe('logistics status maps', () => {
  it('maps domain statuses into shared operational vocabulary', () => {
    expect(mapToOperationalStatus('scheduled')).toBe('planned')
    expect(mapToOperationalStatus('en_route')).toBe('in_progress')
    expect(mapToOperationalStatus('delayed')).toBe('issue')
  })

  it('requires reapproval only for critical changes on confirmed records', () => {
    expect(requiresReapprovalOnChange({
      previousStatus: 'confirmed',
      isCriticalFieldChanged: true,
    })).toBe(true)
    expect(requiresReapprovalOnChange({
      previousStatus: 'draft',
      isCriticalFieldChanged: true,
    })).toBe(false)
  })

  it('maps assignment responses', () => {
    expect(mapAssignmentResponse('acked')).toBe('acknowledged')
    expect(mapAssignmentResponse(null)).toBe('unassigned')
  })
})

describe('logistics money/time', () => {
  it('sums and computes variance in major units', () => {
    expect(sumMoney([10, null, 2.5])).toBe(12.5)
    expect(moneyVariance({ approved: 100, actual: 120 })).toEqual({
      baseline: 100,
      actual: 120,
      variance: 20,
      isOver: true,
    })
  })

  it('validates windows and transfer buffers', () => {
    const start = parseLogisticsDate('2026-07-19T10:00:00Z')
    const end = parseLogisticsDate('2026-07-19T12:00:00Z')
    expect(isValidWindow(start, end)).toBe(true)
    expect(hasInsufficientBuffer({
      earlierEnd: '2026-07-19T10:00:00Z',
      laterStart: '2026-07-19T10:20:00Z',
      requiredMinutes: 45,
    })).toBe(true)
  })
})

describe('logistics conflicts', () => {
  it('detects capacity overflow and double booking', () => {
    expect(detectCapacityOverflow({ id: 't1', capacity: 4, assigned: 6 })?.code)
      .toBe('capacity_overflow')

    const doubles = detectDoubleBookedKey({
      key: 'driver-a',
      occurrences: [
        { id: 'a', start: '2026-07-19T10:00:00Z', end: '2026-07-19T12:00:00Z' },
        { id: 'b', start: '2026-07-19T11:00:00Z', end: '2026-07-19T13:00:00Z' },
      ],
    })
    expect(doubles[0]?.code).toBe('double_booking')
    expect(summarizeConflicts(doubles).hasBlocking).toBe(true)
  })

  it('flags insufficient transfer buffer', () => {
    const conflict = detectTransferBufferConflict({
      id: 'leg-1',
      earlierEnd: '2026-07-19T10:00:00Z',
      laterStart: '2026-07-19T10:10:00Z',
      requiredMinutes: 30,
    })
    expect(conflict?.severity).toBe('warning')
  })
})

describe('dietary privacy and traveler matrix', () => {
  it('aggregates dietary data without person identifiers', () => {
    const summary = buildDietaryKitchenSummary([
      { userId: 'u1', preference: 'Vegan', allergy: 'Peanuts' },
      { userId: 'u2', preference: 'Vegan' },
      { memberName: 'x' },
    ])
    expect(summary.preferenceCounts.vegan).toBe(2)
    expect(summary.allergyCounts.peanuts).toBe(1)
    expect(summary.hasUnspecified).toBe(1)
    expect(redactDietaryPii({ userId: 'u1', allergy: 'Peanuts' })).toEqual({
      preference: undefined,
      allergy: 'Peanuts',
    })
  })

  it('builds traveler coverage gaps', () => {
    const matrix = buildTravelerMatrix({
      members: [
        { id: 'm1', name: 'A' },
        { id: 'm2', name: 'B' },
      ],
      flightMemberIds: ['m1'],
      lodgingMemberIds: ['m1', 'm2'],
      transferMemberIds: [],
    })
    expect(matrix.missingFlight).toBe(1)
    expect(matrix.missingTransfer).toBe(2)
    expect(matrix.rows[0].gaps).toEqual(['transfer'])
  })
})

describe('readiness and adapters', () => {
  it('builds readiness dimensions without inventing percentages from empty data', () => {
    const dims = buildLogisticsReadiness({
      transport: countsFromStatuses(['confirmed', 'completed']),
      travel: countsFromStatuses([]),
      equipment: countsFromStatuses(['delayed']),
      backline: countsFromStatuses(['fulfilled']),
      catering: countsFromStatuses(['ordered']),
      comms: { total: 0, completed: 0, confirmed: 0, issues: 0, published: 1 },
      siteMap: { total: 0, completed: 0, confirmed: 0, issues: 0, published: 1 },
    })
    expect(dims.find((d) => d.id === 'travel')?.state).toBe('missing')
    expect(dims.find((d) => d.id === 'equipment')?.state).toBe('at_risk')
    expect(dims.find((d) => d.id === 'site_map')?.state).toBe('ready')
  })

  it('filters unauthorized notification recipients and redacts activity metadata', () => {
    expect(filterAuthorizedRecipients([
      { userId: 'a', isAuthorized: true },
      { userId: 'b', isAuthorized: false },
    ])).toEqual(['a'])
    expect(sanitizeActivityMetadata({ passport: 'X', note: 'ok' })).toEqual({
      passport: '[redacted]',
      note: 'ok',
    })
  })

  it('tracks acknowledgement satisfaction', () => {
    expect(isAckSatisfied({ required: true, status: 'pending' })).toBe(false)
    expect(pendingAcks([
      { sourceType: 'transport_segment', sourceId: '1', userId: 'u', status: 'pending', required: true },
      { sourceType: 'transport_segment', sourceId: '1', userId: 'v', status: 'acknowledged', required: true },
    ])).toHaveLength(1)
  })
})
