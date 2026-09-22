import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  canAccessEventAsViewer,
  EVENT_REFERENCE_IDENTIFIER_FORMS,
  EVENT_REFERENCE_LOOKUP_ORDER,
  type EventReference,
  type EventReferenceTable,
  resolveEventReference,
} from '../../app/api/events/_lib/event-reference'

type LookupResult = {
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}

type LookupCall = {
  table: string
  select: string
  column: string
  value: string
  limit: number
}

type ImporterContract = {
  path: string
  domain: 'discover' | 'payment' | 'social' | 'ticketing' | 'work'
  identifier: 'route-uuid-or-slug' | 'body-uuid' | 'resolved-reference'
  sources:
    | 'deprecated-polymorphic-read'
    | 'events-v2-for-collection-mutations'
    | 'events-v2-org-only'
    | 'polymorphic-source-qualified'
    | 'polymorphic-table-branch'
    | 'unqualified-polymorphic'
  authorization:
    | 'admin-capability-and-active-organization'
    | 'booking-owner-with-unbound-event'
    | 'caller-provided'
    | 'event-permission'
    | 'rls-read-and-viewer-write'
    | 'viewer'
  evidence: readonly string[]
}

const EVENT_REFERENCE_IMPORTER_CONTRACTS: readonly ImporterContract[] = [
  {
    path: 'app/api/events/[id]/attendance/route.ts',
    domain: 'social',
    identifier: 'route-uuid-or-slug',
    sources: 'polymorphic-source-qualified',
    authorization: 'rls-read-and-viewer-write',
    evidence: ['event_table', 'reference.table', 'canAccessEventAsViewer'],
  },
  {
    path: 'app/api/events/[id]/finances/route.ts',
    domain: 'ticketing',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['withAuth', 'hasEventPermission', "from('financial_transactions')"],
  },
  {
    path: 'app/api/events/[id]/guestlist/route.ts',
    domain: 'ticketing',
    identifier: 'route-uuid-or-slug',
    sources: 'deprecated-polymorphic-read',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', 'Legacy guest-list writes are frozen'],
  },
  {
    path: 'app/api/events/[id]/incidents/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'events-v2-for-collection-mutations',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "reference.table !== 'events_v2'"],
  },
  {
    path: 'app/api/events/[id]/jobs/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "from('events_v2')", "from('job_postings')"],
  },
  {
    path: 'app/api/events/[id]/locations/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "from('event_locations')"],
  },
  {
    path: 'app/api/events/[id]/page/route.ts',
    domain: 'discover',
    identifier: 'route-uuid-or-slug',
    sources: 'polymorphic-source-qualified',
    authorization: 'viewer',
    evidence: ['canAccessEventAsViewer', 'reference.table', 'event_table'],
  },
  {
    path: 'app/api/events/[id]/participants/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "from('event_participants')"],
  },
  {
    path: 'app/api/events/[id]/posts/route.ts',
    domain: 'social',
    identifier: 'route-uuid-or-slug',
    sources: 'polymorphic-source-qualified',
    authorization: 'rls-read-and-viewer-write',
    evidence: ['event_table', 'reference.table', 'canAccessEventAsViewer'],
  },
  {
    path: 'app/api/events/[id]/staff/[shiftId]/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'events-v2-org-only',
    authorization: 'admin-capability-and-active-organization',
    evidence: ['withAdminCapability', 'reference.orgId', 'hasEventPermission'],
  },
  {
    path: 'app/api/events/[id]/staff/invites/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'events-v2-org-only',
    authorization: 'admin-capability-and-active-organization',
    evidence: ['withAdminCapability', 'event.orgId', 'admin.orgId'],
  },
  {
    path: 'app/api/events/[id]/staff/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'events-v2-org-only',
    authorization: 'admin-capability-and-active-organization',
    evidence: ['withAdminCapability', 'reference.orgId', 'hasEventPermission'],
  },
  {
    path: 'app/api/events/[id]/tasks/[taskId]/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "from('workflow_tasks')", 'getEventWorkflowContext'],
  },
  {
    path: 'app/api/events/[id]/tasks/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', 'getEventWorkflowContext'],
  },
  {
    path: 'app/api/events/[id]/vendors/[vendorId]/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'unqualified-polymorphic',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "from('event_vendor_requests')"],
  },
  {
    path: 'app/api/events/[id]/vendors/route.ts',
    domain: 'work',
    identifier: 'route-uuid-or-slug',
    sources: 'events-v2-for-collection-mutations',
    authorization: 'event-permission',
    evidence: ['hasEventPermission', "reference.table !== 'events_v2'"],
  },
  {
    path: 'app/api/payment/route.ts',
    domain: 'payment',
    identifier: 'body-uuid',
    sources: 'polymorphic-table-branch',
    authorization: 'booking-owner-with-unbound-event',
    evidence: ['paymentCheckoutRequestSchema', "eq(\"user_id\", user.id)", 'eventReference.table'],
  },
  {
    path: 'lib/events/event-task-workflow.ts',
    domain: 'work',
    identifier: 'resolved-reference',
    sources: 'events-v2-org-only',
    authorization: 'caller-provided',
    evidence: ["reference.table !== 'events_v2'", "from('events_v2')"],
  },
]

function createSupabaseMock(results: Partial<Record<EventReferenceTable, LookupResult>>) {
  const calls: LookupCall[] = []
  const client = {
    from(table: EventReferenceTable) {
      return {
        select(select: string) {
          return {
            eq(column: string, value: string) {
              return {
                async limit(limit: number) {
                  calls.push({ table, select, column, value, limit })
                  return results[table] ?? { data: [], error: null }
                },
              }
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient

  return { calls, client }
}

function reference(overrides: Partial<EventReference> = {}): EventReference {
  return {
    id: 'event-1',
    table: 'events_v2',
    status: 'inquiry',
    ownerUserId: 'owner-1',
    isPublic: null,
    orgId: 'org-1',
    ...overrides,
  }
}

function findDirectImporters(directory: string): string[] {
  const absoluteDirectory = resolve(process.cwd(), directory)
  const matches: string[] = []

  function visit(currentDirectory: string) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
      if (!readFileSync(absolutePath, 'utf8').includes('event-reference')) continue
      matches.push(absolutePath.slice(process.cwd().length + 1))
    }
  }

  visit(absoluteDirectory)
  return matches
}

describe('event-reference importer contract', () => {
  it('keeps an explicit, unique contract for all 18 direct importers', () => {
    expect(EVENT_REFERENCE_IDENTIFIER_FORMS).toEqual(['uuid', 'slug'])
    expect(EVENT_REFERENCE_IMPORTER_CONTRACTS).toHaveLength(18)
    expect(new Set(EVENT_REFERENCE_IMPORTER_CONTRACTS.map((entry) => entry.path)).size).toBe(18)

    for (const contract of EVENT_REFERENCE_IMPORTER_CONTRACTS) {
      const source = readFileSync(resolve(process.cwd(), contract.path), 'utf8')
      expect(source, contract.path).toContain('event-reference')
      for (const marker of contract.evidence) {
        expect(source, `${contract.path}: ${marker}`).toContain(marker)
      }
    }

    expect([...findDirectImporters('app'), ...findDirectImporters('lib')].sort()).toEqual(
      EVENT_REFERENCE_IMPORTER_CONTRACTS.map((entry) => entry.path).sort()
    )
  })

  it('keeps UUID-only payment and unresolved payment/vendor divergences visible', () => {
    const apiContracts = readFileSync(
      resolve(process.cwd(), 'packages/api-contracts/src/index.ts'),
      'utf8'
    )
    expect(apiContracts).toMatch(
      /paymentCheckoutRequestSchema[\s\S]*?eventId:\s*z\.string\(\)\.uuid\(\)/
    )

    const vendorItemRoute = readFileSync(
      resolve(process.cwd(), 'app/api/events/[id]/vendors/[vendorId]/route.ts'),
      'utf8'
    )
    expect(vendorItemRoute).not.toContain("reference.table !== 'events_v2'")

    const paymentRoute = readFileSync(resolve(process.cwd(), 'app/api/payment/route.ts'), 'utf8')
    expect(paymentRoute).toContain('.eq("user_id", user.id)')
    expect(paymentRoute).not.toMatch(/booking\.event_id\s*[!=]==?\s*(eventId|eventReference\.id)/)
  })
})

describe('resolveEventReference', () => {
  it('queries UUIDs in canonical order and projects events_v2 identity fields', async () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000'
    const { calls, client } = createSupabaseMock({
      events_v2: {
        data: [
          {
            id: eventId,
            status: 'confirmed',
            created_by: 'user-1',
            org_id: 'org-1',
            venue_id: 'venue-1',
            start_at: '2026-10-05T19:30:00+00:00',
          },
        ],
        error: null,
      },
    })

    await expect(resolveEventReference(client, eventId)).resolves.toEqual({
      id: eventId,
      table: 'events_v2',
      status: 'confirmed',
      ownerUserId: 'user-1',
      isPublic: null,
      orgId: 'org-1',
      venueId: 'venue-1',
      eventDate: '2026-10-05',
      eventTime: '19:30:00',
    })
    expect(calls.map((call) => call.table)).toEqual(EVENT_REFERENCE_LOOKUP_ORDER)
    expect(calls.every((call) => call.column === 'id' && call.limit === 2)).toBe(true)
  })

  it('uses slug lookups in the same order and preserves isolated legacy compatibility', async () => {
    const { calls, client } = createSupabaseMock({
      events: {
        data: [{ id: 'legacy-1', status: 'published', artist_id: 'artist-1' }],
        error: null,
      },
    })

    await expect(resolveEventReference(client, 'legacy-show')).resolves.toEqual({
      id: 'legacy-1',
      table: 'events',
      status: 'published',
      ownerUserId: 'artist-1',
      isPublic: null,
    })
    expect(calls.map((call) => call.table)).toEqual(EVENT_REFERENCE_LOOKUP_ORDER)
    expect(calls.every((call) => call.column === 'slug')).toBe(true)
  })

  it('fails closed on a query error without falling through to legacy tables', async () => {
    const { calls, client } = createSupabaseMock({
      events_v2: { data: null, error: { message: 'RLS/query failure' } },
      artist_events: {
        data: [{ id: 'artist-1', status: 'published', user_id: 'user-1', is_public: true }],
        error: null,
      },
    })

    await expect(resolveEventReference(client, 'show')).resolves.toBeNull()
    expect(calls.map((call) => call.table)).toEqual(['events_v2'])
  })

  it('fails closed on within-table and cross-table ambiguity', async () => {
    const withinTable = createSupabaseMock({
      events_v2: {
        data: [{ id: 'v2-1' }, { id: 'v2-2' }],
        error: null,
      },
    })
    await expect(resolveEventReference(withinTable.client, 'shared-show')).resolves.toBeNull()
    expect(withinTable.calls.map((call) => call.table)).toEqual(['events_v2'])

    const crossTable = createSupabaseMock({
      events_v2: { data: [{ id: 'v2-1', status: 'confirmed' }], error: null },
      artist_events: {
        data: [{ id: 'artist-1', status: 'published', user_id: 'user-1', is_public: true }],
        error: null,
      },
    })
    await expect(resolveEventReference(crossTable.client, 'shared-show')).resolves.toBeNull()
    expect(crossTable.calls.map((call) => call.table)).toEqual(['events_v2', 'artist_events'])
  })

  it('returns null for missing, malformed, and whitespace-padded identifiers', async () => {
    const missing = createSupabaseMock({})
    await expect(resolveEventReference(missing.client, 'missing-show')).resolves.toBeNull()
    expect(missing.calls.map((call) => call.table)).toEqual(EVENT_REFERENCE_LOOKUP_ORDER)

    const invalid = createSupabaseMock({})
    await expect(resolveEventReference(invalid.client, '  missing-show  ')).resolves.toBeNull()
    await expect(resolveEventReference(invalid.client, '')).resolves.toBeNull()
    expect(invalid.calls).toEqual([])
  })
})

describe('canAccessEventAsViewer', () => {
  it('denies anonymous, unrelated, organization-only, unknown, and unpublished access', () => {
    const unpublished = reference()

    expect(canAccessEventAsViewer(unpublished)).toBe(false)
    expect(canAccessEventAsViewer(unpublished, 'unrelated-user')).toBe(false)
    expect(canAccessEventAsViewer(unpublished, 'org-1')).toBe(false)
    expect(canAccessEventAsViewer(reference({ status: null }), 'unrelated-user')).toBe(false)
    expect(canAccessEventAsViewer(reference({ status: 'archived' }), 'unrelated-user')).toBe(false)
    expect(canAccessEventAsViewer(reference({ status: 'unexpected' }), 'unrelated-user')).toBe(false)
  })

  it('allows owners and the explicit public or published states only', () => {
    expect(canAccessEventAsViewer(reference(), 'owner-1')).toBe(true)
    expect(canAccessEventAsViewer(reference({ status: 'confirmed' }))).toBe(true)
    expect(canAccessEventAsViewer(reference({ status: 'advancing' }))).toBe(true)
    expect(canAccessEventAsViewer(reference({ status: 'onsite' }))).toBe(true)
    expect(
      canAccessEventAsViewer(
        reference({ table: 'artist_events', status: 'draft', isPublic: true })
      )
    ).toBe(true)
    expect(
      canAccessEventAsViewer(reference({ table: 'events', status: 'published', isPublic: null }))
    ).toBe(true)
  })
})
