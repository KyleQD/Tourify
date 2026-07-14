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

  it('aggregates all operational kinds for an org window', async () => {
    const { items, summary } = await aggregateAdminCalendarItems({
      supabase,
      userId: 'user-1',
      orgId: 'org-1',
      filters: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      },
    })

    const kinds = new Set(items.map((item) => item.kind))
    expect(kinds.has('event')).toBe(true)
    expect(kinds.has('tour')).toBe(true)
    expect(kinds.has('task')).toBe(true)
    expect(kinds.has('shift')).toBe(true)
    expect(kinds.has('production')).toBe(true)
    expect(kinds.has('hiring')).toBe(true)

    expect(summary.event).toBeGreaterThanOrEqual(1)
    expect(summary.tour).toBeGreaterThanOrEqual(1)
    expect(summary.task).toBeGreaterThanOrEqual(2)
    expect(summary.shift).toBeGreaterThanOrEqual(1)
    expect(summary.production).toBeGreaterThanOrEqual(1)
    expect(summary.hiring).toBeGreaterThanOrEqual(1)

    const tour = items.find((item) => item.kind === 'tour')
    expect(tour?.allDay).toBe(true)
    expect(tour?.href).toContain('/admin/dashboard/tours/')
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
      },
    })

    expect(items.every((item) => item.kind === 'event')).toBe(true)
    expect(summary.tour).toBe(0)
    expect(summary.shift).toBe(0)
  })
})
