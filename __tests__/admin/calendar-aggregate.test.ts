import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aggregateAdminCalendarItems } from '@/lib/admin/calendar/aggregate'

function createMockQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  for (const method of [
    'select',
    'eq',
    'gte',
    'lte',
    'or',
    'in',
    'limit',
    'order',
  ]) {
    query[method] = vi.fn(chain)
  }
  query.maybeSingle = vi.fn(() => {
    const single = {
      data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
      error: result.error,
    }
    return {
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(single)),
    }
  })
  // Make the query thenable / awaitable like supabase
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result))
  return query
}

describe('aggregateAdminCalendarItems', () => {
  let supabase: {
    from: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    supabase = {
      from: vi.fn((table: string) => {
        if (table === 'events_v2') {
          return createMockQuery({
            data: [
              {
                id: 'evt-1',
                title: 'Night Show',
                start_at: '2026-07-15T20:00:00.000Z',
                end_at: '2026-07-15T23:00:00.000Z',
                status: 'confirmed',
                capacity: 500,
                venue_id: null,
                settings: { venue_label: 'Main Hall', description: 'Headliner' },
              },
            ],
            error: null,
          })
        }

        if (table === 'tour_events') {
          return createMockQuery({
            data: [{ event_id: 'evt-1' }],
            error: null,
          })
        }

        if (table === 'tours') {
          return createMockQuery({
            data: [
              {
                id: 'tour-1',
                name: 'Summer Run',
                description: 'West coast',
                start_date: '2026-07-10',
                end_date: '2026-07-20',
                status: 'active',
                budget: 50000,
              },
            ],
            error: null,
          })
        }

        if (table === 'tasks') {
          return createMockQuery({
            data: [
              {
                id: 'task-1',
                title: 'Confirm riders',
                description: null,
                status: 'todo',
                priority: 'high',
                due_at: '2026-07-14T12:00:00.000Z',
                event_id: 'evt-1',
              },
            ],
            error: null,
          })
        }

        if (table === 'logistics_tasks') {
          return createMockQuery({
            data: [
              {
                id: 'lt-1',
                title: 'Load truck',
                description: null,
                status: 'pending',
                priority: 'medium',
                due_date: '2026-07-13',
                event_id: null,
                tour_id: 'tour-1',
                type: 'transport',
              },
            ],
            error: null,
          })
        }

        if (table === 'staff_shifts') {
          return createMockQuery({
            data: [
              {
                id: 'shift-1',
                role_assignment: 'Security',
                shift_date: '2026-07-15',
                start_time: '17:00:00',
                end_time: '23:00:00',
                status: 'scheduled',
                notes: null,
                event_id: 'evt-1',
                venue_id: null,
                staff_member_id: null,
              },
            ],
            error: null,
          })
        }

        if (table === 'event_calendar_items') {
          return createMockQuery({
            data: [
              {
                id: 'prod-1',
                event_id: 'evt-1',
                title: 'Soundcheck',
                description: null,
                start_time: '2026-07-15T16:00:00.000Z',
                end_time: '2026-07-15T17:00:00.000Z',
                type: 'soundcheck',
                location: 'Stage',
                color: null,
                is_all_day: false,
              },
            ],
            error: null,
          })
        }

        if (table === 'job_applications') {
          return createMockQuery({
            data: [
              {
                id: 'app-1',
                applicant_name: 'Alex Candidate',
                status: 'in_review',
                interview_scheduled: true,
                interview_date: '2026-07-16T15:00:00.000Z',
                offer_made: false,
                offer_date: null,
                offer_details: null,
                form_responses: null,
              },
            ],
            error: null,
          })
        }

        if (table === 'organization_job_postings') {
          return createMockQuery({
            data: [],
            error: null,
          })
        }

        return createMockQuery({ data: [], error: null })
      }),
    }
  })

  it('aggregates day-anchored work for org overview without tour span items', async () => {
    const { items, summary, context } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        scope: 'org',
      },
    })

    const kinds = new Set(items.map((item) => item.kind))
    expect(kinds.has('event')).toBe(true)
    expect(kinds.has('tour')).toBe(false)
    expect(kinds.has('task')).toBe(true)
    expect(kinds.has('shift')).toBe(true)
    expect(kinds.has('production')).toBe(true)
    expect(kinds.has('hiring')).toBe(true)

    expect(summary.event).toBeGreaterThanOrEqual(1)
    expect(summary.tour).toBe(0)
    expect(summary.task).toBeGreaterThanOrEqual(2)
    expect(summary.shift).toBeGreaterThanOrEqual(1)
    expect(summary.production).toBeGreaterThanOrEqual(1)
    expect(summary.hiring).toBeGreaterThanOrEqual(1)

    expect(context?.mode).toBe('org')
  })

  it('respects type filters', async () => {
    const { items, summary } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        types: ['event'],
        scope: 'org',
      },
    })

    expect(items.every((item) => item.kind === 'event')).toBe(true)
    expect(summary.tour).toBe(0)
    expect(summary.shift).toBe(0)
  })

  it('tour scope returns shows and tasks without a tour span item', async () => {
    const { items, summary, context } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        scope: 'tour',
        tourId: 'tour-1',
      },
    })

    expect(items.some((item) => item.kind === 'tour')).toBe(false)
    expect(items.some((item) => item.kind === 'event' && item.sourceId === 'evt-1')).toBe(true)
    expect(items.some((item) => item.kind === 'task' && item.title === 'Confirm riders')).toBe(true)
    expect(items.some((item) => item.kind === 'task' && item.title === 'Load truck')).toBe(true)
    expect(items.some((item) => item.kind === 'hiring')).toBe(false)

    expect(summary.tour).toBe(0)
    expect(context?.mode).toBe('tour')
    expect(context?.id).toBe('tour-1')
    expect(context?.eventIds).toContain('evt-1')

    expect(supabase.from).toHaveBeenCalledWith('tour_events')
  })

  it('event scope filters to that event work and omits hiring', async () => {
    const { items, context } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        scope: 'event',
        eventId: 'evt-1',
      },
    })

    expect(items.some((item) => item.kind === 'event')).toBe(false)
    expect(items.some((item) => item.kind === 'task')).toBe(true)
    expect(items.some((item) => item.kind === 'shift')).toBe(true)
    expect(items.some((item) => item.kind === 'production')).toBe(true)
    expect(items.some((item) => item.kind === 'hiring')).toBe(false)

    expect(context?.mode).toBe('event')
    expect(context?.id).toBe('evt-1')
    expect(context?.eventIds).toEqual(['evt-1'])
  })

  it('includes tour-level logistics tasks via tour_id', async () => {
    const { items } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        scope: 'tour',
        tourId: 'tour-1',
        types: ['task'],
      },
    })

    const logistics = items.find((item) => item.id === 'logistics-task-lt-1')
    expect(logistics).toBeTruthy()
    expect(logistics?.meta?.tourId).toBe('tour-1')
    expect(logistics?.meta?.source).toBe('logistics_tasks')
  })
})
