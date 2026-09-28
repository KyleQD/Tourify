// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const acting = vi.hoisted(() => ({
  value: {
    actingHeaders: {} as Record<string, string>,
    actingContextKey: '',
    actingType: 'general',
    isActingReady: false,
  },
}))

vi.mock('@/hooks/use-acting-context', () => ({
  useActingContext: () => acting.value,
}))

import {
  ADMIN_ACTING_CONTEXT_NOT_READY,
  buildAdminActingRequestInit,
  useAdminActingRequest,
} from '@/hooks/use-admin-acting-request'
import { useSiteMaps } from '@/hooks/use-site-maps'
import { useLogisticsOverview } from '@/hooks/use-logistics-overview'

const ORG_A_HEADERS = {
  'x-acting-profile-id': 'profile-a',
  'x-acting-account-type': 'organization',
  'x-acting-org-id': 'org-a',
  'x-correlation-id': 'correlation-a',
}

function setActingOrganization(key = 'organization:profile-a:org-a') {
  acting.value = {
    actingHeaders: { ...ORG_A_HEADERS },
    actingContextKey: key,
    actingType: 'organization',
    isActingReady: true,
  }
}

function overviewData(organizationId: string) {
  return {
    organizationId,
    generatedAt: '2026-09-23T12:00:00.000Z',
    scope: { mode: 'organization' as const },
    summary: {
      activeTours: 0,
      upcomingEvents: 0,
      blockers: 0,
      overdueTasks: 0,
      unassignedTasks: 0,
      pendingAcknowledgements: 0,
      missingMaps: 0,
      unpublishedMaps: 0,
      staleDaySheets: 0,
    },
    tours: [],
    events: [],
    attention: [],
    timeline: [],
    facets: { domains: [], severities: [], owners: [] },
    sources: [],
  }
}

describe('Admin acting request client', () => {
  beforeEach(() => {
    acting.value = {
      actingHeaders: {},
      actingContextKey: '',
      actingType: 'general',
      isActingReady: false,
    }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('preserves caller headers for JSON and does not invent a FormData content type', () => {
    const jsonInit = buildAdminActingRequestInit(ORG_A_HEADERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-acting-org-id': 'forged-org' },
      body: '{}',
    })
    const jsonHeaders = new Headers(jsonInit.headers)

    expect(jsonInit.credentials).toBe('include')
    expect(jsonHeaders.get('content-type')).toBe('application/json')
    expect(jsonHeaders.get('x-acting-org-id')).toBe('org-a')
    expect(jsonHeaders.get('x-acting-profile-id')).toBe('profile-a')

    const formData = new FormData()
    formData.append('name', 'Festival map')
    const formInit = buildAdminActingRequestInit(ORG_A_HEADERS, {
      method: 'POST',
      body: formData,
    })
    const formHeaders = new Headers(formInit.headers)

    expect(formHeaders.has('content-type')).toBe(false)
    expect(formHeaders.get('x-acting-org-id')).toBe('org-a')
  })

  it('does not issue a request before an organization account is ready', async () => {
    const { result } = renderHook(() => useAdminActingRequest())

    await expect(result.current.adminFetch('/api/admin/logistics/site-maps')).rejects.toThrow(
      ADMIN_ACTING_CONTEXT_NOT_READY,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps requests paused while an organization account is missing its canonical organization id', async () => {
    acting.value = {
      actingHeaders: {
        'x-acting-profile-id': 'profile-a',
        'x-acting-account-type': 'organization',
        'x-correlation-id': 'correlation-a',
      },
      actingContextKey: 'organization:profile-a:',
      actingType: 'organization',
      isActingReady: true,
    }
    const { result } = renderHook(() => useAdminActingRequest())

    expect(result.current.isAdminReady).toBe(false)
    expect(result.current.organizationId).toBeNull()
    await expect(result.current.adminFetch('/api/admin/logistics/site-maps')).rejects.toThrow(
      ADMIN_ACTING_CONTEXT_NOT_READY,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('attaches acting headers to GET, JSON POST, and FormData POST requests', async () => {
    setActingOrganization()
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({ ok: true } as Response)
    const { result } = renderHook(() => useAdminActingRequest())
    const formData = new FormData()
    formData.append('name', 'Image-backed map')

    await result.current.adminFetch('/api/admin/logistics/site-maps')
    await result.current.adminFetch('/api/admin/logistics/site-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Blank map', eventId: 'event-1' }),
    })
    await result.current.adminFetch('/api/admin/logistics/site-maps', {
      method: 'POST',
      body: formData,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers)
      expect(init?.credentials).toBe('include')
      expect(headers.get('x-acting-profile-id')).toBe('profile-a')
      expect(headers.get('x-acting-account-type')).toBe('organization')
      expect(headers.get('x-acting-org-id')).toBe('org-a')
      expect(headers.get('x-correlation-id')).toBe('correlation-a')
    }

    const jsonHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers)
    const formHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers)
    expect(jsonHeaders.get('content-type')).toBe('application/json')
    expect(formHeaders.has('content-type')).toBe(false)
  })

  it('attaches acting headers and aborts an old request when the organization changes', async () => {
    setActingOrganization()
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    }))

    const { result, rerender } = renderHook(() => useAdminActingRequest())
    const pending = result.current
      .adminFetch('/api/admin/logistics/site-maps', {
        headers: { 'Content-Type': 'application/json' },
      })
      .catch((error) => error)

    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(requestHeaders.get('x-acting-profile-id')).toBe('profile-a')
    expect(requestHeaders.get('x-acting-org-id')).toBe('org-a')

    acting.value = {
      actingHeaders: {
        ...ORG_A_HEADERS,
        'x-acting-profile-id': 'profile-b',
        'x-acting-org-id': 'org-b',
      },
      actingContextKey: 'organization:profile-b:org-b',
      actingType: 'organization',
      isActingReady: true,
    }
    await act(async () => rerender())

    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
  })

  it('defers site-map loading until ready and refetches without retaining the prior organization', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [{ id: 'map-a', name: 'Map A' }] }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [{ id: 'map-b', name: 'Map B' }] }),
      } as Response)

    const { result, rerender } = renderHook(() => useSiteMaps({ eventId: 'event-1' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.siteMaps).toEqual([])

    setActingOrganization()
    await act(async () => rerender())
    await waitFor(() => expect(result.current.siteMaps.map((map) => map.id)).toEqual(['map-a']))

    acting.value = {
      actingHeaders: {
        ...ORG_A_HEADERS,
        'x-acting-profile-id': 'profile-b',
        'x-acting-org-id': 'org-b',
      },
      actingContextKey: 'organization:profile-b:org-b',
      actingType: 'organization',
      isActingReady: true,
    }
    await act(async () => rerender())

    await waitFor(() => expect(result.current.siteMaps.map((map) => map.id)).toEqual(['map-b']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers)
    expect(secondHeaders.get('x-acting-org-id')).toBe('org-b')
  })

  it('does not load the logistics overview until an organization context is ready', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: overviewData('org-a') }),
    } as Response)

    const { result, rerender } = renderHook(() => useLogisticsOverview())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()

    setActingOrganization()
    await act(async () => rerender())

    await waitFor(() => expect(result.current.data?.organizationId).toBe('org-a'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/admin/logistics/overview')
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('x-acting-org-id')).toBe('org-a')
  })

  it('clears the old overview and ignores a stale body when the organization changes', async () => {
    setActingOrganization()
    const fetchMock = vi.mocked(fetch)
    let resolveOldBody: ((value: unknown) => void) | undefined
    let resolveNewBody: ((value: unknown) => void) | undefined
    const oldBody = new Promise((resolve) => { resolveOldBody = resolve })
    const newBody = new Promise((resolve) => { resolveNewBody = resolve })
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => oldBody } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => newBody } as Response)

    const { result, rerender } = renderHook(() => useLogisticsOverview())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    acting.value = {
      actingHeaders: {
        ...ORG_A_HEADERS,
        'x-acting-profile-id': 'profile-b',
        'x-acting-org-id': 'org-b',
      },
      actingContextKey: 'organization:profile-b:org-b',
      actingType: 'organization',
      isActingReady: true,
    }
    await act(async () => rerender())

    expect(result.current.data).toBeNull()
    resolveNewBody?.({ success: true, data: overviewData('org-b') })
    await waitFor(() => expect(result.current.data?.organizationId).toBe('org-b'))
    resolveOldBody?.({ success: true, data: overviewData('org-a') })
    await act(async () => { await Promise.resolve() })

    expect(result.current.data?.organizationId).toBe('org-b')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('x-acting-org-id')).toBe('org-b')
  })
})
