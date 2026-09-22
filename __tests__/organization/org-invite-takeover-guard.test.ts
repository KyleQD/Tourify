/**
 * Regression tests for AUDIT C2 (organization invite takeover).
 *
 * Contract: createInviteAction must refuse to mint invitations for
 * organizations the caller does not already own/administer, and only owners
 * may mint additional `owner` invites.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

type QueryShape = Record<string, unknown>

const state = {
  user: null as null | { id: string; email?: string },
  membership: null as null | { role: string },
  insertedInvite: null as null | QueryShape,
}

function makeSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.user }, error: null })),
    },
    from: (table: string) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.membership }),
              }),
            }),
          }),
        }
      }
      if (table === 'org_invites') {
        return {
          insert: (row: QueryShape) => ({
            select: () => ({
              single: async () => ({ data: { id: 'invite-1', ...row } }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeSupabase()),
}))

const rateLimitAllow = { success: true, remaining: 1 }
vi.mock('@/lib/utils/rate-limit', () => ({
  createRateLimiter: () => ({ check: vi.fn(async () => rateLimitAllow) }),
}))

async function callCreateInvite(input: { orgId: string; email: string; role: string }): Promise<{
  ok: boolean
  error?: string
}> {
  const mod = await import('@/app/orgs/_actions/org-actions')
  // Safe actions are plain async functions at runtime:
  // (input) => Promise<SafeActionResult<..., { ok, error }, ...>>
  const result = await (
    mod as unknown as {
      createInviteAction: (input: typeof input) => Promise<{
        data?: { ok: boolean; error?: string }
        serverError?: string
        validationErrors?: unknown
      }>
    }
  ).createInviteAction(input)

  return { ok: Boolean(result?.data?.ok), error: result?.data?.error ?? result?.serverError ?? 'validation_failed' }
}

describe('C2 regression — invite creation requires verified org ownership', () => {
  beforeEach(() => {
    state.user = { id: 'attacker-1', email: 'attacker@example.com' }
    state.membership = null
    state.insertedInvite = null
    vi.stubEnv('EMAIL_FROM', '')
    vi.stubEnv('SENDGRID_API_KEY', '')
  })

  it('rejects invites from non-members of the target org', async () => {
    const result = await callCreateInvite({
      orgId: '11111111-1111-1111-1111-111111111111',
      email: 'attacker@example.com',
      role: 'owner',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('not_authorized')
  })

  it('allows admins to invite but forbids minting owner invites', async () => {
    state.membership = { role: 'admin' }

    const adminInvite = await callCreateInvite({
      orgId: '11111111-1111-1111-1111-111111111111',
      email: 'newperson@example.com',
      role: 'production',
    })
    expect(adminInvite.ok).toBe(true)

    const ownerEscalation = await callCreateInvite({
      orgId: '11111111-1111-1111-1111-111111111111',
      email: 'newperson@example.com',
      role: 'owner',
    })
    expect(ownerEscalation.ok).toBe(false)
    expect(ownerEscalation.error).toBe('not_authorized')
  })
})
