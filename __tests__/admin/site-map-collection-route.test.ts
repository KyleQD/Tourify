import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const upload = vi.fn()
  const userFrom = vi.fn()
  const createdMap = {
    id: '00000000-0000-4000-8000-000000000020',
    name: 'Owner map',
    event_v2_id: '00000000-0000-4000-8000-000000000010',
    tour_id: null,
    width: 500,
    height: 400,
  }
  const siteMapSingle = vi.fn(async () => ({ data: createdMap, error: null }))
  const siteMapSelect = vi.fn(() => ({ single: siteMapSingle }))
  const siteMapInsert = vi.fn(() => ({ select: siteMapSelect }))
  const siteMapListExecute = vi.fn(async () => ({ data: [], error: null }))
  const makeQuery = (execute: () => Promise<unknown>) => {
    const query = {
      select: () => query,
      order: () => query,
      eq: () => query,
      in: () => query,
      or: () => query,
      limit: () => query,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        execute().then(resolve, reject),
    }
    return query
  }
  const activityInsert = vi.fn(async () => ({ error: null }))
  const serviceFrom = vi.fn((table: string) => {
    if (table === 'site_maps') {
      return {
        insert: siteMapInsert,
        select: () => makeQuery(siteMapListExecute),
      }
    }
    if (table === 'events_v2') {
      return makeQuery(async () => ({
        data: [{ id: createdMap.event_v2_id, title: 'Event A' }],
        error: null,
      }))
    }
    if (table === 'tours') return makeQuery(async () => ({ data: [], error: null }))
    if (table === 'site_map_activity_log') return { insert: activityInsert }
    throw new Error(`Unexpected table: ${table}`)
  })
  const service = {
    from: serviceFrom,
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.test/map.png' } })),
      })),
    },
  }
  return {
    upload,
    userFrom,
    service,
    serviceFrom,
    siteMapInsert,
    siteMapSingle,
    siteMapListExecute,
    createdMap,
    resolveScope: vi.fn(),
    context: {
      user: { id: '00000000-0000-4000-8000-000000000001' },
      admin: { orgId: '00000000-0000-4000-8000-00000000000a' },
      supabase: {
        from: userFrom,
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

import { GET, POST } from '@/app/api/admin/logistics/site-maps/route'

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
    mocks.resolveScope.mockResolvedValue({
      orgId: mocks.context.admin.orgId,
      eventIds: ['00000000-0000-4000-8000-000000000010'],
      tourIds: [],
      service: mocks.service,
    })
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

  it('writes through the authorized scope service client for an organization owner', async () => {
    const response = await POST(jsonRequest({
      name: 'Owner map',
      eventId: '00000000-0000-4000-8000-000000000010',
      width: 500,
      height: 400,
      scale: 1,
      scaleUnit: 'feet',
      templateId: 'blank',
    }) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: mocks.createdMap,
    })
    expect(mocks.userFrom).not.toHaveBeenCalled()
    expect(mocks.siteMapInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_v2_id: '00000000-0000-4000-8000-000000000010',
      tour_id: null,
      created_by: mocks.context.user.id,
    }))
  })

  it('retries list reads on event_id and normalizes the canonical event scope', async () => {
    mocks.siteMapListExecute
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'event_v2_id' column of 'site_maps' in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: [{
          ...mocks.createdMap,
          event_v2_id: undefined,
          event_id: mocks.createdMap.event_v2_id,
        }],
        error: null,
      })

    const response = await GET(new NextRequest(
      `https://tourify.test/api/admin/logistics/site-maps?eventId=${mocks.createdMap.event_v2_id}`,
    ) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{
        id: mocks.createdMap.id,
        event_id: mocks.createdMap.event_v2_id,
        event_v2_id: mocks.createdMap.event_v2_id,
        event_context: { id: mocks.createdMap.event_v2_id, title: 'Event A' },
      }],
    })
    expect(mocks.siteMapListExecute).toHaveBeenCalledTimes(2)
  })

  it('falls back to the deployed canonical event_id column when event_v2_id is absent', async () => {
    mocks.siteMapListExecute
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'event_v2_id' column of 'site_maps' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: [], error: null })
    mocks.siteMapSingle
      .mockResolvedValueOnce({
        data: {
          ...mocks.createdMap,
          event_v2_id: undefined,
          event_id: mocks.createdMap.event_v2_id,
        },
        error: null,
      })

    const response = await POST(jsonRequest({
      name: 'Compatible owner map',
      eventId: mocks.createdMap.event_v2_id,
      width: 500,
      height: 400,
      scale: 1,
      scaleUnit: 'feet',
      templateId: 'blank',
    }) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        event_id: mocks.createdMap.event_v2_id,
        event_v2_id: mocks.createdMap.event_v2_id,
      },
    })
    expect(mocks.siteMapInsert).toHaveBeenCalledTimes(1)
    expect(mocks.siteMapInsert).toHaveBeenCalledWith(expect.objectContaining({
      event_id: mocks.createdMap.event_v2_id,
    }))
    expect(mocks.siteMapInsert.mock.calls[0]?.[0]).not.toHaveProperty('event_v2_id')
  })

  it('fails closed before upload when event_id cannot be proven to target events_v2', async () => {
    mocks.siteMapListExecute
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '42703',
          message: 'column site_maps.event_v2_id does not exist',
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST200', message: 'relationship not found' },
      })

    const formData = new FormData()
    formData.append('name', 'Unsafe bridge map')
    formData.append('eventId', mocks.createdMap.event_v2_id)
    formData.append('backgroundImage', new Blob(['map'], { type: 'image/png' }), 'map.png')
    const response = await POST(new NextRequest(
      'https://tourify.test/api/admin/logistics/site-maps',
      { method: 'POST', body: formData },
    ) as never)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'site_map_schema_incompatible',
    })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.siteMapInsert).not.toHaveBeenCalled()
  })
})
