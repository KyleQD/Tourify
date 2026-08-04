import { describe, it, expect } from "vitest"
import {
  checkFreezeReadiness,
  freezeAdvanceVersion,
  diffFrozenVersions,
  buildExportPackageManifest,
  summarizeExportManifest,
  type FrozenAdvanceVersion,
  type FrozenSectionSnapshot,
} from "../../lib/admin/advance-freeze-export"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const APPROVED_SECTIONS: FrozenSectionSnapshot[] = [
  { template_section_id: "s1", title: "Venue Details", section_version_hash: "hash-s1-v1", was_approved: true, had_open_variances: false },
  { template_section_id: "s2", title: "Production", section_version_hash: "hash-s2-v1", was_approved: true, had_open_variances: false },
  { template_section_id: "s3", title: "Staffing", section_version_hash: "hash-s3-v1", was_approved: true, had_open_variances: false },
  { template_section_id: "s4", title: "Local Contacts", section_version_hash: "hash-s4-v1", was_approved: true, had_open_variances: false },
]

function baseVersion(overrides: Partial<FrozenAdvanceVersion> = {}): FrozenAdvanceVersion {
  return {
    id: "fv-1",
    org_id: "org-1",
    advance_id: "adv-1",
    event_id: "ev-1",
    version_number: 1,
    status: "frozen",
    sections: APPROVED_SECTIONS,
    content_checksum: "chk-abc123",
    frozen_by: "user-pm",
    frozen_at: "2025-08-01T00:00:00Z",
    created_at: "2025-08-01T00:00:00Z",
    updated_at: "2025-08-01T00:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// checkFreezeReadiness
// ---------------------------------------------------------------------------

describe("checkFreezeReadiness", () => {
  it("is ready when all sections approved and no blocking variances", () => {
    const r = checkFreezeReadiness(APPROVED_SECTIONS, false)
    expect(r.ready).toBe(true)
    expect(r.blocking_reasons).toHaveLength(0)
  })

  it("blocks when any section is not approved", () => {
    const sections: FrozenSectionSnapshot[] = [
      ...APPROVED_SECTIONS.slice(0, 2),
      { template_section_id: "s3", title: "Staffing", section_version_hash: "h", was_approved: false, had_open_variances: false },
    ]
    const r = checkFreezeReadiness(sections, false)
    expect(r.ready).toBe(false)
    expect(r.blocking_reasons[0]).toMatch(/Staffing/)
  })

  it("blocks when blocking variances exist", () => {
    const r = checkFreezeReadiness(APPROVED_SECTIONS, true)
    expect(r.ready).toBe(false)
    expect(r.blocking_reasons[0]).toMatch(/variances/)
  })
})

// ---------------------------------------------------------------------------
// freezeAdvanceVersion
// ---------------------------------------------------------------------------

describe("freezeAdvanceVersion", () => {
  it("creates version 1 with no previous", () => {
    const { previous, frozen } = freezeAdvanceVersion(undefined, {
      id: "fv-1",
      org_id: "org-1",
      advance_id: "adv-1",
      event_id: "ev-1",
      sections: APPROVED_SECTIONS,
      content_checksum: "chk-abc",
      frozen_by: "user-pm",
      now: "2025-08-01T00:00:00Z",
    })
    expect(previous).toBeUndefined()
    expect(frozen.version_number).toBe(1)
    expect(frozen.status).toBe("frozen")
    expect(frozen.previous_version_id).toBeUndefined()
  })

  it("creates version 2 and supersedes version 1", () => {
    const v1 = baseVersion()
    const { previous, frozen } = freezeAdvanceVersion(v1, {
      id: "fv-2",
      org_id: "org-1",
      advance_id: "adv-1",
      event_id: "ev-1",
      sections: APPROVED_SECTIONS,
      content_checksum: "chk-def",
      frozen_by: "user-pm",
      now: "2025-09-01T00:00:00Z",
    })
    expect(previous?.status).toBe("superseded")
    expect(previous?.id).toBe("fv-1")
    expect(frozen.version_number).toBe(2)
    expect(frozen.previous_version_id).toBe("fv-1")
    expect(frozen.status).toBe("frozen")
  })

  it("records frozen_at and frozen_by", () => {
    const { frozen } = freezeAdvanceVersion(undefined, {
      id: "fv-1", org_id: "org-1", advance_id: "adv-1", event_id: "ev-1",
      sections: APPROVED_SECTIONS, content_checksum: "chk",
      frozen_by: "user-director", now: "2025-08-01T00:00:00Z",
    })
    expect(frozen.frozen_by).toBe("user-director")
    expect(frozen.frozen_at).toBe("2025-08-01T00:00:00Z")
  })
})

// ---------------------------------------------------------------------------
// diffFrozenVersions
// ---------------------------------------------------------------------------

describe("diffFrozenVersions", () => {
  it("reports unchanged when sections are identical", () => {
    const v2 = baseVersion({ id: "fv-2", version_number: 2 })
    const diff = diffFrozenVersions(baseVersion(), v2)
    expect(diff.every((e) => e.diff_status === "unchanged")).toBe(true)
  })

  it("detects updated section", () => {
    const v2sections: FrozenSectionSnapshot[] = [
      ...APPROVED_SECTIONS.slice(0, 1),
      { template_section_id: "s2", title: "Production", section_version_hash: "hash-s2-v2", was_approved: true, had_open_variances: false },
      ...APPROVED_SECTIONS.slice(2),
    ]
    const v2 = baseVersion({ id: "fv-2", version_number: 2, sections: v2sections })
    const diff = diffFrozenVersions(baseVersion(), v2)
    const updated = diff.find((e) => e.diff_status === "updated")
    expect(updated?.template_section_id).toBe("s2")
    expect(updated?.previous_hash).toBe("hash-s2-v1")
    expect(updated?.current_hash).toBe("hash-s2-v2")
  })

  it("detects added section", () => {
    const v2sections: FrozenSectionSnapshot[] = [
      ...APPROVED_SECTIONS,
      { template_section_id: "s5", title: "Security", section_version_hash: "hash-s5-v1", was_approved: true, had_open_variances: false },
    ]
    const v2 = baseVersion({ id: "fv-2", version_number: 2, sections: v2sections })
    const diff = diffFrozenVersions(baseVersion(), v2)
    expect(diff.find((e) => e.diff_status === "added")?.template_section_id).toBe("s5")
  })

  it("detects removed section", () => {
    const v2sections = APPROVED_SECTIONS.slice(0, 3)  // s4 removed
    const v2 = baseVersion({ id: "fv-2", version_number: 2, sections: v2sections })
    const diff = diffFrozenVersions(baseVersion(), v2)
    expect(diff.find((e) => e.diff_status === "removed")?.template_section_id).toBe("s4")
  })
})

// ---------------------------------------------------------------------------
// buildExportPackageManifest
// ---------------------------------------------------------------------------

describe("buildExportPackageManifest", () => {
  it("advance.manage sees all sections", () => {
    const manifest = buildExportPackageManifest(baseVersion(), "web", "advance.manage", "2025-08-01T00:00:00Z")
    expect(manifest.sections.every((s) => s.included)).toBe(true)
    expect(manifest.format).toBe("web")
    expect(manifest.capability).toBe("advance.manage")
  })

  it("event.live_ops sees only crew-relevant sections", () => {
    const manifest = buildExportPackageManifest(baseVersion(), "web", "event.live_ops", "2025-08-01T00:00:00Z")
    const excluded = manifest.sections.filter((s) => !s.included)
    expect(excluded.length).toBeGreaterThan(0)
    expect(excluded.some((s) => s.exclusion_reason === "capability_restricted")).toBe(true)
  })

  it("includes ros_feed_section_ids from relevant sections", () => {
    const manifest = buildExportPackageManifest(baseVersion(), "web", "advance.manage")
    // Production and Staffing should feed ROS
    expect(manifest.ros_feed_section_ids).toContain("s2") // Production
    expect(manifest.ros_feed_section_ids).toContain("s3") // Staffing
  })

  it("records content_checksum from frozen version", () => {
    const manifest = buildExportPackageManifest(baseVersion(), "pdf", "event.publish")
    expect(manifest.content_checksum).toBe("chk-abc123")
  })
})

// ---------------------------------------------------------------------------
// summarizeExportManifest
// ---------------------------------------------------------------------------

describe("summarizeExportManifest", () => {
  it("counts included/excluded correctly", () => {
    const manifest = buildExportPackageManifest(baseVersion(), "web", "event.live_ops")
    const summary = summarizeExportManifest(manifest)
    expect(summary.total_sections).toBe(4)
    expect(summary.included + summary.excluded).toBe(4)
  })
})
