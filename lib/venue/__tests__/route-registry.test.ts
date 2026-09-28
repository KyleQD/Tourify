import fs from "node:fs"
import path from "node:path"

import {
  CANONICAL_VENUE_ROUTES,
  getActiveVenueRoutes,
  getVenueAccountAppSegments,
  getVenueRoutesByGroup,
  NON_NAV_ACCOUNT_SEGMENTS,
  RESERVATION_ONLY_SEGMENTS,
  VENUE_NAV_GROUPS,
} from "@/lib/venue/route-registry"
import {
  getLegacyVenueProfileRedirect,
  isVenueAccountSegment,
  isValidVenueSlug,
  normalizeVenueSlug,
} from "@/lib/venue/routing"

const APP_VENUE_DIR = path.join(__dirname, "..", "..", "..", "app", "venue")

describe("canonical venue route registry (VEN-005 / VEN-298)", () => {
  it("has unique ids and unique canonical hrefs", () => {
    const ids = CANONICAL_VENUE_ROUTES.map((route) => route.id)
    const hrefs = CANONICAL_VENUE_ROUTES.map((route) => route.href)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("every href is an authenticated /venue path", () => {
    for (const route of CANONICAL_VENUE_ROUTES) {
      expect(route.href).toMatch(/^\/venue(\/|$|\?)/)
    }
  })

  it("every route declares a valid nav group that exists in VENUE_NAV_GROUPS", () => {
    const groupIds = new Set(VENUE_NAV_GROUPS.map((group) => group.id))
    for (const route of CANONICAL_VENUE_ROUTES) {
      expect(groupIds.has(route.group)).toBe(true)
    }
  })

  it("only uses active|flagged statuses", () => {
    for (const route of CANONICAL_VENUE_ROUTES) {
      expect(["active", "flagged"]).toContain(route.status)
    }
  })

  it("mobile bar resolves to exactly the designed four destinations in order", () => {
    const ids = getActiveVenueRoutes()
      .filter((route) => route.mobileNav)
      .map((route) => route.id)
    expect(ids).toEqual([dashboard(), "bookings", "calendar", "check-in"])
  })

  function dashboard() {
    return CANONICAL_VENUE_ROUTES[0].id
  }

  it("command menu sources exist (at least the primary surfaces)", () => {
    const commandIds = getActiveVenueRoutes()
      .filter((route) => route.commandNav)
      .map((route) => route.id)
    expect(commandIds).toContain("dashboard")
    expect(commandIds).toContain("bookings")
    expect(commandIds).toContain("messages")
    expect(commandIds).not.toContain("check-in")
  })

  it("each nav group exposes at least one active route", () => {
    for (const group of VENUE_NAV_GROUPS) {
      expect(getVenueRoutesByGroup(group.id).length).toBeGreaterThan(0)
    }
  })
})

describe("registry ↔ filesystem parity (reserved segments)", () => {
  const IMPLEMENTATION_DIRS = new Set([
    "actions",
    "components",
    "context",
    "hooks",
    "lib",
    "types",
  ])

  // Only true routes: static top-level dirs that contain a page file at any nesting
  // depth (including dynamic child segments like manage-event/[id]).
  function hasPageRecursively(dir: string): boolean {
    const full = path.join(APP_VENUE_DIR, dir)
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(entry.name)) return true
      if (entry.isDirectory() && hasPageRecursively(path.join(dir, entry.name))) return true
    }
    return false
  }

  const routeDirs = fs
    .readdirSync(APP_VENUE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        !name.startsWith("[") &&
        !IMPLEMENTATION_DIRS.has(name) &&
        hasPageRecursively(name),
    )

  function firstSegmentOf(href: string): string {
    const parts = href.split("?")[0].replace(/^\//, "").split("/")
    return parts[0] === "venue" ? (parts[1] ?? "") : (parts[0] ?? "")
  }

  it("every app/venue route directory is registered as an account-app segment", () => {
    const registered = getVenueAccountAppSegments()
    const unregistered = routeDirs.filter((dir) => !registered.has(dir))
    expect(unregistered).toEqual([])
  })

  it("reserves every registry href's first-level segment", () => {
    const segments = getVenueAccountAppSegments()
    for (const route of CANONICAL_VENUE_ROUTES) {
      expect(segments.has(firstSegmentOf(route.href))).toBe(true)
    }
  })

  it("reserves VEN-006/VEN-007 collision-prone segments explicitly", () => {
    const segments = getVenueAccountAppSegments()
    expect(segments.has("overview")).toBe(true)
    expect(segments.has("messages")).toBe(true)
    expect(segments.has("profile")).toBe(true)
  })

  it("declares every page-backed non-nav segment as a real app/venue route directory", () => {
    const reservationOnly = new Set(RESERVATION_ONLY_SEGMENTS)
    const missing = NON_NAV_ACCOUNT_SEGMENTS.filter(
      (segment) => !reservationOnly.has(segment) && !routeDirs.includes(segment),
    )
    expect(missing).toEqual([])
  })

  it("keeps reservation-only segments free of stale pages", () => {
    for (const segment of RESERVATION_ONLY_SEGMENTS) {
      expect(fs.existsSync(path.join(APP_VENUE_DIR, segment))).toBe(false)
    }
  })
})

describe("legacy public-profile redirect guard (VEN-006 / VEN-007)", () => {
  it.each([
    "/venue/dashboard",
    "/venue/bookings",
    "/venue/messages",
    "/venue/messages/",
    "/venue/overview",
    "/venue/profile",
    "/venue/settings",
    "/venue/equipment",
    "/venue/documents",
    "/venue/staff",
    "/venue/analytics",
    "/venue/finances",
    "/venue/events",
    "/venue/tickets",
    "/venue/site-maps",
    "/venue/kit",
    "/venue/edit",
    "/venue/assets",
    "/venue/manage-event",
    "/venue/teams",
    "/venue/network",
    "/venue/promotions",
    "/venue/store",
    "/venue/gallery",
  ])("never redirects reserved account path %s to a public profile", (pathname) => {
    expect(getLegacyVenueProfileRedirect(pathname)).toBeNull()
  })

  it("redirects unknown single segments as legacy public profile slugs", () => {
    expect(getLegacyVenueProfileRedirect("/venue/the-fillmore")).toBe("/venues/the-fillmore")
    expect(getLegacyVenueProfileRedirect("/venue/Some-Venue_2")).toBe("/venues/Some-Venue_2")
  })

  it("ignores nested and non-venue paths", () => {
    expect(getLegacyVenueProfileRedirect("/venues/overview")).toBeNull()
    expect(getLegacyVenueProfileRedirect("/venue/staff/scheduling")).toBeNull()
    expect(getLegacyVenueProfileRedirect("/venue")).toBeNull()
    expect(getLegacyVenueProfileRedirect("/venue/a/b")).toBeNull()
  })

  it("isVenueAccountSegment is case-insensitive", () => {
    expect(isVenueAccountSegment("MESSAGES")).toBe(true)
    expect(isVenueAccountSegment("unknown-slug")).toBe(false)
  })
})

describe("VEN-014 — canonical slug validation", () => {
  it.each([
    "the-fillmore",
    "venue-2",
    "a",
    "abc-123-def",
  ])("accepts canonical slug %s", (slug) => {
    expect(isValidVenueSlug(slug)).toBe(true)
  })

  it.each([
    "",
    "The-Fillmore",
    "double--dash",
    "-leading",
    "trailing-",
    "has space",
    "sym!bol",
    null,
    undefined,
  ])("rejects malformed slug %s", (slug) => {
    expect(isValidVenueSlug(slug as string | null | undefined)).toBe(false)
  })

  it("normalizeVenueSlug maps malformed inputs onto the canonical pattern", () => {
    for (const raw of ["The Fillmore!", "--Double Dash--", "SYM/bol"]) {
      expect(isValidVenueSlug(normalizeVenueSlug(raw))).toBe(true)
    }
  })
})
