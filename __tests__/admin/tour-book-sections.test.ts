/**
 * PUB-301 through PUB-303 — Tour book section contracts, recipient projections, offline packages.
 */

import { describe, it, expect } from "vitest"
import {
  // PUB-301
  TOUR_BOOK_SECTION_KEYS,
  SECTION_AUDIENCE_CLASS,
  SECTION_REQUIRED,
  SECTION_CONTRACT_VERSION,
  buildTourBookSection,
  summariseTourBookAssembly,
  type TourBookSection,
  type TourBookSectionKey,
  // PUB-302
  PROJECTION_POLICY_VERSION,
  projectSectionsForRecipient,
  assertNoProjectionLeak,
  // PUB-303
  SECTION_OFFLINE_POLICY,
  buildOfflinePackageManifest,
  offlinePackageIsUsable,
} from "@/lib/admin/tour-book-sections"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSection(
  key: TourBookSectionKey,
  payload: unknown = { data: "ok" },
): TourBookSection {
  const r = buildTourBookSection({ key, payload })
  if (!r.ok) throw new Error(`Failed to build section "${key}": ${r.detail}`)
  return r.section
}

// ---------------------------------------------------------------------------
// PUB-301: Section contracts
// ---------------------------------------------------------------------------

describe("PUB-301 — tour-book section contracts", () => {
  it("defines exactly 11 section keys", () => {
    expect(TOUR_BOOK_SECTION_KEYS).toHaveLength(11)
    expect(TOUR_BOOK_SECTION_KEYS).toContain("itinerary")
    expect(TOUR_BOOK_SECTION_KEYS).toContain("emergency")
    expect(TOUR_BOOK_SECTION_KEYS).toContain("tickets_credentials")
  })

  it("marks itinerary, contacts, emergency as required", () => {
    expect(SECTION_REQUIRED["itinerary"]).toBe(true)
    expect(SECTION_REQUIRED["contacts"]).toBe(true)
    expect(SECTION_REQUIRED["emergency"]).toBe(true)
  })

  it("marks advance and equipment as internal audience class", () => {
    expect(SECTION_AUDIENCE_CLASS["advance"]).toBe("internal")
    expect(SECTION_AUDIENCE_CLASS["equipment"]).toBe("internal")
  })

  it("marks travel and lodging as sensitive_traveler", () => {
    expect(SECTION_AUDIENCE_CLASS["travel"]).toBe("sensitive_traveler")
    expect(SECTION_AUDIENCE_CLASS["lodging"]).toBe("sensitive_traveler")
  })

  it("assigns v1 contract version to all sections", () => {
    for (const key of TOUR_BOOK_SECTION_KEYS) {
      expect(SECTION_CONTRACT_VERSION[key]).toBe("v1")
    }
  })

  it("builds a valid required section with payload", () => {
    const r = buildTourBookSection({
      key: "itinerary",
      payload: { stops: [{ city: "London" }] },
      source_refs: [{ record_type: "tour_stop", record_id: "s1", record_version: 2 }],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.section.key).toBe("itinerary")
      expect(r.section.required).toBe(true)
      expect(r.section.excluded).toBe(false)
      expect(r.section.source_refs).toHaveLength(1)
      expect(r.section.audience_class).toBe("worker")
    }
  })

  it("builds a valid optional excluded section", () => {
    const r = buildTourBookSection({
      key: "maps",
      payload: null,
      excluded: true,
      exclude_reason: "no_maps_this_tour",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.section.excluded).toBe(true)
      expect(r.section.exclude_reason).toBe("no_maps_this_tour")
    }
  })

  it("rejects excluding a required section", () => {
    const r = buildTourBookSection({
      key: "itinerary",
      payload: null,
      excluded: true,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("missing_required")
  })

  it("returns missing_required when required section has null payload", () => {
    const r = buildTourBookSection({ key: "emergency", payload: null })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe("missing_required")
      expect(r.key).toBe("emergency")
    }
  })

  it("returns missing_payload for optional section without explicit exclusion", () => {
    const r = buildTourBookSection({ key: "advance", payload: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("missing_payload")
  })

  it("summarises assembly: all ok when required sections have payloads", () => {
    const results = [
      buildTourBookSection({ key: "itinerary", payload: { stops: [] } }),
      buildTourBookSection({ key: "contacts", payload: { contacts: [] } }),
      buildTourBookSection({ key: "emergency", payload: { hotline: "555-0100" } }),
      buildTourBookSection({ key: "maps", payload: null, excluded: true }),
    ]
    const summary = summariseTourBookAssembly(results)
    expect(summary.ok).toBe(true)
    expect(summary.included_sections).toContain("itinerary")
    expect(summary.excluded_sections).toContain("maps")
    expect(summary.errors).toHaveLength(0)
  })

  it("summarises assembly: errors when required section is missing", () => {
    const results = [
      buildTourBookSection({ key: "itinerary", payload: null }),
      buildTourBookSection({ key: "contacts", payload: { contacts: [] } }),
      buildTourBookSection({ key: "emergency", payload: { hotline: "911" } }),
    ]
    const summary = summariseTourBookAssembly(results)
    expect(summary.ok).toBe(false)
    expect(summary.errors.some((e) => e.key === "itinerary")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// PUB-302: Recipient-specific projections
// ---------------------------------------------------------------------------

describe("PUB-302 — recipient-specific projections", () => {
  const allSections: TourBookSection[] = [
    makeSection("itinerary"),
    makeSection("contacts"),
    makeSection("travel"),
    makeSection("lodging"),
    makeSection("schedules"),
    makeSection("advance"),
    makeSection("equipment"),
    makeSection("tickets_credentials"),
    makeSection("emergency"),
    makeSection("hospitality"),
    // maps excluded
    buildTourBookSection({ key: "maps", payload: null, excluded: true }) as any,
  ].filter((r: any) => (r.ok !== undefined ? r.section : r)) as TourBookSection[]

  // Fix: use .section when from buildTourBookSection
  const sections: TourBookSection[] = [
    makeSection("itinerary"),
    makeSection("contacts"),
    makeSection("travel"),
    makeSection("lodging"),
    makeSection("schedules"),
    makeSection("advance"),
    makeSection("equipment"),
    makeSection("tickets_credentials"),
    makeSection("emergency"),
    makeSection("hospitality"),
  ]

  const mapsExcluded = (() => {
    const r = buildTourBookSection({ key: "maps", payload: null, excluded: true })
    if (!r.ok) throw new Error("unexpected")
    return r.section
  })()

  const all = [...sections, mapsExcluded]

  it("records projection policy version", () => {
    const manifest = projectSectionsForRecipient(sections, "worker")
    expect(manifest.projection_policy_version).toBe(PROJECTION_POLICY_VERSION)
    expect(manifest.recipient_class).toBe("worker")
  })

  it("internal recipient sees worker/department/public/financial/personnel/sensitive_traveler sections", () => {
    const manifest = projectSectionsForRecipient(sections, "internal")
    // All sections should be visible to internal
    expect(manifest.visible_section_keys).toContain("advance")
    expect(manifest.visible_section_keys).toContain("equipment")
    expect(manifest.visible_section_keys).toContain("travel")
    expect(manifest.visible_section_keys).toContain("lodging")
    expect(manifest.visible_section_keys).toContain("itinerary")
  })

  it("worker sees worker and public sections but NOT internal-only ones", () => {
    const manifest = projectSectionsForRecipient(sections, "worker")
    // advance and equipment are internal only
    expect(manifest.visible_section_keys).not.toContain("advance")
    expect(manifest.visible_section_keys).not.toContain("equipment")
    // itinerary is worker
    expect(manifest.visible_section_keys).toContain("itinerary")
    expect(manifest.visible_section_keys).toContain("schedules")
  })

  it("worker does NOT see sensitive_traveler sections (travel, lodging)", () => {
    const manifest = projectSectionsForRecipient(sections, "worker")
    expect(manifest.visible_section_keys).not.toContain("travel")
    expect(manifest.visible_section_keys).not.toContain("lodging")
  })

  it("sensitive_traveler recipient sees travel, lodging, worker sections", () => {
    const manifest = projectSectionsForRecipient(sections, "sensitive_traveler")
    expect(manifest.visible_section_keys).toContain("travel")
    expect(manifest.visible_section_keys).toContain("lodging")
    expect(manifest.visible_section_keys).toContain("itinerary")
    // but NOT internal
    expect(manifest.visible_section_keys).not.toContain("advance")
  })

  it("vendor sees only vendor and public sections", () => {
    const manifest = projectSectionsForRecipient(sections, "vendor")
    // itinerary is worker class — not in vendor visibility
    expect(manifest.visible_section_keys).not.toContain("itinerary")
    expect(manifest.visible_section_keys).not.toContain("advance")
    expect(manifest.visible_section_keys).not.toContain("travel")
  })

  it("excluded sections are hidden for all recipients with 'excluded_by_source' reason", () => {
    const manifest = projectSectionsForRecipient(all, "internal")
    const mapsEntry = manifest.sections.find((s) => s.key === "maps")
    expect(mapsEntry?.visible).toBe(false)
    expect(mapsEntry?.hidden_reason).toBe("excluded_by_source")
    expect(manifest.visible_section_keys).not.toContain("maps")
  })

  it("assertNoProjectionLeak: worker manifest has no internal-class leaks", () => {
    const internalManifest = projectSectionsForRecipient(sections, "internal")
    const workerManifest = projectSectionsForRecipient(sections, "worker")
    const check = assertNoProjectionLeak(internalManifest, workerManifest)
    expect(check.ok).toBe(true)
    expect(check.leaked_sections).toHaveLength(0)
  })

  it("assertNoProjectionLeak: vendor manifest has no worker-class leaks", () => {
    const internalManifest = projectSectionsForRecipient(sections, "internal")
    const vendorManifest = projectSectionsForRecipient(sections, "vendor")
    const check = assertNoProjectionLeak(internalManifest, vendorManifest)
    expect(check.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// PUB-303: Mobile/offline package
// ---------------------------------------------------------------------------

describe("PUB-303 — mobile/offline package", () => {
  const workerSections: TourBookSection[] = [
    makeSection("itinerary"),
    makeSection("contacts"),
    makeSection("schedules"),
    makeSection("emergency"),
    makeSection("hospitality"),
    makeSection("tickets_credentials"),
  ]

  const workerProjection = (() =>
    projectSectionsForRecipient(workerSections, "worker"))()

  it("cacheable sections have device_cacheable=true", () => {
    expect(SECTION_OFFLINE_POLICY["itinerary"]).toBe("cacheable")
    expect(SECTION_OFFLINE_POLICY["contacts"]).toBe("cacheable")
    expect(SECTION_OFFLINE_POLICY["emergency"]).toBe("cacheable")
    expect(SECTION_OFFLINE_POLICY["maps"]).toBe("cacheable")
  })

  it("sensitive_traveler sections are session_only (no persistent device cache)", () => {
    expect(SECTION_OFFLINE_POLICY["travel"]).toBe("session_only")
    expect(SECTION_OFFLINE_POLICY["lodging"]).toBe("session_only")
  })

  it("internal-only sections are no_cache", () => {
    expect(SECTION_OFFLINE_POLICY["advance"]).toBe("no_cache")
    expect(SECTION_OFFLINE_POLICY["equipment"]).toBe("no_cache")
  })

  it("builds a worker offline package with cacheable sections included", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 3,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: "2026-09-01T00:00:00.000Z",
      syncStatus: "current",
    })

    expect(pkg.sync_status).toBe("current")
    expect(pkg.snapshot_version).toBe(3)
    expect(pkg.expires_at).toBe("2026-09-01T00:00:00.000Z")
    expect(pkg.warning).toBeNull()

    const itinerary = pkg.sections.find((s) => s.key === "itinerary")
    expect(itinerary?.included).toBe(true)
    expect(itinerary?.device_cacheable).toBe(true)
  })

  it("omits internal-only sections from worker package", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: null,
      syncStatus: "current",
    })

    const advance = pkg.sections.find((s) => s.key === "advance")
    expect(advance?.included).toBe(false)
    expect(advance?.omit_reason).toBe("hidden_for_recipient")
  })

  it("tickets_credentials is session_only — included but not device_cacheable", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: null,
      syncStatus: "current",
    })

    const creds = pkg.sections.find((s) => s.key === "tickets_credentials")
    expect(creds?.included).toBe(true)
    expect(creds?.device_cacheable).toBe(false)
  })

  it("encryption_hint is device_keychain when package contains session_only sections", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: null,
      syncStatus: "current",
    })
    expect(pkg.encryption_hint).toBe("device_keychain")
  })

  it("encryption_hint is none when no session_only sections are included", () => {
    // Use a projection with only cacheable sections for the worker
    const cacheOnlySections: TourBookSection[] = [
      makeSection("itinerary"),
      makeSection("contacts"),
      makeSection("emergency"),
    ]
    const projection = projectSectionsForRecipient(cacheOnlySections, "worker")
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: projection,
      expiresAt: null,
      syncStatus: "current",
    })
    expect(pkg.encryption_hint).toBe("none")
  })

  it("superseded package shows warning and is still usable for reading", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: null,
      syncStatus: "superseded",
    })
    expect(pkg.warning).toMatch(/superseded/i)
    expect(offlinePackageIsUsable(pkg, Date.now())).toBe(true)
  })

  it("revoked package shows warning and is NOT usable", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: null,
      syncStatus: "revoked",
    })
    expect(pkg.warning).toMatch(/revoked/i)
    expect(offlinePackageIsUsable(pkg, Date.now())).toBe(false)
  })

  it("expired package (past expires_at) is NOT usable", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: "2020-01-01T00:00:00.000Z",
      syncStatus: "stale",
    })
    expect(offlinePackageIsUsable(pkg, Date.parse("2026-08-20T00:00:00.000Z"))).toBe(false)
  })

  it("current package within expiry is usable", () => {
    const pkg = buildOfflinePackageManifest({
      publicationId: "pub1",
      snapshotId: "snap1",
      snapshotVersion: 1,
      recipientClass: "worker",
      projectionManifest: workerProjection,
      expiresAt: "2030-01-01T00:00:00.000Z",
      syncStatus: "current",
    })
    expect(offlinePackageIsUsable(pkg, Date.parse("2026-08-20T00:00:00.000Z"))).toBe(true)
  })
})
