import { hasWorkflowThreadPermission } from '../workflow-permissions'

jest.mock('@/lib/auth/api-auth', () => ({
  checkAdminPermissions: jest.fn(),
}))

jest.mock('@/app/api/events/_lib/event-permissions', () => ({
  hasEventPermission: jest.fn(),
}))

const { checkAdminPermissions } = jest.requireMock('@/lib/auth/api-auth')

function createSupabaseMock(input: {
  participant?: any
  thread?: any
}) {
  return {
    from(table: string) {
      if (table === 'workflow_participants') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: input.participant || null, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'workflow_threads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: input.thread || null, error: null }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }
    },
  }
}

describe('hasWorkflowThreadPermission', () => {
  it('grants write when active participant has messages.write permission', async () => {
    const supabase = createSupabaseMock({
      participant: {
        role: 'member',
        permissions: ['messages.write'],
        status: 'active',
      },
    })

    const result = await hasWorkflowThreadPermission({
      supabase: supabase as any,
      threadId: 'thread-1',
      userId: 'user-1',
      permission: 'write',
    })

    expect(result).toBe(true)
  })

  it('falls back to tour scope manage permission when participant missing', async () => {
    checkAdminPermissions.mockResolvedValue(true)
    const supabase = createSupabaseMock({
      participant: null,
      thread: {
        scope_type: 'tour',
        scope_id: 'tour-1',
      },
    })

    const result = await hasWorkflowThreadPermission({
      supabase: supabase as any,
      threadId: 'thread-2',
      userId: 'user-2',
      permission: 'manage',
    })

    expect(result).toBe(true)
    expect(checkAdminPermissions).toHaveBeenCalledWith({ id: 'user-2' }, { tourId: 'tour-1' })
  })
})
