import { describe, expect, it, vi } from 'vitest'
import {
  CalendarCommandError,
  executeCalendarCreateCommand,
} from '@/lib/admin/calendar-command.service'

vi.mock('@/lib/admin/logistics-command.service', () => ({
  LogisticsCommandError: class LogisticsCommandError extends Error {
    status = 422
    code = 'logistics'
  },
  executeLogisticsCommand: vi.fn(async ({ command }) => ({
    data: { id: 'task-1', ...command },
    message: 'Logistics task created',
  })),
}))

vi.mock('@/lib/admin/tour-event-operations.service', () => ({
  AdminTourEventOperationsService: {
    getTour: vi.fn(async () => ({ id: 'tour-1' })),
    getEvent: vi.fn(async () => ({ id: 'evt-1' })),
  },
}))

vi.mock('@/lib/admin/workforce-authority.service', () => ({
  WorkforceParentValidationError: class WorkforceParentValidationError extends Error {
    status = 422
    code = 'parent_validation_failed'
  },
  validateWorkforceAssignmentParents: vi.fn(async () => ({ orgId: 'org-1' })),
  workforceAuthorityErrorResponse: (error: Error) => ({
    message: error.message,
    status: 422,
    code: 'parent_validation_failed',
  }),
}))

vi.mock('@/lib/admin/workforce-assignment.service', () => ({
  upsertShiftLinkedAssignment: vi.fn(async () => ({})),
}))

function createMockSupabase(args?: {
  staffMember?: { id: string } | null
  shiftInsert?: Record<string, unknown>
}) {
  return {
    from: vi.fn((table: string) => {
      const query: Record<string, unknown> = {}
      const chain = () => query
      for (const method of ['select', 'eq', 'limit', 'insert']) {
        query[method] = vi.fn(chain)
      }
      query.maybeSingle = vi.fn(async () => {
        if (table === 'staff_members')
          return { data: args?.staffMember ?? { id: 'sm-1' }, error: null }
        if (table === 'profiles')
          return { data: { id: 'user-2' }, error: null }
        return { data: null, error: null }
      })
      query.single = vi.fn(async () => ({
        data: args?.shiftInsert || {
          id: 'shift-1',
          org_id: 'org-1',
          event_id: 'evt-1',
          staff_member_id: 'sm-1',
          status: 'scheduled',
        },
        error: null,
      }))
      return query
    }),
  }
}

describe('CAL-103 calendar commands', () => {
  it('rejects event/tour creates with use_domain_command', async () => {
    await expect(
      executeCalendarCreateCommand({
        supabase: createMockSupabase(),
        userId: 'user-1',
        orgId: 'org-1',
        body: {
          title: 'Show',
          type: 'event',
          start: '2026-07-15T20:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({
      code: 'use_domain_command',
      status: 422,
    })

    await expect(
      executeCalendarCreateCommand({
        supabase: createMockSupabase(),
        userId: 'user-1',
        orgId: 'org-1',
        body: {
          title: 'Tour',
          type: 'tour',
          start: '2026-07-15',
        },
      }),
    ).rejects.toBeInstanceOf(CalendarCommandError)
  })

  it('rejects task without event_id or tour_id', async () => {
    await expect(
      executeCalendarCreateCommand({
        supabase: createMockSupabase(),
        userId: 'user-1',
        orgId: 'org-1',
        body: {
          title: 'Do thing',
          type: 'task',
          start: '2026-07-15T12:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'incomplete_context' })
  })

  it('creates task via logistics command when tour scoped', async () => {
    const { executeLogisticsCommand } = await import('@/lib/admin/logistics-command.service')
    const result = await executeCalendarCreateCommand({
      supabase: createMockSupabase(),
      userId: 'user-1',
      orgId: 'org-1',
      body: {
        title: 'Load in',
        type: 'task',
        start: '2026-07-15T12:00:00.000Z',
        tour_id: '11111111-1111-1111-1111-111111111111',
      },
    })

    expect(result.table).toBe('logistics_tasks')
    expect(executeLogisticsCommand).toHaveBeenCalled()
  })

  it('rejects shift without event_id or staff member', async () => {
    await expect(
      executeCalendarCreateCommand({
        supabase: createMockSupabase(),
        userId: 'user-1',
        orgId: 'org-1',
        body: {
          title: 'Security',
          type: 'shift',
          start: '2026-07-15T17:00:00.000Z',
          end: '2026-07-15T23:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'incomplete_context' })

    await expect(
      executeCalendarCreateCommand({
        supabase: createMockSupabase({ staffMember: null }),
        userId: 'user-1',
        orgId: 'org-1',
        body: {
          title: 'Security',
          type: 'shift',
          start: '2026-07-15T17:00:00.000Z',
          event_id: '11111111-1111-1111-1111-111111111111',
        },
      }),
    ).rejects.toMatchObject({ code: 'incomplete_context' })
  })

  it('creates shift when event + staff context are complete', async () => {
    const result = await executeCalendarCreateCommand({
      supabase: createMockSupabase(),
      userId: 'user-1',
      orgId: 'org-1',
      body: {
        title: 'Security',
        type: 'shift',
        start: '2026-07-15T17:00:00.000Z',
        end: '2026-07-15T23:00:00.000Z',
        event_id: '11111111-1111-1111-1111-111111111111',
        staff_member_id: '22222222-2222-2222-2222-222222222222',
      },
    })

    expect(result.table).toBe('staff_shifts')
    expect((result.data as { id: string }).id).toBe('shift-1')
  })
})
