import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const readSingle = vi.fn()
  const updateSingle = vi.fn()
  const readEq = vi.fn(() => ({ single: readSingle }))
  const updateSelect = vi.fn(() => ({ single: updateSingle }))
  const updateEq = vi.fn(() => ({ select: updateSelect }))
  const update = vi.fn(() => ({ eq: updateEq }))
  const select = vi.fn(() => ({ eq: readEq }))
  const from = vi.fn(() => ({ select, update }))

  return {
    readSingle,
    updateSingle,
    readEq,
    updateEq,
    update,
    from,
    context: {
      user: { id: '00000000-0000-4000-8000-000000000001' },
      supabase: { from },
    },
  }
})

vi.mock('@/lib/auth/api-auth', () => ({
  withPlatformAdmin: vi.fn(
    (handler: (request: NextRequest, context: typeof mocks.context) => unknown) =>
      (request: NextRequest) => handler(request, mocks.context),
  ),
}))

import { POST } from '@/app/api/admin/marketplace/payouts/[id]/retry/route'

const payoutId = '00000000-0000-4000-8000-000000000099'

function retryRequest() {
  return new NextRequest(`https://tourify.test/api/admin/marketplace/payouts/${payoutId}/retry`, {
    method: 'POST',
  })
}

function retryPayout() {
  return POST(retryRequest(), { params: Promise.resolve({ id: payoutId }) })
}

describe('Marketplace payout retry mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denies a missing payout without attempting a mutation', async () => {
    mocks.readSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })

    const response = await retryPayout()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Payout row not found' })
    expect(mocks.readEq).toHaveBeenCalledWith('id', payoutId)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('denies an ineligible payout without attempting a mutation', async () => {
    mocks.readSingle.mockResolvedValueOnce({
      data: { id: payoutId, payout_status: 'paid', metadata: null },
      error: null,
    })

    const response = await retryPayout()

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Payout is not eligible for retry' })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('scopes an eligible retry to the payout and attributes the actor', async () => {
    mocks.readSingle.mockResolvedValueOnce({
      data: { id: payoutId, payout_status: 'failed', metadata: { retryAttempts: 2, retained: true } },
      error: null,
    })
    mocks.updateSingle.mockResolvedValueOnce({
      data: { id: payoutId, payout_status: 'scheduled' },
      error: null,
    })

    const response = await retryPayout()

    expect(response.status).toBe(200)
    expect(mocks.updateEq).toHaveBeenCalledWith('id', payoutId)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      payout_status: 'scheduled',
      metadata: expect.objectContaining({
        retained: true,
        retryAttempts: 3,
        lastRetryBy: mocks.context.user.id,
        lastRetryAt: expect.any(String),
      }),
    }))
    await expect(response.json()).resolves.toEqual({
      data: { id: payoutId, payout_status: 'scheduled' },
    })
  })
})
