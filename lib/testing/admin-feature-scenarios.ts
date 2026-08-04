import {
  ADMIN_FEATURE_FIXTURE,
  type FixtureOrgKey,
} from "@/lib/testing/admin-feature-factory"

export type AdminFeatureScenarioKind = "minimal" | "realistic" | "edge" | "crossTenantAttack"

export interface ScenarioDatabaseRow {
  id: string
  org_id: string
  [column: string]: unknown
}

export interface ScenarioDomainRows {
  domain: (typeof ADMIN_FEATURE_FIXTURE.domains)[number]
  persisted: boolean
  parentTable: string
  childTable: string
  parents: ScenarioDatabaseRow[]
  children: ScenarioDatabaseRow[]
}

export interface AdminFeatureScenario {
  kind: AdminFeatureScenarioKind
  org: FixtureOrgKey
  seedTarget: "isolated_database_only"
  clock: {
    now: string
    timezone: "America/Los_Angeles"
    dstFallbackBefore: string
    dstFallbackAfter: string
    localDayBoundary: string
  }
  currencies: ReadonlyArray<{ code: "USD" | "EUR" | "JPY"; exponent: 2 | 0; amountMinor: number }>
  domains: ScenarioDomainRows[]
  apiPayloads: Array<Record<string, unknown>>
  securityEdges: {
    revokedMembership: { userId: string; revokedAt: string }
    expiredGrant: { userId: string; expiresAt: string }
    staleVersion: { expected: number; actual: number }
    duplicateIdempotencyKeys: [string, string]
    guessedForeignOrgIds: { parentId: string; childId: string }
  }
  protectedExamples: {
    buyerEmail: string
    passportLastFour: string
    bankReferenceLastFour: string
    contractCounterpartyEmail: string
  }
}

const PARENT_FOREIGN_KEYS: Readonly<Record<string, string>> = {
  tour_stops: "tour_id",
  tasks: "event_id",
  travel_group_members: "travel_group_id",
  lodging_guest_assignments: "lodging_booking_id",
  equipment_instances: "catalog_item_id",
  catering_dietary_summaries: "catering_service_id",
  ticket_inventory_reservations: "ticketing_config_id",
  financial_transactions: "event_id",
  vendor_documents: "vendor_id",
  contract_obligations: "contract_id",
  site_map_zones: "site_map_id",
  admin_publication_sections: "snapshot_id",
  staff_shift_assignments: "staff_shift_id",
}

const REALISTIC_VOLUMES: Readonly<Record<string, { parents: number; childrenPerParent: number }>> = {
  tours: { parents: 2, childrenPerParent: 18 },
  events: { parents: 18, childrenPerParent: 8 },
  travel: { parents: 4, childrenPerParent: 24 },
  lodging: { parents: 6, childrenPerParent: 18 },
  equipment: { parents: 12, childrenPerParent: 10 },
  catering: { parents: 18, childrenPerParent: 24 },
  ticketing: { parents: 4, childrenPerParent: 40 },
  finance: { parents: 18, childrenPerParent: 12 },
  vendors: { parents: 12, childrenPerParent: 5 },
  contracts: { parents: 6, childrenPerParent: 8 },
  site_maps: { parents: 6, childrenPerParent: 12 },
  publications: { parents: 8, childrenPerParent: 10 },
  workforce: { parents: 36, childrenPerParent: 3 },
}

function derivedUuid(base: string, ordinal: number): string {
  const suffix = ordinal.toString(16).padStart(12, "0").slice(-12)
  return `${base.slice(0, -12)}${suffix}`
}

function domainVolume(kind: AdminFeatureScenarioKind, domain: string) {
  if (kind === "realistic") return REALISTIC_VOLUMES[domain]
  if (kind === "edge") return { parents: 2, childrenPerParent: 3 }
  return { parents: 1, childrenPerParent: 1 }
}

function buildDomainRows(args: {
  kind: AdminFeatureScenarioKind
  org: FixtureOrgKey
  domain: keyof typeof ADMIN_FEATURE_FIXTURE.domainRecords
}): ScenarioDomainRows {
  const contract = ADMIN_FEATURE_FIXTURE.domainRecords[args.domain]
  const identities = contract[args.org]
  const orgId = ADMIN_FEATURE_FIXTURE.orgs[args.org].orgId
  const volume = domainVolume(args.kind, args.domain)
  const parentForeignKey = PARENT_FOREIGN_KEYS[contract.childTable]
  const parents = Array.from({ length: volume.parents }, (_, index) => ({
    id: derivedUuid(identities.parentId, index + 1),
    org_id: orgId,
    fixture_kind: args.kind,
    status: args.kind === "edge" && index === 1 ? "stale" : "active",
    version: args.kind === "edge" && index === 1 ? 4 : 1,
  }))
  const children = parents.flatMap((parent, parentIndex) =>
    Array.from({ length: volume.childrenPerParent }, (_, childIndex) => {
      const ordinal = parentIndex * volume.childrenPerParent + childIndex + 1
      return {
        id: derivedUuid(identities.childId, ordinal),
        org_id: orgId,
        [parentForeignKey]: parent.id,
        fixture_kind: args.kind,
        ordinal,
        status: args.kind === "edge" && childIndex === volume.childrenPerParent - 1
          ? "expired"
          : "active",
      }
    }),
  )

  return {
    domain: args.domain,
    persisted: contract.persisted,
    parentTable: contract.parentTable,
    childTable: contract.childTable,
    parents,
    children,
  }
}

export function buildAdminFeatureScenario(input: {
  kind: AdminFeatureScenarioKind
  org: FixtureOrgKey
}): AdminFeatureScenario {
  const domains = ADMIN_FEATURE_FIXTURE.domains.map((domain) =>
    buildDomainRows({ kind: input.kind, org: input.org, domain }),
  )
  const foreignOrg: FixtureOrgKey = input.org === "a" ? "b" : "a"
  const ownTour = ADMIN_FEATURE_FIXTURE.domainRecords.tours[input.org]
  const foreignTour = ADMIN_FEATURE_FIXTURE.domainRecords.tours[foreignOrg]
  const idempotencyKey = `fixture:${input.kind}:${input.org}:publish:1`

  return {
    kind: input.kind,
    org: input.org,
    seedTarget: "isolated_database_only",
    clock: {
      now: "2026-10-31T23:30:00.000-07:00",
      timezone: "America/Los_Angeles",
      dstFallbackBefore: "2026-11-01T01:30:00.000-07:00",
      dstFallbackAfter: "2026-11-01T01:30:00.000-08:00",
      localDayBoundary: "2026-11-02T00:00:00.000-08:00",
    },
    currencies: [
      { code: "USD", exponent: 2, amountMinor: 123_456 },
      { code: "EUR", exponent: 2, amountMinor: 98_765 },
      { code: "JPY", exponent: 0, amountMinor: 125_000 },
    ],
    domains,
    apiPayloads: domains.map((domain) => ({
      domain: domain.domain,
      orgId: ADMIN_FEATURE_FIXTURE.orgs[input.org].orgId,
      parentId: domain.parents[0]?.id,
      childId: domain.children[0]?.id,
      expectedVersion: input.kind === "edge" ? 3 : 1,
      idempotencyKey: `fixture:${input.kind}:${input.org}:${domain.domain}:1`,
    })),
    securityEdges: {
      revokedMembership: {
        userId: ADMIN_FEATURE_FIXTURE.users.multiOrg.userId,
        revokedAt: "2026-10-30T12:00:00.000Z",
      },
      expiredGrant: {
        userId: ADMIN_FEATURE_FIXTURE.users.orgAWorker.userId,
        expiresAt: "2026-10-31T22:00:00.000Z",
      },
      staleVersion: { expected: 3, actual: 4 },
      duplicateIdempotencyKeys: [idempotencyKey, idempotencyKey],
      guessedForeignOrgIds: {
        parentId: foreignTour.parentId,
        childId: foreignTour.childId,
      },
    },
    protectedExamples: {
      buyerEmail: `buyer-${input.org}@fixture.tourify.test`,
      passportLastFour: "4432",
      bankReferenceLastFour: "9811",
      contractCounterpartyEmail: `legal-${input.org}@fixture.tourify.test`,
    },
  }
}

/**
 * Fail closed before a future seed adapter is allowed to use this factory.
 * Hosted Demo/production targets are intentionally impossible to opt into.
 */
export function assertIsolatedFixtureTarget(target: string | undefined): void {
  const normalized = target?.trim().toLowerCase() ?? ""
  if (!normalized || !/(localhost|127\.0\.0\.1|branch|preview|test)/.test(normalized)) {
    throw new Error("Admin feature fixtures may only target an isolated local/test/preview database.")
  }
  if (/(tourify[._-]?demo|demo\.tourify|production|prod\.)/.test(normalized)) {
    throw new Error("Admin feature fixtures are forbidden on Tourify Demo and production databases.")
  }
}
