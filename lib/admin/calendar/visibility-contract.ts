/**
 * CAL-102 — Multi-org isolation cases for calendar sources + feeds.
 * Guessed source IDs and foreign feed tokens must deny.
 */

import type { RlsMatrixCase, RlsPersona } from '@/lib/testing/rls-persona-matrix'
import type { AdminCalendarSourceId } from '@/lib/admin/calendar/types'
import { CALENDAR_SOURCE_CAPABILITIES } from '@/lib/admin/calendar/source-access'

export const CAL102_ISOLATION_SOURCES = [
  'events_v2',
  'tasks',
  'logistics_tasks',
  'catering_services',
  'ground_transportation_coordination',
  'flight_coordination',
  'lodging_bookings',
  'staff_shifts',
  'event_calendar_items',
  'job_applications',
] as const satisfies readonly AdminCalendarSourceId[]

export type Cal102IsolationSource = (typeof CAL102_ISOLATION_SOURCES)[number]

export interface Cal102IsolationCase extends RlsMatrixCase {
  isolation: 'org_id' | 'record_id' | 'feed_token'
  sourceId?: Cal102IsolationSource
}

export function buildCal102OrgIsolationCases(): Cal102IsolationCase[] {
  const cases: Cal102IsolationCase[] = []
  const personas: Array<{ persona: RlsPersona; allowOnA: boolean }> = [
    { persona: 'org_a_owner', allowOnA: true },
    { persona: 'org_a_manager', allowOnA: true },
    { persona: 'org_b_owner', allowOnA: false },
    { persona: 'anonymous', allowOnA: false },
  ]

  for (const sourceId of CAL102_ISOLATION_SOURCES) {
    for (const { persona, allowOnA } of personas) {
      cases.push({
        id: `cal102-${sourceId}-${persona}-select-a-org`,
        table: sourceId,
        action: 'select',
        persona,
        targetOrg: 'a',
        expect: allowOnA ? 'allow' : 'deny',
        isolation: 'org_id',
        sourceId,
        notes: `Requires ${CALENDAR_SOURCE_CAPABILITIES[sourceId].join(' | ')}`,
      })
      cases.push({
        id: `cal102-${sourceId}-${persona}-select-b-record`,
        table: sourceId,
        action: 'select',
        persona,
        targetOrg: 'b',
        expect: 'deny',
        isolation: 'record_id',
        sourceId,
        notes: 'Guessing foreign calendar source UUID must not leak',
      })
    }
  }

  // Feed token / guessed orgId cases
  for (const persona of ['org_a_owner', 'org_b_owner', 'anonymous'] as RlsPersona[]) {
    cases.push({
      id: `cal102-feed-${persona}-org-a-valid-token`,
      table: 'organizations',
      action: 'select',
      persona,
      targetOrg: 'a',
      expect: persona === 'anonymous' ? 'deny' : (persona === 'org_a_owner' ? 'allow' : 'deny'),
      isolation: 'feed_token',
      notes: 'ICS feed requires matching org calendar_token; Org B token must fail on Org A',
    })
    cases.push({
      id: `cal102-feed-${persona}-guessed-org-b`,
      table: 'organizations',
      action: 'select',
      persona,
      targetOrg: 'b',
      expect: 'deny',
      isolation: 'feed_token',
      notes: 'Guessed orgId + wrong/missing token denied',
    })
  }

  return cases
}

export function assertCal102IsolationCoverage(cases: Cal102IsolationCase[]): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  const ids = new Set(cases.map((c) => c.id))

  for (const sourceId of CAL102_ISOLATION_SOURCES) {
    if (![...ids].some((id) => id.includes(sourceId) && id.includes('record')))
      failures.push(`missing record_id case for ${sourceId}`)
  }

  if (![...ids].some((id) => id.includes('feed') && id.includes('guessed')))
    failures.push('missing guessed feed org case')

  return { ok: failures.length === 0, failures }
}
