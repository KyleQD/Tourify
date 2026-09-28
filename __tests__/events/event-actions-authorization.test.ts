import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('next-safe-action', () => ({
  createSafeActionClient: () => ({
    schema: (schema: { safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: unknown } }) => ({
      action: (handler: (args: { parsedInput: never }) => Promise<unknown>) => async (input: unknown) => {
        const parsed = schema.safeParse(input)
        if (!parsed.success) return { validationErrors: parsed.error }
        return { data: await handler({ parsedInput: parsed.data as never }) }
      },
    }),
  }),
}))

import {
  createCalendarAction,
  createEventAction,
  createHoldAction,
  updateEventStatusAction,
} from '../../app/events/_actions/event-actions'

type Operation = {
  table: string
  kind: 'select' | 'insert' | 'update'
  columns?: string
  payload?: unknown
  filters: Array<[string, unknown]>
}

type SupabaseOptions = {
  userId?: string | null
  allowedOrgIds?: string[]
  eventRow?: { org_id: string } | null
  calendarRow?: { id: string; org_id: string } | null
  updatedEvent?: { id: string } | null
}

function createSupabaseMock({
  userId = '11111111-1111-4111-8111-111111111111',
  allowedOrgIds = [],
  eventRow = null,
  calendarRow = null,
  updatedEvent = { id: '44444444-4444-4444-8444-444444444444' },
}: SupabaseOptions = {}) {
  const operations: Operation[] = []
  const rpc = vi.fn(async (_name: string, args: { oid: string }) => ({
    data: allowedOrgIds.includes(args.oid),
    error: null,
  }))

  const from = vi.fn((table: string) => {
    const operation: Operation = { table, kind: 'select', filters: [] }
    operations.push(operation)

    const builder = {
      error: null,
      select(columns: string) {
        operation.columns = columns
        return builder
      },
      insert(payload: unknown) {
        operation.kind = 'insert'
        operation.payload = payload
        return builder
      },
      update(payload: unknown) {
        operation.kind = 'update'
        operation.payload = payload
        return builder
      },
      eq(column: string, value: unknown) {
        operation.filters.push([column, value])
        return builder
      },
      async maybeSingle() {
        if (operation.kind === 'update') return { data: updatedEvent, error: null }
        if (table === 'events_v2') return { data: eventRow, error: null }
        if (table === 'calendars') return { data: calendarRow, error: null }
        return { data: null, error: null }
      },
      async single() {
        if (table === 'calendars') return { data: { id: 'calendar-created' }, error: null }
        if (table === 'events_v2') {
          return { data: { id: 'event-created', slug: 'test-event' }, error: null }
        }
        return { data: null, error: null }
      },
    }

    return builder
  })

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      })),
    },
    rpc,
    from,
  }

  mocks.createClient.mockResolvedValue(client)
  return { client, from, operations, rpc }
}

const ORG_A = '22222222-2222-4222-8222-222222222222'
const ORG_B = '33333333-3333-4333-8333-333333333333'
const EVENT_ID = '44444444-4444-4444-8444-444444444444'
const CALENDAR_ID = '55555555-5555-4555-8555-555555555555'

const ACTION_DISPOSITIONS = [
  {
    exportName: 'createEventAction',
    disposition: 'retain-live-consumer',
    consumers: ['app/events/create/page.tsx'],
  },
  {
    exportName: 'createCalendarAction',
    disposition: 'retain-pending-owner-adoption-or-authorized-retirement',
    consumers: [],
  },
  {
    exportName: 'updateEventStatusAction',
    disposition: 'retain-pending-owner-adoption-or-authorized-retirement',
    consumers: [],
  },
  {
    exportName: 'createHoldAction',
    disposition: 'retain-pending-venue-adoption-or-authorized-retirement',
    consumers: [],
  },
] as const

function findSourceFiles(directory: string): string[] {
  const files: string[] = []

  function visit(currentDirectory: string) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const path = resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(path)
    }
  }

  visit(resolve(process.cwd(), directory))
  return files
}

function actionCallers(exportName: string) {
  const definingPath = resolve(process.cwd(), 'app/events/_actions/event-actions.ts')
  return ['app', 'components', 'hooks', 'lib']
    .flatMap(findSourceFiles)
    .filter((path) => path !== definingPath && readFileSync(path, 'utf8').includes(exportName))
    .map((path) => path.slice(process.cwd().length + 1))
    .sort()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('event action export disposition', () => {
  it('retains every export with exact caller evidence and no absence-based deletion', () => {
    expect(ACTION_DISPOSITIONS.map((entry) => entry.exportName)).toEqual([
      'createEventAction',
      'createCalendarAction',
      'updateEventStatusAction',
      'createHoldAction',
    ])

    for (const disposition of ACTION_DISPOSITIONS) {
      expect(actionCallers(disposition.exportName), disposition.exportName).toEqual(
        disposition.consumers
      )
    }
  })

  it('uses only the request-scoped client and the event.manage permission', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/events/_actions/event-actions.ts'),
      'utf8'
    )
    expect(source).toContain("perm: 'event.manage'")
    expect(source).not.toMatch(/service[_-]?role|createService/i)
  })
})

describe('organization-scoped event actions', () => {
  it('denies an unauthenticated create before any authorization or write', async () => {
    const { from, rpc } = createSupabaseMock({ userId: null })

    const result = await createEventAction({
      orgId: ORG_A,
      title: 'Test event',
      startAt: '2026-10-01T18:00:00Z',
      endAt: '2026-10-01T20:00:00Z',
      timezone: 'UTC',
    })

    expect(result?.data).toEqual({ ok: false, error: 'not_authenticated' })
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('denies unrelated and cross-tenant event creation before insert', async () => {
    const { operations, rpc } = createSupabaseMock({ allowedOrgIds: [ORG_B] })

    const result = await createEventAction({
      orgId: ORG_A,
      title: 'Cross tenant event',
      startAt: '2026-10-01T18:00:00Z',
      endAt: '2026-10-01T20:00:00Z',
      timezone: 'UTC',
    })

    expect(result?.data).toEqual({ ok: false, error: 'not_authorized' })
    expect(rpc).toHaveBeenCalledWith('has_perm', {
      uid: '11111111-1111-4111-8111-111111111111',
      oid: ORG_A,
      perm: 'event.manage',
    })
    expect(operations).toEqual([])
  })

  it('creates an event only in the authorized organization', async () => {
    const { operations } = createSupabaseMock({ allowedOrgIds: [ORG_A] })

    const result = await createEventAction({
      orgId: ORG_A,
      title: 'Test event',
      startAt: '2026-10-01T18:00:00Z',
      endAt: '2026-10-01T20:00:00Z',
      timezone: 'UTC',
    })

    expect(result?.data).toEqual({ ok: true, eventId: 'event-created', slug: 'test-event' })
    expect(operations).toContainEqual(
      expect.objectContaining({
        table: 'events_v2',
        kind: 'insert',
        payload: expect.objectContaining({ org_id: ORG_A, created_by: '11111111-1111-4111-8111-111111111111' }),
      })
    )
  })

  it('derives status authority from the event and binds the update to that org', async () => {
    const { operations, rpc } = createSupabaseMock({
      allowedOrgIds: [ORG_A],
      eventRow: { org_id: ORG_A },
      updatedEvent: { id: EVENT_ID },
    })

    const result = await updateEventStatusAction({ eventId: EVENT_ID, status: 'confirmed' })

    expect(result?.data).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledWith('has_perm', expect.objectContaining({ oid: ORG_A }))
    expect(operations).toContainEqual(
      expect.objectContaining({
        table: 'events_v2',
        kind: 'update',
        filters: [['id', EVENT_ID], ['org_id', ORG_A]],
      })
    )
  })

  it('fails closed for missing, cross-tenant, and stale event status targets', async () => {
    const missing = createSupabaseMock({ eventRow: null, allowedOrgIds: [ORG_A] })
    await expect(updateEventStatusAction({ eventId: EVENT_ID, status: 'confirmed' })).resolves.toMatchObject({
      data: { ok: false, error: 'not_authorized' },
    })
    expect(missing.rpc).not.toHaveBeenCalled()

    vi.clearAllMocks()
    const crossTenant = createSupabaseMock({ eventRow: { org_id: ORG_A }, allowedOrgIds: [ORG_B] })
    await expect(updateEventStatusAction({ eventId: EVENT_ID, status: 'confirmed' })).resolves.toMatchObject({
      data: { ok: false, error: 'not_authorized' },
    })
    expect(crossTenant.operations.filter((operation) => operation.kind === 'update')).toEqual([])

    vi.clearAllMocks()
    createSupabaseMock({ eventRow: { org_id: ORG_A }, allowedOrgIds: [ORG_A], updatedEvent: null })
    await expect(updateEventStatusAction({ eventId: EVENT_ID, status: 'confirmed' })).resolves.toMatchObject({
      data: { ok: false, error: 'not_authorized' },
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('denies a hold when the calendar is missing or belongs to another organization', async () => {
    const { operations } = createSupabaseMock({
      allowedOrgIds: [ORG_A],
      calendarRow: null,
    })

    const result = await createHoldAction({
      orgId: ORG_A,
      calendarId: CALENDAR_ID,
      startAt: '2026-10-01T18:00:00Z',
      endAt: '2026-10-01T20:00:00Z',
      status: 'soft',
    })

    expect(result?.data).toEqual({ ok: false, error: 'not_authorized' })
    expect(operations.filter((operation) => operation.table === 'holds')).toEqual([])
    expect(operations[0]?.filters).toEqual([['id', CALENDAR_ID], ['org_id', ORG_A]])
  })

  it('creates a hold only after calendar-to-org binding succeeds', async () => {
    const { operations } = createSupabaseMock({
      allowedOrgIds: [ORG_A],
      calendarRow: { id: CALENDAR_ID, org_id: ORG_A },
    })

    const result = await createHoldAction({
      orgId: ORG_A,
      calendarId: CALENDAR_ID,
      startAt: '2026-10-01T18:00:00Z',
      endAt: '2026-10-01T20:00:00Z',
      status: 'hard',
    })

    expect(result?.data).toEqual({ ok: true })
    expect(operations).toContainEqual(
      expect.objectContaining({
        table: 'holds',
        kind: 'insert',
        payload: expect.objectContaining({ org_id: ORG_A, calendar_id: CALENDAR_ID }),
      })
    )
  })

  it('rejects malformed or reversed lifecycle time ranges before authorization', async () => {
    createSupabaseMock({ allowedOrgIds: [ORG_A] })

    const reversedEvent = await createEventAction({
      orgId: ORG_A,
      title: 'Reversed event',
      startAt: '2026-10-01T20:00:00Z',
      endAt: '2026-10-01T18:00:00Z',
      timezone: 'UTC',
    })
    const malformedHold = await createHoldAction({
      orgId: ORG_A,
      calendarId: CALENDAR_ID,
      startAt: 'not-a-date',
      endAt: 'also-not-a-date',
      status: 'soft',
    })

    expect(reversedEvent).toHaveProperty('validationErrors')
    expect(malformedHold).toHaveProperty('validationErrors')
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('retains calendar creation behind event.manage for the named organization', async () => {
    const { operations } = createSupabaseMock({ allowedOrgIds: [ORG_A] })

    const result = await createCalendarAction({ orgId: ORG_A, name: 'Operations' })

    expect(result?.data).toEqual({ ok: true, calendarId: 'calendar-created' })
    expect(operations).toContainEqual(
      expect.objectContaining({
        table: 'calendars',
        kind: 'insert',
        payload: expect.objectContaining({ org_id: ORG_A }),
      })
    )
  })
})
