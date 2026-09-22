import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const upload = vi.fn()
  return {
    upload,
    resolveScope: vi.fn(),
    context: {
      user: { id: '00000000-0000-4000-8000-000000000001' },
      admin: { orgId: '00000000-0000-4000-8000-00000000000a' },
      supabase: {
        storage: {
          from: vi.fn(() => ({
            upload,
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.test/map.png' } })),
          })),
        },
      },
    },
  }
})

vi.mock('@/lib/auth/api-auth', () => ({
  withAdminCapability: vi.fn(
    (_capability: string, handler: (request: NextRequest, context: typeof mocks.context) => unknown) =>
      (request: NextRequest) => handler(request, mocks.context),
  ),
}))

vi.mock('@/lib/admin/resolve-authorized-org', () => ({
  authorizedOrgScopeErrorResponse: vi.fn(() => null),
  resolveAuthorizedOrgLogisticsScope: mocks.resolveScope,
}))

import { POST } from '@/app/api/admin/logistics/site-maps/route'

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/logistics/site-maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Admin site-map collection route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an unscoped map before resolving or writing anything', async () => {
    const response = await POST(jsonRequest({ name: 'Unscoped map' }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'site_map_scope_required' })
    expect(mocks.resolveScope).not.toHaveBeenCalled()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('rejects legacy and client-controlled scope fields', async () => {
    const response = await POST(jsonRequest({
      name: 'Forged map',
      eventId: '00000000-0000-4000-8000-000000000010',
      event_id: '00000000-0000-4000-8000-000000000099',
    }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'legacy_scope_field_rejected',
    })
    expect(mocks.resolveScope).not.toHaveBeenCalled()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('denies a forged event before uploading the supplied background', async () => {
    mocks.resolveScope.mockRejectedValueOnce(
      new Error('Event is not available to this admin account.'),
    )
    const formData = new FormData()
    formData.append('name', 'Cross-org map')
    formData.append('eventId', '00000000-0000-4000-8000-000000000099')
    formData.append('backgroundImage', new Blob(['map'], { type: 'image/png' }), 'map.png')

    const response = await POST(new NextRequest(
      'https://tourify.test/api/admin/logistics/site-maps',
      { method: 'POST', body: formData },
    ) as never)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: 'entity_scope_denied' })
    expect(mocks.resolveScope).toHaveBeenCalledWith({
      userId: mocks.context.user.id,
      requestedOrgId: mocks.context.admin.orgId,
      eventId: '00000000-0000-4000-8000-000000000099',
      tourId: null,
    })
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
