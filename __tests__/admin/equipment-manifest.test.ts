import { describe, expect, it } from "vitest"

import {
  addCaseContentsVersion,
  approveManifest,
  assertCaseStatusTransition,
  assertManifestStatusTransition,
  buildManifestLineSummary,
  canTransitionCaseStatus,
  canTransitionManifestStatus,
  CaseStatusTransitionError,
  evaluateManifestReadiness,
  getCurrentCaseContents,
  isCaseMutable,
  isManifestMutable,
  ManifestStatusTransitionError,
  publishManifest,
  removeManifestLineItem,
  sealCase,
  supersedManifest,
  upsertManifestLineItem,
  type CaseContentEntry,
  type EquipmentCase,
  type EquipmentManifest,
  type ManifestLineItem,
} from "@/lib/admin/equipment-manifest"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeCase(overrides: Partial<EquipmentCase> = {}): EquipmentCase {
  return {
    id: "case-1",
    org_id: "org-1",
    name: "FOH Patch Case",
    barcode: "BC-001",
    asset_tag: null,
    category: "audio",
    status: "draft",
    current_version: 1,
    versions: [
      {
        version: 1,
        created_at: "2025-01-01T00:00:00Z",
        created_by: "user-1",
        is_sealed: false,
        contents: [],
        checksum: null,
      },
    ],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeLineItem(overrides: Partial<ManifestLineItem> = {}): ManifestLineItem {
  return {
    id: overrides.id ?? "line-1",
    source_id: "item-1",
    source_type: "org_catalog",
    label: overrides.label ?? "Shure SM58",
    quantity_required: overrides.quantity_required ?? 4,
    quantity_sourced: overrides.quantity_sourced ?? 4,
    alternates: [],
    department: overrides.department ?? "FOH Audio",
    responsible_role: overrides.responsible_role ?? "A1",
    notes: null,
    is_sourced: overrides.is_sourced ?? true,
    ...overrides,
  }
}

function makeManifest(overrides: Partial<EquipmentManifest> = {}): EquipmentManifest {
  return {
    id: "manifest-1",
    org_id: "org-1",
    tour_id: "tour-1",
    version: "1.0",
    department: "FOH Audio",
    title: "FOH Audio Manifest v1.0",
    status: "draft",
    line_items: overrides.line_items ?? [makeLineItem()],
    approval: null,
    published_snapshots: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    created_by: "user-1",
    ...overrides,
  }
}

// ============================================================================
// PART 1 — Cases
// ============================================================================

describe("EQUIP-302 case status transitions", () => {
  it("allows draft → sealed", () => {
    expect(canTransitionCaseStatus("draft", "sealed")).toBe(true)
  })

  it("allows sealed → open → sealed (re-seal cycle)", () => {
    expect(canTransitionCaseStatus("sealed", "open")).toBe(true)
    expect(canTransitionCaseStatus("open", "sealed")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionCaseStatus("draft", "draft")).toBe(true)
  })

  it("rejects transition from retired (terminal)", () => {
    expect(canTransitionCaseStatus("retired", "draft")).toBe(false)
    expect(() => assertCaseStatusTransition("retired", "draft")).toThrow(CaseStatusTransitionError)
  })

  it("rejects sealed → draft directly", () => {
    expect(canTransitionCaseStatus("sealed", "draft")).toBe(false)
  })
})

describe("EQUIP-302 case mutability", () => {
  it("draft case is mutable", () => {
    expect(isCaseMutable(makeCase({ status: "draft" }))).toBe(true)
  })

  it("open case is mutable", () => {
    expect(isCaseMutable(makeCase({ status: "open" }))).toBe(true)
  })

  it("sealed case is not mutable", () => {
    expect(isCaseMutable(makeCase({ status: "sealed" }))).toBe(false)
  })

  it("retired case is not mutable", () => {
    expect(isCaseMutable(makeCase({ status: "retired" }))).toBe(false)
  })
})

describe("EQUIP-302 case contents versioning", () => {
  const contents: CaseContentEntry[] = [
    { catalog_item_id: "item-1", quantity: 2, slot_label: "Bay A", packing_notes: null },
    { catalog_item_id: "item-2", quantity: 1, slot_label: "Bay B", packing_notes: "fragile" },
  ]

  it("adds a new contents version to a draft case", () => {
    const c = makeCase()
    const updated = addCaseContentsVersion(c, contents, "user-1", "2025-02-01T00:00:00Z")
    expect(updated.current_version).toBe(2)
    expect(updated.versions).toHaveLength(2)
    expect(getCurrentCaseContents(updated)?.contents).toHaveLength(2)
  })

  it("is immutable (original case unchanged)", () => {
    const c = makeCase()
    addCaseContentsVersion(c, contents, "user-1", "2025-02-01T00:00:00Z")
    expect(c.current_version).toBe(1)
  })

  it("throws when adding contents to a sealed case", () => {
    const c = makeCase({ status: "sealed" })
    expect(() => addCaseContentsVersion(c, contents, "user-1", "2025-02-01T00:00:00Z")).toThrow(
      /immutable/,
    )
  })

  it("seals a draft case and marks current version as sealed", () => {
    const c = makeCase()
    const sealed = sealCase(c, "2025-03-01T00:00:00Z")
    expect(sealed.status).toBe("sealed")
    const activeVersion = getCurrentCaseContents(sealed)
    expect(activeVersion?.is_sealed).toBe(true)
  })

  it("throws when sealing an already-sealed case", () => {
    const c = makeCase({ status: "sealed" })
    expect(() => sealCase(c, "2025-03-01T00:00:00Z")).toThrow()
  })

  it("getCurrentCaseContents returns null for empty versions", () => {
    const c = makeCase({ versions: [], current_version: 99 })
    expect(getCurrentCaseContents(c)).toBeNull()
  })
})

// ============================================================================
// PART 2 — Manifests
// ============================================================================

describe("EQUIP-302 manifest status transitions", () => {
  it("allows draft → submitted → approved → published", () => {
    expect(canTransitionManifestStatus("draft", "submitted")).toBe(true)
    expect(canTransitionManifestStatus("submitted", "approved")).toBe(true)
    expect(canTransitionManifestStatus("approved", "published")).toBe(true)
  })

  it("allows submitted → draft (send back for revision)", () => {
    expect(canTransitionManifestStatus("submitted", "draft")).toBe(true)
  })

  it("allows published → superseded → archived", () => {
    expect(canTransitionManifestStatus("published", "superseded")).toBe(true)
    expect(canTransitionManifestStatus("superseded", "archived")).toBe(true)
  })

  it("rejects mutation of terminal states", () => {
    expect(canTransitionManifestStatus("archived", "draft")).toBe(false)
    expect(() => assertManifestStatusTransition("archived", "draft")).toThrow(
      ManifestStatusTransitionError,
    )
  })
})

describe("EQUIP-302 manifest mutability", () => {
  it("draft is mutable", () => expect(isManifestMutable(makeManifest({ status: "draft" }))).toBe(true))
  it("submitted is mutable (status-wise)", () => expect(isManifestMutable(makeManifest({ status: "submitted" }))).toBe(true))
  it("published is immutable", () => expect(isManifestMutable(makeManifest({ status: "published" }))).toBe(false))
  it("superseded is immutable", () => expect(isManifestMutable(makeManifest({ status: "superseded" }))).toBe(false))
  it("archived is immutable", () => expect(isManifestMutable(makeManifest({ status: "archived" }))).toBe(false))
})

describe("EQUIP-302 manifest line item mutations", () => {
  it("adds a new line item to a draft manifest", () => {
    const m = makeManifest({ line_items: [] })
    const item = makeLineItem({ id: "line-2", label: "DI Box" })
    const updated = upsertManifestLineItem(m, item, "2025-02-01T00:00:00Z")
    expect(updated.line_items).toHaveLength(1)
    expect(updated.line_items[0].label).toBe("DI Box")
  })

  it("replaces an existing line item by id", () => {
    const m = makeManifest()
    const replacement = makeLineItem({ id: "line-1", label: "Updated SM58", quantity_required: 6, quantity_sourced: 6 })
    const updated = upsertManifestLineItem(m, replacement, "2025-02-01T00:00:00Z")
    expect(updated.line_items).toHaveLength(1)
    expect(updated.line_items[0].label).toBe("Updated SM58")
  })

  it("throws when editing a published manifest", () => {
    const m = makeManifest({ status: "published" })
    expect(() => upsertManifestLineItem(m, makeLineItem(), "2025-02-01T00:00:00Z")).toThrow(
      /published|immutable/,
    )
  })

  it("throws when adding items to a submitted manifest (must revert to draft)", () => {
    const m = makeManifest({ status: "submitted" })
    expect(() => upsertManifestLineItem(m, makeLineItem({ id: "new" }), "2025-02-01T00:00:00Z")).toThrow(
      /submitted/,
    )
  })

  it("removes a line item from a draft manifest", () => {
    const m = makeManifest()
    const updated = removeManifestLineItem(m, "line-1", "2025-02-01T00:00:00Z")
    expect(updated.line_items).toHaveLength(0)
  })

  it("throws when removing a line item from a published manifest", () => {
    const m = makeManifest({ status: "published" })
    expect(() => removeManifestLineItem(m, "line-1", "2025-02-01T00:00:00Z")).toThrow()
  })
})

describe("EQUIP-302 manifest readiness", () => {
  it("is ready when all items sourced and catalogued", () => {
    const m = makeManifest()
    const result = evaluateManifestReadiness(m)
    expect(result.ready).toBe(true)
  })

  it("is not ready when manifest is empty", () => {
    const m = makeManifest({ line_items: [] })
    const result = evaluateManifestReadiness(m)
    expect(result.ready).toBe(false)
    expect(result.issues[0].code).toBe("empty_manifest")
  })

  it("flags unsourced items", () => {
    const m = makeManifest({
      line_items: [makeLineItem({ quantity_required: 4, quantity_sourced: 2, is_sourced: false })],
    })
    const result = evaluateManifestReadiness(m)
    expect(result.ready).toBe(false)
    expect(result.issues.some((i) => i.code === "unsourced_required_items")).toBe(true)
  })

  it("flags manual uncatalogued items", () => {
    const m = makeManifest({
      line_items: [
        makeLineItem({
          source_type: "manual",
          source_id: null,
          is_sourced: true,
          responsible_role: "A1",
        }),
      ],
    })
    const result = evaluateManifestReadiness(m)
    expect(result.ready).toBe(false)
    expect(result.issues.some((i) => i.code === "manual_items_not_catalogued")).toBe(true)
  })

  it("flags missing responsible role", () => {
    const m = makeManifest({
      line_items: [makeLineItem({ responsible_role: null })],
    })
    const result = evaluateManifestReadiness(m)
    expect(result.ready).toBe(false)
    expect(result.issues.some((i) => i.code === "missing_responsible_role")).toBe(true)
  })
})

describe("EQUIP-302 manifest approval and publish", () => {
  it("approves a ready submitted manifest", () => {
    const m = makeManifest({ status: "submitted" })
    const approved = approveManifest(m, {
      approved_by: "user-mgr",
      approved_at: "2025-03-01T00:00:00Z",
      notes: "All confirmed",
    })
    expect(approved.status).toBe("approved")
    expect(approved.approval?.approved_by).toBe("user-mgr")
  })

  it("throws approval when manifest is not in submitted state", () => {
    const m = makeManifest({ status: "draft" })
    expect(() =>
      approveManifest(m, { approved_by: "user-mgr", approved_at: "2025-03-01T00:00:00Z", notes: null }),
    ).toThrow(/submitted/)
  })

  it("throws approval when readiness checks fail", () => {
    const m = makeManifest({
      status: "submitted",
      line_items: [makeLineItem({ quantity_sourced: 0, is_sourced: false })],
    })
    expect(() =>
      approveManifest(m, { approved_by: "user-mgr", approved_at: "2025-03-01T00:00:00Z", notes: null }),
    ).toThrow()
  })

  it("publishes an approved manifest and creates immutable snapshot", () => {
    const m = makeManifest({ status: "approved" })
    const published = publishManifest(m, "user-pub", "2025-04-01T00:00:00Z")
    expect(published.status).toBe("published")
    expect(published.published_snapshots).toHaveLength(1)
    expect(published.published_snapshots[0].publish_version).toBe(1)
    expect(published.published_snapshots[0].published_by).toBe("user-pub")
  })

  it("throws publish when manifest is not approved", () => {
    const m = makeManifest({ status: "draft" })
    expect(() => publishManifest(m, "user-pub", "2025-04-01T00:00:00Z")).toThrow(/approved/)
  })

  it("snapshot line_items reference is frozen at publish time (structural copy)", () => {
    const m = makeManifest({ status: "approved" })
    const published = publishManifest(m, "user-pub", "2025-04-01T00:00:00Z")
    expect(published.published_snapshots[0].line_items).toHaveLength(1)
  })
})

describe("EQUIP-302 manifest supersede", () => {
  it("creates superseded + new draft from a published manifest", () => {
    const m = makeManifest({ status: "published" })
    const { superseded, newDraft } = supersedManifest(m, "2.0", "user-1", "2025-05-01T00:00:00Z")
    expect(superseded.status).toBe("superseded")
    expect(newDraft.status).toBe("draft")
    expect(newDraft.version).toBe("2.0")
    expect(newDraft.approval).toBeNull()
    expect(newDraft.published_snapshots).toHaveLength(0)
  })

  it("throws supersede when manifest is not published", () => {
    const m = makeManifest({ status: "approved" })
    expect(() => supersedManifest(m, "2.0", "user-1", "2025-05-01T00:00:00Z")).toThrow(
      /published/,
    )
  })
})

describe("EQUIP-302 manifest line summary", () => {
  it("correctly summarises sourced/unsourced lines and quantities", () => {
    const m = makeManifest({
      line_items: [
        makeLineItem({ id: "l1", quantity_required: 4, quantity_sourced: 4, is_sourced: true, department: "Audio" }),
        makeLineItem({ id: "l2", quantity_required: 2, quantity_sourced: 1, is_sourced: false, department: "Lighting" }),
      ],
    })
    const summary = buildManifestLineSummary(m)
    expect(summary.total_lines).toBe(2)
    expect(summary.sourced_lines).toBe(1)
    expect(summary.unsourced_lines).toBe(1)
    expect(summary.total_quantity_required).toBe(6)
    expect(summary.total_quantity_sourced).toBe(5)
    expect(summary.departments).toEqual(["Audio", "Lighting"])
    expect(summary.has_manual_uncatalogued).toBe(false)
  })

  it("flags manual uncatalogued in summary", () => {
    const m = makeManifest({
      line_items: [
        makeLineItem({ source_type: "manual", source_id: null, is_sourced: true }),
      ],
    })
    expect(buildManifestLineSummary(m).has_manual_uncatalogued).toBe(true)
  })

  it("returns zero counts for empty manifest", () => {
    const m = makeManifest({ line_items: [] })
    const s = buildManifestLineSummary(m)
    expect(s.total_lines).toBe(0)
    expect(s.departments).toHaveLength(0)
  })
})
