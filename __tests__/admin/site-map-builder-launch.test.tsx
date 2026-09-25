// @vitest-environment jsdom

import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const acting = vi.hoisted(() => ({
  value: {
    actingHeaders: {
      'x-acting-profile-id': 'profile-a',
      'x-acting-account-type': 'organization',
      'x-acting-org-id': 'org-a',
      'x-correlation-id': 'correlation-a',
    } as Record<string, string>,
    actingContextKey: 'organization:profile-a:org-a',
    actingType: 'organization',
    isActingReady: true,
  },
}))

const navigation = vi.hoisted(() => ({
  pathname: '/admin/dashboard/logistics',
  query: 'tab=maps',
  replace: vi.fn(),
}))

const toast = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-acting-context', () => ({
  useActingContext: () => acting.value,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('@/app/admin/dashboard/components/admin-empty-state', () => ({
  AdminEmptyState: ({
    title,
    action,
  }: {
    title: string
    action?: { label: string; onClick: () => void }
  }) => (
    <div>
      <span>{title}</span>
      {action ? <button type="button" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}))

vi.mock('@/components/admin/logistics/site-map/site-map-create-sheet', () => ({
  defaultCreateForm: {
    name: '',
    description: '',
    approximateSize: 'parking',
    templateId: 'blank',
    backgroundImage: null,
    pixelsPerUnit: '1',
    scaleUnit: 'feet',
    customGroundWidth: '500',
    customGroundHeight: '400',
  },
  resolveCreateWorldSize: () => ({ width: 500, height: 400, scale: 1, scaleUnit: 'feet' }),
  SiteMapCreateSheet: ({
    open,
    form,
    errorMessage,
    onFormChange,
    onSubmit,
  }: {
    open: boolean
    form: Record<string, unknown>
    errorMessage?: string | null
    onFormChange: (next: Record<string, unknown>) => void
    onSubmit: () => void | Promise<void>
  }) => open ? (
    <div data-testid="create-sheet">
      {errorMessage ? <div role="alert">{errorMessage}</div> : null}
      <button type="button" onClick={() => onFormChange({ ...form, name: 'Main stage' })}>Set name</button>
      <button
        type="button"
        onClick={() => onFormChange({
          ...form,
          name: 'Image map',
          backgroundImage: new File(['image'], 'floor-plan.png', { type: 'image/png' }),
        })}
      >
        Add background
      </button>
      <button type="button" onClick={() => void onSubmit()}>Submit map</button>
    </div>
  ) : null,
}))

vi.mock('@/components/admin/logistics/site-map/site-map-editor', () => ({
  SiteMapEditor: ({ siteMap }: { siteMap: { id: string; name: string } }) => (
    <div data-testid="site-map-editor">{siteMap.id}:{siteMap.name}</div>
  ),
}))

import { SiteMapManager } from '@/components/admin/logistics/site-map/site-map-manager'

function jsonResponse(body: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body,
  } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

function setReadyOrganization() {
  acting.value = {
    actingHeaders: {
      'x-acting-profile-id': 'profile-a',
      'x-acting-account-type': 'organization',
      'x-acting-org-id': 'org-a',
      'x-correlation-id': 'correlation-a',
    },
    actingContextKey: 'organization:profile-a:org-a',
    actingType: 'organization',
    isActingReady: true,
  }
}

function installFetch(options: {
  list?: Promise<Response> | Response
  create?: Response
  detail?: Response
} = {}) {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    requests.push({ url, init })

    if (url === '/api/admin/logistics/site-map-templates')
      return jsonResponse({ success: true, data: [] })
    if (url === '/api/admin/logistics/site-maps' && init?.method === 'POST')
      return options.create ?? jsonResponse({
        success: true,
        data: {
          id: 'map-created',
          name: 'Main stage',
          description: '',
          width: 500,
          height: 400,
          scale: 1,
          status: 'draft',
          created_at: '2026-09-24T00:00:00.000Z',
        },
      })
    if (url === '/api/admin/logistics/site-maps/map-created')
      return options.detail ?? jsonResponse({ success: false })
    if (url.startsWith('/api/admin/logistics/site-maps?'))
      return await (options.list ?? jsonResponse({ success: true, data: [] }))
    throw new Error(`Unexpected request: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, requests }
}

async function openAndSubmit({ background = false }: { background?: boolean } = {}) {
  fireEvent.click(screen.getByRole('button', { name: /new site map/i }))
  fireEvent.click(screen.getByRole('button', { name: background ? /add background/i : /set name/i }))
  fireEvent.click(screen.getByRole('button', { name: /submit map/i }))
  await screen.findByTestId('site-map-editor')
}

describe('Admin site-map builder launch', () => {
  beforeEach(() => {
    setReadyOrganization()
    navigation.query = 'tab=maps'
    navigation.replace.mockReset()
    toast.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens from the successful create response and survives a stale empty list response', async () => {
    navigation.query = 'tab=maps&eventId=event-1'
    const staleList = deferred<Response>()
    const { requests } = installFetch({ list: staleList.promise })
    render(<SiteMapManager eventId="event-1" eventLabel="Launch Night" />)

    await openAndSubmit()
    expect(screen.getByTestId('site-map-editor').textContent).toContain('map-created:Main stage')

    const createRequest = requests.find(({ url, init }) =>
      url === '/api/admin/logistics/site-maps' && init?.method === 'POST')
    expect(createRequest).toBeDefined()
    expect(new Headers(createRequest?.init?.headers).get('x-acting-org-id')).toBe('org-a')
    expect(JSON.parse(String(createRequest?.init?.body))).toMatchObject({ eventId: 'event-1' })
    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/dashboard/logistics?tab=maps&eventId=event-1&siteMapId=map-created',
      { scroll: false },
    )

    await act(async () => {
      staleList.resolve(jsonResponse({ success: true, data: [] }))
      await staleList.promise
    })
    expect(screen.getByTestId('site-map-editor').textContent).toContain('map-created:Main stage')
    expect(screen.queryByText('Opening builder…')).toBeNull()
  })

  it.each([
    { label: 'event only', props: { eventId: 'event-1' }, expected: { eventId: 'event-1' } },
    { label: 'tour only', props: { tourId: 'tour-1' }, expected: { tourId: 'tour-1' } },
    {
      label: 'event and tour',
      props: { eventId: 'event-1', tourId: 'tour-1' },
      expected: { eventId: 'event-1', tourId: 'tour-1' },
    },
  ])('preserves $label scope through creation', async ({ props, expected }) => {
    const initialQuery = new URLSearchParams({ tab: 'maps' })
    if (props.eventId) initialQuery.set('eventId', props.eventId)
    if (props.tourId) initialQuery.set('tourId', props.tourId)
    navigation.query = initialQuery.toString()
    const { requests } = installFetch()
    render(<SiteMapManager {...props} />)

    await openAndSubmit()
    const createRequest = requests.find(({ url, init }) =>
      url === '/api/admin/logistics/site-maps' && init?.method === 'POST')
    expect(JSON.parse(String(createRequest?.init?.body))).toMatchObject(expected)
    const replaceCalls = navigation.replace.mock.calls
    const replacedHref = String(replaceCalls[replaceCalls.length - 1]?.[0])
    const replacedUrl = new URL(replacedHref, 'https://tourify.test')
    expect(replacedUrl.searchParams.get('tab')).toBe('maps')
    expect(replacedUrl.searchParams.get('eventId')).toBe(props.eventId || null)
    expect(replacedUrl.searchParams.get('tourId')).toBe(props.tourId || null)
    expect(replacedUrl.searchParams.get('siteMapId')).toBe('map-created')
  })

  it('preserves acting headers without forcing a multipart content type', async () => {
    const { requests } = installFetch()
    render(<SiteMapManager eventId="event-1" />)

    await openAndSubmit({ background: true })
    const createRequest = requests.find(({ url, init }) =>
      url === '/api/admin/logistics/site-maps' && init?.method === 'POST')
    const headers = new Headers(createRequest?.init?.headers)
    const body = createRequest?.init?.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('eventId')).toBe('event-1')
    expect(body.get('backgroundImage')).toBeInstanceOf(File)
    expect(headers.get('x-acting-org-id')).toBe('org-a')
    expect(headers.has('content-type')).toBe(false)
  })

  it('does not create or show an opening overlay when authorization fails', async () => {
    installFetch({
      create: jsonResponse(
        { success: false, error: 'Organization is not available to this admin account.' },
        { ok: false, status: 403 },
      ),
    })
    render(<SiteMapManager eventId="event-1" />)

    fireEvent.click(screen.getByRole('button', { name: /new site map/i }))
    fireEvent.click(screen.getByRole('button', { name: /set name/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit map/i }))

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Organization is not available to this admin account.',
      variant: 'destructive',
    })))
    expect(screen.getByRole('alert').textContent).toContain('Organization is not available')
    expect(screen.queryByTestId('site-map-editor')).toBeNull()
    expect(screen.queryByText('Opening builder…')).toBeNull()
  })

  it('keeps creation disabled until an acting organization is ready', () => {
    acting.value = {
      actingHeaders: {},
      actingContextKey: '',
      actingType: 'general',
      isActingReady: false,
    }
    const { fetchMock } = installFetch()
    render(<SiteMapManager eventId="event-1" />)

    expect((screen.getByRole('button', { name: /new site map/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/select an organization account before loading or creating site maps/i)).toBeTruthy()
    expect(screen.queryByText('Opening builder…')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes the builder and removes a stale deep link when event scope changes', async () => {
    navigation.query = 'tab=maps&eventId=event-1&siteMapId=map-created'
    installFetch({
      list: jsonResponse({ success: true, data: [] }),
      detail: jsonResponse({
        success: true,
        data: {
          id: 'map-created',
          name: 'Existing event map',
          width: 500,
          height: 400,
          status: 'draft',
          created_at: '2026-09-24T00:00:00.000Z',
        },
      }),
    })
    const view = render(<SiteMapManager eventId="event-1" />)
    await screen.findByTestId('site-map-editor')

    view.rerender(<SiteMapManager eventId="event-2" />)

    await waitFor(() => expect(screen.queryByTestId('site-map-editor')).toBeNull())
    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/dashboard/logistics?tab=maps&eventId=event-2',
      { scroll: false },
    )
    expect(screen.queryByText('Opening builder…')).toBeNull()
  })

  it('opens an existing map from a canonical deep link', async () => {
    navigation.query = 'tab=maps&eventId=event-1&siteMapId=map-1'
    installFetch({
      list: jsonResponse({
        success: true,
        data: [{
          id: 'map-1',
          name: 'Existing map',
          description: '',
          width: 500,
          height: 400,
          status: 'draft',
          created_at: '2026-09-24T00:00:00.000Z',
        }],
      }),
    })
    render(<SiteMapManager eventId="event-1" />)

    expect((await screen.findByTestId('site-map-editor')).textContent).toContain('map-1:Existing map')
  })
})
