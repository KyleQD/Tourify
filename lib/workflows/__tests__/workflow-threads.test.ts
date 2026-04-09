import { ensureThreadForScope } from '../workflow-threads'

describe('ensureThreadForScope', () => {
  it('returns existing thread when one already exists', async () => {
    const supabase = {
      from(table: string) {
        if (table !== 'workflow_threads') throw new Error('Unexpected table')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'thread-existing',
                    scope_type: 'event',
                    scope_id: 'scope-1',
                    org_id: null,
                    status: 'active',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      },
    }

    const result = await ensureThreadForScope({
      supabase: supabase as any,
      scopeType: 'event',
      scopeId: 'scope-1',
      userId: 'user-1',
    })

    expect(result.id).toBe('thread-existing')
  })

  it('creates thread and upserts owner participant when missing', async () => {
    const inserts: Array<{ table: string; payload: any }> = []
    const supabase = {
      from(table: string) {
        if (table === 'workflow_threads') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: (payload: any) => {
              inserts.push({ table, payload })
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: 'thread-new',
                      scope_type: payload.scope_type,
                      scope_id: payload.scope_id,
                      org_id: payload.org_id,
                      status: payload.status,
                    },
                    error: null,
                  }),
                }),
              }
            },
          }
        }

        if (table === 'workflow_participants') {
          return {
            upsert: async (payload: any) => {
              inserts.push({ table, payload })
              return { error: null }
            },
          }
        }

        throw new Error(`Unexpected table ${table}`)
      },
    }

    const result = await ensureThreadForScope({
      supabase: supabase as any,
      scopeType: 'tour',
      scopeId: 'scope-2',
      orgId: 'org-1',
      userId: 'user-1',
      title: 'Tour workflow',
    })

    expect(result.id).toBe('thread-new')
    expect(inserts.find((item) => item.table === 'workflow_participants')).toBeTruthy()
  })
})
