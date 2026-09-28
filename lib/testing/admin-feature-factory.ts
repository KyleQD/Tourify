/**
 * SEC-004 / REL-006 — deterministic two-org Admin feature test identities.
 * Use these stable UUIDs in unit/contract tests. DB seeding helpers can extend
 * this module without inventing new org ids per file.
 */

export const ADMIN_FEATURE_FIXTURE = {
  orgs: {
    a: {
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      profileId: "aaaaaaaa-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Fixture Org A",
    },
    b: {
      orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      profileId: "bbbbbbbb-cccc-4ccc-8ccc-cccccccccccc",
      name: "Fixture Org B",
    },
  },
  users: {
    multiOrg: {
      userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      email: "multi-org@fixture.tourify.test",
      memberships: [
        { org: "a", role: "viewer" },
        { org: "b", role: "tour_manager" },
      ] as const,
    },
    orgAOwner: {
      userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      email: "owner-a@fixture.tourify.test",
      org: "a" as const,
      role: "owner",
    },
    orgAManager: {
      userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      email: "tm-a@fixture.tourify.test",
      org: "a" as const,
      role: "tour_manager",
    },
    orgAViewer: {
      userId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      email: "viewer-a@fixture.tourify.test",
      org: "a" as const,
      role: "viewer",
    },
    orgAWorker: {
      userId: "12121212-1212-4121-8121-121212121212",
      email: "worker-a@fixture.tourify.test",
      org: "a" as const,
      role: "worker",
    },
    orgBOwner: {
      userId: "34343434-3434-4343-8343-343434343434",
      email: "owner-b@fixture.tourify.test",
      org: "b" as const,
      role: "owner",
    },
    orgBManager: {
      userId: "45454545-4545-4454-8454-454545454545",
      email: "tm-b@fixture.tourify.test",
      org: "b" as const,
      role: "tour_manager",
    },
    orgBViewer: {
      userId: "56565656-5656-4565-8565-565656565656",
      email: "viewer-b@fixture.tourify.test",
      org: "b" as const,
      role: "viewer",
    },
    orgBWorker: {
      userId: "67676767-6767-4676-8676-676767676767",
      email: "worker-b@fixture.tourify.test",
      org: "b" as const,
      role: "worker",
    },
  },
  tours: {
    aMultiStop: {
      tourId: "a0a00000-0000-4000-8000-000000000001",
      org: "a" as const,
      name: "Fixture Org A West Coast",
      stopIds: [
        "a1a00000-0000-4000-8000-000000000001",
        "a1a00000-0000-4000-8000-000000000002",
        "a1a00000-0000-4000-8000-000000000003",
      ],
      eventIds: [
        "a2a00000-0000-4000-8000-000000000001",
        "a2a00000-0000-4000-8000-000000000002",
        "a2a00000-0000-4000-8000-000000000003",
      ],
    },
    bCollision: {
      tourId: "b0b00000-0000-4000-8000-000000000001",
      org: "b" as const,
      name: "Fixture Org B West Coast",
      /** Intentionally similar naming/dates to Org A for cross-tenant tests */
      stopIds: ["b1b00000-0000-4000-8000-000000000001"],
      eventIds: ["b2b00000-0000-4000-8000-000000000001"],
    },
  },
  domains: [
    "tours",
    "events",
    "travel",
    "lodging",
    "equipment",
    "catering",
    "ticketing",
    "finance",
    "vendors",
    "contracts",
    "site_maps",
    "publications",
    "workforce",
  ] as const,
  domainRecords: {
    tours: {
      parentTable: "tours",
      childTable: "tour_stops",
      persisted: true,
      a: { parentId: "a0a00000-0000-4000-8000-000000000001", childId: "a1a00000-0000-4000-8000-000000000001" },
      b: { parentId: "b0b00000-0000-4000-8000-000000000001", childId: "b1b00000-0000-4000-8000-000000000001" },
    },
    events: {
      parentTable: "events_v2",
      childTable: "tasks",
      persisted: true,
      a: { parentId: "a2a00000-0000-4000-8000-000000000001", childId: "a3a00000-0000-4000-8000-000000000001" },
      b: { parentId: "b2b00000-0000-4000-8000-000000000001", childId: "b3b00000-0000-4000-8000-000000000001" },
    },
    travel: {
      parentTable: "travel_groups",
      childTable: "travel_group_members",
      persisted: true,
      a: { parentId: "a4a00000-0000-4000-8000-000000000001", childId: "a4a00000-0000-4000-8000-000000000002" },
      b: { parentId: "b4b00000-0000-4000-8000-000000000001", childId: "b4b00000-0000-4000-8000-000000000002" },
    },
    lodging: {
      parentTable: "lodging_bookings",
      childTable: "lodging_guest_assignments",
      persisted: true,
      a: { parentId: "a5a00000-0000-4000-8000-000000000001", childId: "a5a00000-0000-4000-8000-000000000002" },
      b: { parentId: "b5b00000-0000-4000-8000-000000000001", childId: "b5b00000-0000-4000-8000-000000000002" },
    },
    equipment: {
      parentTable: "equipment_catalog",
      childTable: "equipment_instances",
      persisted: true,
      a: { parentId: "a6a00000-0000-4000-8000-000000000001", childId: "a6a00000-0000-4000-8000-000000000002" },
      b: { parentId: "b6b00000-0000-4000-8000-000000000001", childId: "b6b00000-0000-4000-8000-000000000002" },
    },
    catering: {
      parentTable: "catering_services",
      childTable: "catering_dietary_summaries",
      persisted: true,
      a: { parentId: "c1c00000-0000-4000-8000-000000000001", childId: "c1c00000-0000-4000-8000-000000000002" },
      b: { parentId: "c2c00000-0000-4000-8000-000000000001", childId: "c2c00000-0000-4000-8000-000000000002" },
    },
    ticketing: {
      parentTable: "event_ticketing_config",
      childTable: "ticket_inventory_reservations",
      persisted: true,
      a: { parentId: "a7a00000-0000-4000-8000-000000000001", childId: "a7a00000-0000-4000-8000-000000000002" },
      b: { parentId: "b7b00000-0000-4000-8000-000000000001", childId: "b7b00000-0000-4000-8000-000000000002" },
    },
    finance: {
      parentTable: "events_v2",
      childTable: "financial_transactions",
      persisted: true,
      a: { parentId: "a2a00000-0000-4000-8000-000000000001", childId: "a8a00000-0000-4000-8000-000000000001" },
      b: { parentId: "b2b00000-0000-4000-8000-000000000001", childId: "b8b00000-0000-4000-8000-000000000001" },
    },
    vendors: {
      parentTable: "vendors",
      childTable: "vendor_documents",
      persisted: true,
      a: { parentId: "d1d00000-0000-4000-8000-000000000001", childId: "d1d00000-0000-4000-8000-000000000002" },
      b: { parentId: "d2d00000-0000-4000-8000-000000000001", childId: "d2d00000-0000-4000-8000-000000000002" },
    },
    contracts: {
      parentTable: "contracts",
      childTable: "contract_obligations",
      persisted: false,
      a: { parentId: "a9a00000-0000-4000-8000-000000000001", childId: "a9a00000-0000-4000-8000-000000000002" },
      b: { parentId: "b9b00000-0000-4000-8000-000000000001", childId: "b9b00000-0000-4000-8000-000000000002" },
    },
    site_maps: {
      parentTable: "site_maps",
      childTable: "site_map_zones",
      persisted: true,
      a: { parentId: "aaa00000-0000-4000-8000-000000000001", childId: "aaa00000-0000-4000-8000-000000000002" },
      b: { parentId: "bbb00000-0000-4000-8000-000000000001", childId: "bbb00000-0000-4000-8000-000000000002" },
    },
    publications: {
      parentTable: "admin_publication_snapshots",
      childTable: "admin_publication_sections",
      persisted: true,
      a: { parentId: "aca00000-0000-4000-8000-000000000001", childId: "aca00000-0000-4000-8000-000000000002" },
      b: { parentId: "bcb00000-0000-4000-8000-000000000001", childId: "bcb00000-0000-4000-8000-000000000002" },
    },
    workforce: {
      parentTable: "staff_shifts",
      childTable: "staff_shift_assignments",
      persisted: true,
      a: { parentId: "ada00000-0000-4000-8000-000000000001", childId: "ada00000-0000-4000-8000-000000000002" },
      b: { parentId: "bdb00000-0000-4000-8000-000000000001", childId: "bdb00000-0000-4000-8000-000000000002" },
    },
  },
} as const

export const ADMIN_UX_FIXTURE_CONTRACT = {
  personas: [
    { id: "org_a_owner", org: "a", role: "owner", userId: ADMIN_FEATURE_FIXTURE.users.orgAOwner.userId },
    { id: "org_a_operations_manager", org: "a", role: "operations_manager", userId: ADMIN_FEATURE_FIXTURE.users.orgAManager.userId },
    { id: "org_a_workforce_manager", org: "a", role: "workforce_manager", userId: "81818181-8181-4181-8181-818181818181" },
    { id: "org_a_finance_manager", org: "a", role: "finance_manager", userId: "82828282-8282-4282-8282-828282828282" },
    { id: "org_a_member", org: "a", role: "member", userId: ADMIN_FEATURE_FIXTURE.users.orgAViewer.userId },
    { id: "org_a_worker", org: "a", role: "worker", userId: ADMIN_FEATURE_FIXTURE.users.orgAWorker.userId },
    { id: "org_a_artist", org: "a", role: "artist", userId: "83838383-8383-4383-8383-838383838383" },
    { id: "org_b_owner", org: "b", role: "owner", userId: ADMIN_FEATURE_FIXTURE.users.orgBOwner.userId },
    { id: "org_b_operations_manager", org: "b", role: "operations_manager", userId: ADMIN_FEATURE_FIXTURE.users.orgBManager.userId },
    { id: "org_b_workforce_manager", org: "b", role: "workforce_manager", userId: "84848484-8484-4484-8484-848484848484" },
    { id: "org_b_finance_manager", org: "b", role: "finance_manager", userId: "85858585-8585-4585-8585-858585858585" },
    { id: "org_b_member", org: "b", role: "member", userId: ADMIN_FEATURE_FIXTURE.users.orgBViewer.userId },
    { id: "org_b_worker", org: "b", role: "worker", userId: ADMIN_FEATURE_FIXTURE.users.orgBWorker.userId },
    { id: "org_b_artist", org: "b", role: "artist", userId: "86868686-8686-4686-8686-868686868686" },
    { id: "unauthenticated", org: null, role: "unauthenticated", userId: null },
  ],
  collectionMinimums: {
    tours: 125,
    events: 125,
    ticketOrders: 40,
    financeLedgerRows: 200,
    conversations: 32,
    unreadConversations: 9,
  },
  failureScenarios: [
    { source: "dashboard_tasks", outcomes: [401, 409, 500, "timeout"] },
    { source: "event_children", outcomes: [403, 500, "timeout"] },
    { source: "logistics_children", outcomes: [403, 500, "timeout"] },
    { source: "ticketing_children", outcomes: [403, 500, "timeout"] },
    { source: "finance_overview", outcomes: [403, 500, "timeout"] },
    { source: "analytics", outcomes: [403, 500, "realtime_disconnected"] },
    { source: "organization_scope", outcomes: [403, 409, "stale_child_scope"] },
  ],
  viewports: [
    { id: "phone-compact", width: 320, height: 568, zoom: 1 },
    { id: "phone", width: 375, height: 812, zoom: 1 },
    { id: "tablet", width: 768, height: 1024, zoom: 1 },
    { id: "desktop", width: 1440, height: 900, zoom: 1 },
    { id: "desktop-zoom-200", width: 1440, height: 900, zoom: 2 },
  ],
} as const

export type FixtureOrgKey = keyof typeof ADMIN_FEATURE_FIXTURE.orgs

export function fixtureOrg(key: FixtureOrgKey) {
  return ADMIN_FEATURE_FIXTURE.orgs[key]
}

export function actingHeadersForOrg(key: FixtureOrgKey) {
  const org = fixtureOrg(key)
  return {
    "x-acting-profile-id": org.profileId,
    "x-acting-account-type": "organization",
    "x-acting-org-id": org.orgId,
  }
}

export function unpersistedFixtureDomains(): string[] {
  return Object.entries(ADMIN_FEATURE_FIXTURE.domainRecords)
    .filter(([, record]) => !record.persisted)
    .map(([domain]) => domain)
}
