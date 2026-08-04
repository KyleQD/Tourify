import { describe, expect, it } from "vitest"
import {
  annotateNavTreeByCapabilities,
  buildCapabilityDenialMessage,
  evaluateCapabilityAccess,
  evaluateNavHrefAccess,
  findNavCapabilityRule,
  publicCapabilityDenialPayload,
} from "@/lib/admin/capability-aware-ui"

describe("SEC-205 capability-aware UI", () => {
  it("maps nav paths to capability rules", () => {
    expect(findNavCapabilityRule("/admin/dashboard/finances")?.anyOf).toContain("finance.view")
    expect(findNavCapabilityRule("/admin/dashboard/tours/abc")?.surfaceLabel).toBe("Tours")
    expect(findNavCapabilityRule("/admin/dashboard")?.surfaceLabel).toBe("Dashboard")
  })

  it("allows or denies based on capabilities", () => {
    expect(
      evaluateCapabilityAccess({
        capabilities: ["finance.view"],
        anyOf: ["finance.view", "finance.manage"],
        surfaceLabel: "Finances",
      }).allowed,
    ).toBe(true)

    const denied = evaluateCapabilityAccess({
      capabilities: ["tour.view"],
      anyOf: ["finance.view"],
      surfaceLabel: "Finances",
    })
    expect(denied.allowed).toBe(false)
    if (!denied.allowed) {
      expect(denied.message).toMatch(/Ask an organization owner/)
      expect(denied.message).not.toMatch(/passport|ssn|token/i)
      expect(publicCapabilityDenialPayload(denied).requestCapabilities).toEqual(["finance.view"])
    }
  })

  it("keeps denial copy free of protected-data leakage", () => {
    const message = buildCapabilityDenialMessage({
      surfaceLabel: "Traveler documents",
      capabilities: ["logistics.sensitive"],
    })
    expect(message).toContain("logistics.sensitive")
    expect(message).not.toContain("passport")
    expect(message).not.toContain("exists")
  })

  it("annotates nav trees for viewers vs finance roles", () => {
    const items = [
      {
        label: "Commerce",
        href: "__commerce__",
        children: [
          { label: "Ticketing", href: "/admin/dashboard/ticketing" },
          { label: "Finances", href: "/admin/dashboard/finances" },
        ],
      },
    ]

    const asViewer = annotateNavTreeByCapabilities({
      items,
      capabilities: ["tour.view", "event.view", "ticketing.view"],
    })
    expect(asViewer[0].children?.[0].access.allowed).toBe(true)
    expect(asViewer[0].children?.[1].access.allowed).toBe(false)
    expect(asViewer[0].access.allowed).toBe(true)

    const asFinance = annotateNavTreeByCapabilities({
      items,
      capabilities: ["finance.view"],
    })
    expect(asFinance[0].children?.[1].access.allowed).toBe(true)
  })

  it("fails protected navigation closed until capabilities load", () => {
    expect(
      evaluateNavHrefAccess({
        href: "/admin/dashboard/finances",
        capabilities: null,
      }).allowed,
    ).toBe(false)
  })

  it("maps every canonical sidebar leaf and fails unknown Admin paths closed", () => {
    const sidebarHrefs = [
      "/admin/dashboard",
      "/admin/dashboard/tours",
      "/admin/dashboard/events",
      "/admin/dashboard/calendar",
      "/admin/dashboard/logistics",
      "/admin/dashboard/hiring",
      "/admin/dashboard/staff?tab=scheduling",
      "/admin/dashboard/applications",
      "/admin/dashboard/candidates",
      "/admin/dashboard/roster",
      "/admin/dashboard/organization",
      "/admin/dashboard/rbac",
      "/admin/dashboard/staff",
      "/admin/dashboard/ticketing",
      "/admin/dashboard/finances",
      "/admin/dashboard/marketplace",
      "/admin/dashboard/store",
      "/admin/dashboard/inventory",
      "/admin/dashboard/artists",
      "/admin/dashboard/venues",
      "/admin/dashboard/agencies",
      "/admin/dashboard/network",
      "/admin/dashboard/communications",
      "/admin/dashboard/publications/deliveries",
      "/admin/dashboard/content",
      "/admin/dashboard/music",
      "/admin/dashboard/epk",
      "/admin/dashboard/website",
      "/admin/dashboard/feed",
      "/admin/dashboard/analytics",
      "/admin/dashboard/connect",
      "/admin/dashboard/features",
      "/admin/dashboard/settings/audit",
      "/admin/dashboard/settings",
    ]

    for (const href of sidebarHrefs) expect(findNavCapabilityRule(href), href).not.toBeNull()
    expect(
      evaluateNavHrefAccess({
        href: "/admin/dashboard/unclassified-new-surface",
        capabilities: ["tour.view"],
      }).allowed,
    ).toBe(false)
  })
})
