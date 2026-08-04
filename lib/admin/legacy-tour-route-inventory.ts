/**
 * TOUR-103 — Inventory and classification of every /api/tours route.
 *
 * Every app/api/tours route.ts must appear here. Write methods without an
 * entry are CI failures. Retirement is gated by TOUR-604 (telemetry zero + flag off).
 */

export type LegacyTourWriteClass =
  | "legacy_write_compat"
  | "delegates_to_canonical"
  | "read_only_search"
  | "orphan_write"

export interface LegacyTourRouteConsumer {
  path: string
  kind: "ui" | "script" | "test" | "docs"
}

export interface LegacyTourRouteInventoryEntry {
  route: string
  methods: Array<"GET" | "POST" | "PATCH" | "PUT" | "DELETE">
  /** Product/engineering owner for migration. */
  owner: string
  /** Canonical replacement path(s). */
  replacement: string
  /** Primary tables / services. */
  dataSource: string
  /**
   * Org/env flag that will disable legacy writes before deletion.
   * Not all routes read the flag yet — name is reserved for TOUR-604 cutover.
   */
  flag: "FEATURE_LEGACY_TOUR_API_WRITES"
  retirementMilestone: "TOUR-604"
  writeClass: LegacyTourWriteClass
  consumers: LegacyTourRouteConsumer[]
  notes?: string
}

const FLAG = "FEATURE_LEGACY_TOUR_API_WRITES" as const
const RETIRE = "TOUR-604" as const

export const LEGACY_TOUR_ROUTE_INVENTORY: LegacyTourRouteInventoryEntry[] = [
  {
    route: "/api/tours",
    methods: ["GET", "POST"],
    owner: "tour-portfolio",
    replacement: "GET/POST /api/admin/tours (+ AdminTourEventOperationsService)",
    dataSource: "tours, events_v2, tour_events",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "components/admin/create-tour-form.tsx", kind: "ui" },
      { path: "scripts/qa/agents/ui-multi-agent-flow*.ts", kind: "script" },
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "scripts/manual-test-tour-creation.js", kind: "script" },
      { path: "__tests__/admin/tours-create-ownership.test.ts", kind: "test" },
    ],
    notes: "Admin list/create UI primarily uses /api/admin/tours; CreateTourForm is superseded but still wired to legacy POST.",
  },
  {
    route: "/api/tours/planner",
    methods: ["GET", "POST"],
    owner: "tour-planner",
    replacement: "POST → AdminTourEventOperationsService.createTourFromPlanner/updateTour/publishTour; prefer /api/admin/tours + publish",
    dataSource: "tours, tour_events, events (legacy), AdminTourEventOperationsService",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "delegates_to_canonical",
    consumers: [
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "docs/tour-publishing-flow-fix.md", kind: "docs" },
    ],
    notes: "POST delegates create/update/publish to canonical service. SEC-201: GET uses assertAdminTourAccess (not owner-only OR filter).",
  },
  {
    route: "/api/tours/planner/artists",
    methods: ["GET"],
    owner: "tour-planner",
    replacement: "GET /api/admin/tours/artists",
    dataSource: "artist_profiles, profiles",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "read_only_search",
    consumers: [
      { path: "components/admin/event-parties-panel.tsx", kind: "ui" },
      { path: "components/admin/event-participants-tab.tsx", kind: "ui" },
      { path: "app/admin/dashboard/events/create/page.tsx", kind: "ui" },
      { path: "app/artist/events/create/page.tsx", kind: "ui" },
    ],
  },
  {
    route: "/api/tours/planner/venues",
    methods: ["GET"],
    owner: "tour-planner",
    replacement: "GET /api/admin/tours/venues",
    dataSource: "venue_profiles",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "read_only_search",
    consumers: [
      { path: "components/admin/event-parties-panel.tsx", kind: "ui" },
      { path: "app/admin/dashboard/events/create/page.tsx", kind: "ui" },
      { path: "app/artist/events/create/page.tsx", kind: "ui" },
    ],
  },
  {
    route: "/api/tours/planner/crew",
    methods: ["GET"],
    owner: "tour-planner",
    replacement: "Admin workforce search / hiring roster APIs (no 1:1 yet — track under PLAN/workforce)",
    dataSource: "venue_crew_members",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "read_only_search",
    consumers: [
      { path: "components/admin/event-parties-panel.tsx", kind: "ui" },
      { path: "components/admin/event-participants-tab.tsx", kind: "ui" },
      { path: "app/admin/dashboard/events/create/page.tsx", kind: "ui" },
    ],
  },
  {
    route: "/api/tours/[id]",
    methods: ["GET", "PUT", "DELETE"],
    owner: "tour-portfolio",
    replacement: "GET/PATCH/DELETE /api/admin/tours/[id]",
    dataSource: "tours, tour_events, events",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "scripts/test-tour-functionality.js", kind: "script" },
    ],
    notes: "SEC-201: withAdminCapability + assertAdminTourAccess (retired user_id owner-only). Prefer /api/admin/tours/[id].",
  },
  {
    route: "/api/tours/[id]/events",
    methods: ["GET", "POST"],
    owner: "tour-planner",
    replacement: "GET/POST /api/admin/tours/[id]/events + /api/admin/tours/events",
    dataSource: "tour_events, events_v2, events; assertAdminTourAccess (SEC-201)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "scripts/manual-test-tour-creation.js", kind: "script" },
    ],
    notes: "SEC-201: list/create gated by canonical tour access.",
  },
  {
    route: "/api/tours/[id]/events/[eventId]",
    methods: ["GET", "PUT", "DELETE"],
    owner: "tour-planner",
    replacement: "Admin event routes via AdminTourEventOperationsService.getEvent/updateEvent",
    dataSource: "tour_events, events_v2, events; assertAdminTourAccess (SEC-201)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [],
    notes: "SEC-201: retired owner-only checks. Orphaned write surface until TOUR-604.",
  },
  {
    route: "/api/tours/[id]/team",
    methods: ["GET", "POST"],
    owner: "workforce",
    replacement: "GET/POST /api/admin/tours/team-members",
    dataSource: "tour_team_members, profiles, workflow_participants; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "scripts/manual-test-tour-creation.js", kind: "script" },
    ],
  },
  {
    route: "/api/tours/[id]/team/[memberId]",
    methods: ["GET", "PUT", "DELETE"],
    owner: "workforce",
    replacement: "PATCH/DELETE /api/admin/tours/team-members",
    dataSource: "tour_team_members; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [],
  },
  {
    route: "/api/tours/[id]/assign-user",
    methods: ["POST"],
    owner: "workforce",
    replacement: "POST /api/admin/tours/team-members (+ grant-admins)",
    dataSource: "tours, tour_team_members, profiles; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "orphan_write",
    consumers: [
      { path: "docs/archive/TOUR_MANAGEMENT_ENHANCEMENTS.md", kind: "docs" },
    ],
    notes: "No app UI consumer; VEND-101 gates via assertAdminTourAccess — prefer admin team-members.",
  },
  {
    route: "/api/tours/[id]/assign-user-to-team",
    methods: ["POST"],
    owner: "workforce",
    replacement: "POST /api/admin/tours/team-members",
    dataSource: "tours, tour_teams, tour_team_members, profiles; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "orphan_write",
    consumers: [
      { path: "docs/archive/TOUR_MANAGEMENT_ENHANCEMENTS.md", kind: "docs" },
    ],
    notes: "VEND-101: withAdminCapability + assertAdminTourAccess + team.tour_id match; do not add new callers.",
  },
  {
    route: "/api/tours/[id]/vendors",
    methods: ["GET", "POST"],
    owner: "vendor",
    replacement: "GET/POST /api/admin/tours/vendors",
    dataSource: "tour_vendors; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "scripts/manual-test-tour-creation.js", kind: "script" },
    ],
  },
  {
    route: "/api/tours/[id]/vendors/[vendorId]",
    methods: ["GET", "PUT", "DELETE"],
    owner: "vendor",
    replacement: "PATCH/DELETE /api/admin/tours/vendors",
    dataSource: "tour_vendors; assertAdminTourAccess (VEND-101)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [],
  },
  {
    route: "/api/tours/[id]/jobs",
    methods: ["GET", "POST", "PUT", "DELETE"],
    owner: "hiring",
    replacement: "/api/hiring/job-postings (+ tour-scoped hiring panels); interim keep behind flag",
    dataSource: "artist_jobs; assertAdminTourAccess (TOUR-102)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "components/admin/tour-jobs-list.tsx", kind: "ui" },
      { path: "components/admin/tour-job-posting.tsx", kind: "ui" },
      { path: "components/admin/tours/panels/index.tsx", kind: "ui" },
      { path: "scripts/test-tour-functionality.js", kind: "script" },
      { path: "scripts/manual-test-tour-creation.js", kind: "script" },
    ],
  },
  {
    route: "/api/tours/[id]/invites",
    methods: ["GET", "POST"],
    owner: "workforce",
    replacement: "Admin hiring invites / staff invitation APIs (workforce.manage)",
    dataSource: "staff_invitations; assertAdminTourAccess (TOUR-102)",
    flag: FLAG,
    retirementMilestone: RETIRE,
    writeClass: "legacy_write_compat",
    consumers: [
      { path: "components/admin/tour-team-manager.tsx", kind: "ui" },
      { path: "components/admin/tours/panels/index.tsx", kind: "ui" },
    ],
  },
]

export function listLegacyTourInventoryRoutes(): string[] {
  return LEGACY_TOUR_ROUTE_INVENTORY.map((entry) => entry.route).sort()
}

export function listLegacyTourWriteRoutes(): LegacyTourRouteInventoryEntry[] {
  return LEGACY_TOUR_ROUTE_INVENTORY.filter((entry) =>
    entry.methods.some((method) => method !== "GET"),
  )
}

export function assertLegacyTourInventoryComplete(diskRoutes: string[]): {
  missing: string[]
  extra: string[]
} {
  const inventoried = new Set(listLegacyTourInventoryRoutes())
  const onDisk = new Set(diskRoutes)
  const missing = [...onDisk].filter((route) => !inventoried.has(route)).sort()
  const extra = [...inventoried].filter((route) => !onDisk.has(route)).sort()
  return { missing, extra }
}
