import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { writeSecurityAuditEventMock } = vi.hoisted(() => ({
  writeSecurityAuditEventMock: vi.fn(async () => ({ id: 'audit-1' })),
}))
vi.mock('@/lib/security/write-security-audit-event', () => ({
  writeSecurityAuditEvent: writeSecurityAuditEventMock,
  SecurityAuditWriteError: class SecurityAuditWriteError extends Error {},
}))

import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  adminErrorResponse,
  clearOrgCommandIdempotencyForTests,
  executeOrgCommand,
  requireEntityAccess,
} from '@/lib/auth/org-command'
import type { ActingAdminContext } from '@/lib/auth/admin-context'

function context(overrides: Partial<ActingAdminContext> = {}): ActingAdminContext {
  return {
    userId: 'user-a',
    profileId: 'profile-a',
    accountType: 'organization',
    orgId: 'org-a',
    membershipRole: 'tour_manager',
    capabilities: ['tour.view', 'tour.manage', 'tour.delete'],
    source: 'header',
    correlationId: 'corr-test-1',
    ...overrides,
  }
}

describe('SEC-103 org command wrappers', () => {
  beforeEach(() => {
    clearOrgCommandIdempotencyForTests()
    writeSecurityAuditEventMock.mockReset()
    writeSecurityAuditEventMock.mockResolvedValue({ id: 'audit-1' })
  })

  it('returns structured validation failures with correlation id', async () => {
    const response = await executeOrgCommand({
      context: context(),
      auth: { user: { id: 'user-a' }, supabase: {} },
      schema: z.object({ name: z.string().min(1) }),
      input: { name: '' },
      capability: 'tour.manage',
      handler: async () => NextResponse.json({ ok: true }),
    })

    expect(response.status).toBe(422)
    expect(response.headers.get('x-correlation-id')).toBe('corr-test-1')
    await expect(response.json()).resolves.toMatchObject({
      code: 'validation_failed',
      correlationId: 'corr-test-1',
    })
  })

  it('denies missing capability before running the handler', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }))
    const response = await executeOrgCommand({
      context: context({ capabilities: ['tour.view'] }),
      auth: { user: { id: 'user-a' }, supabase: {} },
      schema: z.object({ name: z.string() }),
      input: { name: 'Run' },
      capability: 'tour.manage',
      handler,
    })

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: 'capability_denied' })
  })

  it('replays idempotent successes and rejects payload conflicts', async () => {
    let calls = 0
    const handler = async () => {
      calls += 1
      return NextResponse.json({ ok: true, calls })
    }

    const base = {
      context: context(),
      auth: { user: { id: 'user-a' }, supabase: {} },
      schema: z.object({ name: z.string() }),
      capability: 'tour.manage' as const,
      idempotencyKey: 'key-1',
      commandName: 'create_tour',
      handler,
    }

    const first = await executeOrgCommand({ ...base, input: { name: 'A' } })
    const second = await executeOrgCommand({ ...base, input: { name: 'A' } })
    const conflict = await executeOrgCommand({ ...base, input: { name: 'B' } })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(calls).toBe(1)
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toMatchObject({ code: 'idempotency_conflict' })
  })

  it('requireEntityAccess hides cross-org existence as 404', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        })),
      })),
    }

    const denied = await requireEntityAccess(
      { user: { id: 'user-a' }, supabase },
      context(),
      'tour',
      'tour-other-org',
    )

    expect(denied).toBeInstanceOf(NextResponse)
    expect(denied?.status).toBe(404)
    await expect(denied!.json()).resolves.toMatchObject({ code: 'entity_not_found' })
  })

  it('rejects organization assertions that disagree with the acting context', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }))
    const response = await executeOrgCommand({
      context: context(),
      auth: { user: { id: 'user-a' }, supabase: {} },
      schema: z.object({ org_id: z.string() }),
      input: { org_id: 'org-b' },
      capability: 'tour.manage',
      target: { kind: 'organization' },
      handler,
    })

    expect(response.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({ code: 'acting_context_mismatch' })
  })

  it('verifies every entity in a bulk target before executing', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 'tour-a', org_id: 'org-a' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle })),
          })),
        })),
      })),
    }
    const handler = vi.fn(async () => NextResponse.json({ ok: true }))
    const response = await executeOrgCommand({
      context: context(),
      auth: { user: { id: 'user-a' }, supabase },
      schema: z.object({ ids: z.array(z.string()) }),
      input: { ids: ['tour-a', 'tour-b'] },
      capability: 'tour.manage',
      target: { kind: 'entity', type: 'tour', id: (input) => input.ids },
      handler,
    })

    expect(response.status).toBe(404)
    expect(maybeSingle).toHaveBeenCalledTimes(2)
    expect(handler).not.toHaveBeenCalled()
  })

  it('adminErrorResponse sets correlation header', async () => {
    const response = adminErrorResponse(503, 'dependency_unavailable', 'Down', 'corr-9')
    expect(response.headers.get('x-correlation-id')).toBe('corr-9')
  })

  it('fails closed before the handler when mutation audit storage is unavailable', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }))
    writeSecurityAuditEventMock.mockRejectedValueOnce(new Error('audit down'))

    const response = await executeOrgCommand({
      context: context(),
      auth: { user: { id: 'user-a' }, supabase: {} },
      schema: z.object({ name: z.string() }),
      input: { name: 'Run' },
      capability: 'tour.manage',
      commandName: 'update_tour',
      handler,
    })

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'dependency_unavailable',
      correlationId: 'corr-test-1',
    })
  })
})
