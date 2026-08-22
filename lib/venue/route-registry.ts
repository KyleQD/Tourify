/**
 * CANONICAL VENUE ROUTE REGISTRY — single source of truth (VEN-005 / VEN-298).
 *
 * Every authenticated Venue tab is declared exactly once here. Consumers:
 *   - lib/venue/routing.ts        → reserved first-level `/venue/<segment>` set for middleware
 *   - venue-operations-shell.tsx  → desktop sidebar groups
 *   - mobile-venue-nav.tsx        → mobile bottom bar
 *   - venue-command-menu.tsx      → ⌘K command search
 *   - components/venue/navigation/command-menu.tsx → global palette "Venue" group
 *
 * INVARIANTS enforced by lib/venue/__tests__/route-registry.test.ts:
 *   1. ids/hrefs are unique; hrefs start with "/venue".
 *   2. every nav href's first-level segment is a reserved account-app segment.
 *   3. status is "active" or "flagged"; flagged routes are hidden from ALL consumers.
 *   4. adding an app/venue/<segment> page without registering its segment fails tests.
 *
 * Permission model note: `requiredPermission` names the canonical entity-RBAC permission
 * that will gate this tab once VEN-122/VEN-260 land. Until then it is advisory metadata
 * only — server authorization must not rely on it yet.
 */

export const VENUE_ROUTE_STATUS = {
  ACTIVE: "active",
  FLAGGED: "flagged",
} as const

export type VenueRouteStatus = (typeof VENUE_ROUTE_STATUS)[keyof typeof VENUE_ROUTE_STATUS]

export type VenueNavGroupId = "command" | "commerce" | "workforce" | "physical-venue"

export interface VenueRouteDefinition {
  /** Stable machine id (also used as React key / telemetry key). */
  id: string
  label: string
  /** Canonical path (may include a static query suffix). */
  href: string
  group: VenueNavGroupId
  /** Icon key resolved by consumer icon maps (keeps registry server-safe). */
  iconKey: string
  /** Optional sidebar badge stat key supplied by useCurrentVenue(). */
  badgeKey?: "pendingRequests" | "upcomingEvents" | "teamMembers"
  /** Include in the mobile bottom bar (max 4 by design). */
  mobileNav?: boolean
  /** Include in command-search navigation results. */
  commandNav?: boolean
  status: VenueRouteStatus
  /**
   * Canonical entity-RBAC permission that should own this tab (advisory until RBAC wave).
   */
  requiredPermission?: string | null
}

export interface VenueNavGroupDefinition {
  id: VenueNavGroupId
  label: string
}

/** Ordered nav groups. Sidebar renders in this order. */
export const VENUE_NAV_GROUPS: VenueNavGroupDefinition[] = [
  { id: "command", label: "Command" },
  { id: "commerce", label: "Commerce" },
  { id: "workforce", label: "Workforce" },
  { id: "physical-venue", label: "Physical Venue" },
]

const dashboard = "dashboard"

export const CANONICAL_VENUE_ROUTES: VenueRouteDefinition[] = [
  // ── Command ────────────────────────────────────────────────────────────────
  {
    id: dashboard,
    label: "Dashboard",
    href: "/venue/dashboard",
    group: "command",
    iconKey: "home",
    mobileNav: true,
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "bookings",
    label: "Bookings",
    href: "/venue/bookings",
    group: "command",
    iconKey: "clipboard",
    badgeKey: "pendingRequests",
    mobileNav: true,
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/venue/dashboard/calendar",
    group: "command",
    iconKey: "calendar",
    mobileNav: true,
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "events",
    label: "Events",
    href: "/venue/events",
    group: "command",
    iconKey: "activity",
    badgeKey: "upcomingEvents",
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "messages",
    label: "Messages",
    href: "/venue/messages",
    group: "command",
    iconKey: "message",
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },

  // ── Commerce ───────────────────────────────────────────────────────────────
  {
    id: "tickets",
    label: "Tickets",
    href: "/venue/dashboard/tickets",
    group: "commerce",
    iconKey: "ticket",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "check-in",
    label: "Check-In",
    href: "/venue/dashboard/tickets?view=check-in",
    group: "commerce",
    iconKey: "scan",
    mobileNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "finances",
    label: "Finances",
    href: "/venue/finances",
    group: "commerce",
    iconKey: "dollar",
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/venue/analytics",
    group: "commerce",
    iconKey: "chart",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },

  // ── Workforce ──────────────────────────────────────────────────────────────
  {
    id: "staff",
    label: "Staff",
    href: "/venue/staff",
    group: "workforce",
    iconKey: "users",
    badgeKey: "teamMembers",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "jobs",
    label: "Hiring / Jobs",
    href: "/venue/dashboard/jobs",
    group: "workforce",
    iconKey: "briefcase",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "hiring-board",
    label: "Hiring Board",
    href: "/venue/dashboard/hiring-kanban",
    group: "workforce",
    iconKey: "kanban",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "scheduling",
    label: "Scheduling",
    href: "/venue/staff/scheduling",
    group: "workforce",
    iconKey: "calendar",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    href: "/venue/staff/roles-permissions",
    group: "workforce",
    iconKey: "shield",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },

  // ── Physical Venue ────────────────────────────────────────────────────────
  {
    // VEN-006: /venue/overview stays the canonical private profile surface until a
    // product decision approves migration to /venue/profile. Both segments are reserved.
    id: "profile",
    label: "Profile",
    href: "/venue/overview",
    group: "physical-venue",
    iconKey: "building",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "kit",
    label: "Venue Kit",
    href: "/venue/kit",
    group: "physical-venue",
    iconKey: "book",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "documents",
    label: "Documents",
    href: "/venue/documents",
    group: "physical-venue",
    iconKey: "file",
    commandNav: true,
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "equipment",
    label: "Equipment",
    href: "/venue/equipment",
    group: "physical-venue",
    iconKey: "package",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "site-maps",
    label: "Site Maps",
    // Canonical surface is the dashboard sub-route; /venue/site-maps redirects here.
    href: "/venue/dashboard/site-maps",
    group: "physical-venue",
    iconKey: "wrench",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/venue/settings",
    group: "physical-venue",
    iconKey: "settings",
    status: VENUE_ROUTE_STATUS.ACTIVE,
    requiredPermission: null,
  },
]

/**
 * Account-app segments that exist or are intentionally reserved but are NOT primary nav
 * entries. They MUST stay registered so middleware never mistakes them for legacy public
 * profile slugs.
 *
 * Page-backed aliases/surfaces:
 * - edit            /venue/edit                    (profile editor)
 * - profile         /venue/profile                 (reserved per VEN-006)
 * - assets          /venue/assets                  (legacy alias → equipment)
 * - tickets         /venue/tickets                 (redirect → dashboard/tickets)
 * - site-maps       /venue/site-maps               (redirect → dashboard/site-maps)
 * - manage-event    /venue/manage-event/[id]       (legacy redirect, sunset via VEN-102)
 *
 * Reservation-only (no pages yet; disposition decided with telemetry in VEN-308):
 * - teams / network / promotions / store / gallery
 */
export const NON_NAV_ACCOUNT_SEGMENTS: string[] = [
  "edit",
  "profile",
  "assets",
  "tickets",
  "manage-event",
  "site-maps",
  "teams",
  "network",
  "promotions",
  "store",
  "gallery",
]

/** Reserved segments that intentionally have no page under app/venue yet. */
export const RESERVATION_ONLY_SEGMENTS: string[] = [
  "teams",
  "network",
  "promotions",
  "store",
  "gallery",
]

// ─── Derived helpers ─────────────────────────────────────────────────────────

/** Extracts the first-level account-app segment from a /venue/<segment>/... href. */
function firstSegment(href: string): string {
  const withoutQuery = href.split("?")[0]
  const parts = withoutQuery.replace(/^\//, "").split("/")
  // parts[0] === "venue"; fall back defensively for malformed entries.
  return parts[0] === "venue" ? (parts[1] ?? "") : (parts[0] ?? "")
}

export function getActiveVenueRoutes(): VenueRouteDefinition[] {
  return CANONICAL_VENUE_ROUTES.filter((route) => route.status === VENUE_ROUTE_STATUS.ACTIVE)
}

export function getVenueRoutesByGroup(groupId: VenueNavGroupId): VenueRouteDefinition[] {
  return getActiveVenueRoutes().filter((route) => route.group === groupId)
}

/** Full reserved first-level segment set under /venue/* (nav + non-nav account pages). */
export function getVenueAccountAppSegments(): Set<string> {
  const segments = new Set<string>()
  for (const route of CANONICAL_VENUE_ROUTES) {
    segments.add(firstSegment(route.href))
  }
  for (const segment of NON_NAV_ACCOUNT_SEGMENTS) {
    segments.add(segment)
  }
  return segments
}
