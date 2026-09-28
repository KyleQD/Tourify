import { describe, expect, it } from 'vitest'
import {
  canAccessCalendarKind,
  canAccessCalendarSource,
  hasCalendarEntryAccess,
} from '@/lib/admin/calendar/source-access'
import {
  canViewCalendarProtectedFields,
  projectCalendarItem,
} from '@/lib/admin/calendar/field-projection'
import {
  assertCal102IsolationCoverage,
  buildCal102OrgIsolationCases,
  CAL102_ISOLATION_SOURCES,
} from '@/lib/admin/calendar/visibility-contract'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import type { AdminCalendarItem } from '@/lib/admin/calendar/types'

describe('CAL-102 calendar visibility', () => {
  it('grants entry access for any source view capability', () => {
    expect(hasCalendarEntryAccess(['event.view'])).toBe(true)
    expect(hasCalendarEntryAccess(['logistics.view'])).toBe(true)
    expect(hasCalendarEntryAccess(['ticketing.view'])).toBe(false)
  })

  it('gates kinds and sources by capability', () => {
    const viewer = ['event.view'] as AdminCapability[]
    expect(canAccessCalendarKind(viewer, 'event')).toBe(true)
    expect(canAccessCalendarKind(viewer, 'travel')).toBe(false)
    expect(canAccessCalendarSource(viewer, 'events_v2')).toBe(true)
    expect(canAccessCalendarSource(viewer, 'flight_coordination')).toBe(false)
    expect(canAccessCalendarSource(['hiring.manage'], 'job_applications')).toBe(true)
  })

  it('redacts protected person fields for view-only capabilities', () => {
    const item: AdminCalendarItem = {
      id: 'logistics-flight-1',
      sourceId: '1',
      kind: 'travel',
      title: 'Flight: UA100 · Alex Traveler',
      start: '2026-07-14T10:00:00.000Z',
      end: '2026-07-14T11:30:00.000Z',
      status: 'scheduled',
      priority: 'high',
      href: '/admin/dashboard/logistics',
      color: '#fff',
      allDay: false,
      description: 'SFO → LAX',
      meta: {
        passengers: ['Alex Traveler'],
        staffMemberId: 'sm-1',
        userId: 'u-1',
      },
    }

    const projected = projectCalendarItem({
      item,
      capabilities: ['logistics.view'],
      mode: 'admin',
    })

    expect(canViewCalendarProtectedFields(['logistics.view'])).toBe(false)
    expect(projected.title).toBe('Flight: UA100')
    expect(projected.meta?.passengers).toBeNull()
    expect(projected.meta?.staffMemberId).toBeNull()
  })

  it('keeps protected fields for manage capabilities', () => {
    const item: AdminCalendarItem = {
      id: 'logistics-flight-1',
      sourceId: '1',
      kind: 'travel',
      title: 'Flight: UA100 · Alex Traveler',
      start: '2026-07-14T10:00:00.000Z',
      end: '2026-07-14T11:30:00.000Z',
      status: 'scheduled',
      priority: 'high',
      href: '/admin/dashboard/logistics',
      color: '#fff',
      allDay: false,
      meta: { passengers: ['Alex Traveler'] },
    }

    const projected = projectCalendarItem({
      item,
      capabilities: ['logistics.manage'],
      mode: 'admin',
    })
    expect(projected.title).toContain('Alex Traveler')
    expect(projected.meta?.passengers).toEqual(['Alex Traveler'])
  })

  it('feed mode always redacts person fields', () => {
    const item: AdminCalendarItem = {
      id: 'hiring-interview-1',
      sourceId: '1',
      kind: 'hiring',
      title: 'Interview: Pat Candidate',
      start: '2026-07-16T15:00:00.000Z',
      end: '2026-07-16T15:00:00.000Z',
      status: 'pending',
      priority: 'high',
      href: '/admin/dashboard/hiring',
      color: '#fff',
      allDay: false,
      description: 'private notes',
      meta: { passengers: ['x'] },
    }

    const projected = projectCalendarItem({ item, mode: 'feed' })
    expect(projected.title).toBe('Interview')
    expect(projected.description).toBeNull()
    expect(projected.meta?.passengers).toBeNull()
  })

  it('builds multi-org isolation cases including guessed records and feeds', () => {
    const cases = buildCal102OrgIsolationCases()
    const coverage = assertCal102IsolationCoverage(cases)
    expect(coverage.ok).toBe(true)
    expect(cases.some((c) => c.isolation === 'record_id')).toBe(true)
    expect(cases.some((c) => c.isolation === 'feed_token' && c.id.includes('guessed'))).toBe(true)
    for (const source of CAL102_ISOLATION_SOURCES) {
      expect(cases.some((c) => c.sourceId === source && c.expect === 'deny')).toBe(true)
    }
  })
})
