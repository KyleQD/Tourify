import { describe, expect, it } from "vitest"

import {
  assertAssetStatusTransition,
  AssetStatusTransitionError,
  buildCatalogSummary,
  canTransitionAssetStatus,
  evaluateServiceDue,
  projectEquipmentCatalogItem,
  validateEquipmentCatalogItem,
  type EquipmentCatalogItem,
} from "@/lib/admin/equipment-catalog"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<EquipmentCatalogItem> = {}): EquipmentCatalogItem {
  return {
    id: overrides.id ?? "item-1",
    org_id: "org-1",
    name: overrides.name ?? "Shure SM58 #1",
    manufacturer: "Shure",
    model: "SM58",
    serial_number: overrides.serial_number ?? "SN-001",
    asset_tag: overrides.asset_tag ?? "TAG-001",
    category: overrides.category ?? "audio",
    asset_type: overrides.asset_type ?? "microphone",
    ownership: overrides.ownership ?? "owned",
    vendor_id: overrides.vendor_id ?? null,
    quantity: overrides.quantity ?? 1,
    dimensions: overrides.dimensions ?? {
      height_cm: 18,
      width_cm: 5,
      depth_cm: 5,
      weight_kg: 0.3,
    },
    status: overrides.status ?? "available",
    service_due_date: overrides.service_due_date ?? null,
    condition_notes: overrides.condition_notes ?? null,
    financial: overrides.financial ?? {
      purchase_price: 120,
      insured_value: 150,
      replacement_cost: 130,
      currency: "USD",
    },
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    updated_by: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

describe("EQUIP-301 asset status transitions", () => {
  it("allows standard forward transitions", () => {
    expect(canTransitionAssetStatus("available", "reserved")).toBe(true)
    expect(canTransitionAssetStatus("reserved", "deployed")).toBe(true)
    expect(canTransitionAssetStatus("deployed", "in_service")).toBe(true)
    expect(canTransitionAssetStatus("in_service", "available")).toBe(true)
  })

  it("allows damage and loss transitions", () => {
    expect(canTransitionAssetStatus("deployed", "damaged")).toBe(true)
    expect(canTransitionAssetStatus("damaged", "in_service")).toBe(true)
    expect(canTransitionAssetStatus("deployed", "lost")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionAssetStatus("available", "available")).toBe(true)
    expect(canTransitionAssetStatus("retired", "retired")).toBe(true)
  })

  it("rejects transitions from terminal states", () => {
    expect(canTransitionAssetStatus("retired", "available")).toBe(false)
    expect(canTransitionAssetStatus("lost", "in_service")).toBe(false)
    expect(() =>
      assertAssetStatusTransition("retired", "available"),
    ).toThrow(AssetStatusTransitionError)
  })

  it("rejects backwards transitions that are not in the allow-list", () => {
    expect(canTransitionAssetStatus("in_service", "deployed")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("EQUIP-301 validation", () => {
  it("passes a complete valid item", () => {
    const result = validateEquipmentCatalogItem(makeItem())
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it("rejects missing name", () => {
    const result = validateEquipmentCatalogItem(makeItem({ name: "" }))
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === "missing_name")).toBe(true)
  })

  it("rejects invalid category", () => {
    const result = validateEquipmentCatalogItem(makeItem({ category: "magic_stuff" as never }))
    expect(result.valid).toBe(false)
    expect(result.issues[0].code).toBe("missing_category")
  })

  it("requires vendor_id when ownership is vendor", () => {
    const result = validateEquipmentCatalogItem(
      makeItem({ ownership: "vendor", vendor_id: null }),
    )
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === "vendor_id_required_for_vendor_ownership")).toBe(true)
  })

  it("rejects quantity > 1 on serialized assets", () => {
    const result = validateEquipmentCatalogItem(
      makeItem({ serial_number: "SN-001", quantity: 5 }),
    )
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === "invalid_quantity_for_serialized")).toBe(true)
  })

  it("rejects negative quantity", () => {
    const result = validateEquipmentCatalogItem(makeItem({ quantity: -1 }))
    expect(result.issues.some((i) => i.code === "negative_quantity")).toBe(true)
  })

  it("rejects negative dimensions", () => {
    const result = validateEquipmentCatalogItem(
      makeItem({ dimensions: { height_cm: -5, width_cm: 10, depth_cm: 10, weight_kg: 0.5 } }),
    )
    expect(result.issues.some((i) => i.code === "negative_dimension")).toBe(true)
  })

  it("rejects negative financial values", () => {
    const result = validateEquipmentCatalogItem(
      makeItem({
        financial: {
          purchase_price: -100,
          insured_value: 150,
          replacement_cost: 130,
          currency: "USD",
        },
      }),
    )
    expect(result.issues.some((i) => i.code === "negative_financial_value")).toBe(true)
  })

  it("rejects invalid service_due_date format", () => {
    const result = validateEquipmentCatalogItem(
      makeItem({ service_due_date: "not-a-date" }),
    )
    expect(result.issues.some((i) => i.code === "invalid_service_date_format")).toBe(true)
  })

  it("accepts null service_due_date (unscheduled)", () => {
    const result = validateEquipmentCatalogItem(makeItem({ service_due_date: null }))
    expect(result.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Financial projection
// ---------------------------------------------------------------------------

describe("EQUIP-301 financial projection", () => {
  it("includes financial data when caller has finance capability", () => {
    const item = makeItem()
    const projected = projectEquipmentCatalogItem(item, true)
    expect("financial" in projected).toBe(true)
    if ("financial" in projected) {
      expect(projected.financial?.purchase_price).toBe(120)
    }
  })

  it("strips financial data when caller lacks finance capability", () => {
    const item = makeItem()
    const projected = projectEquipmentCatalogItem(item, false)
    expect("financial" in projected).toBe(false)
  })

  it("still returns non-financial fields for non-finance callers", () => {
    const item = makeItem()
    const projected = projectEquipmentCatalogItem(item, false)
    expect(projected.name).toBe("Shure SM58 #1")
    expect(projected.serial_number).toBe("SN-001")
    expect(projected.status).toBe("available")
  })
})

// ---------------------------------------------------------------------------
// Service-due evaluation
// ---------------------------------------------------------------------------

describe("EQUIP-301 service-due evaluation", () => {
  it("returns overdue when past service date", () => {
    expect(evaluateServiceDue("2024-01-01", "2025-06-01")).toBe("overdue")
  })

  it("returns due_soon within warn window", () => {
    expect(evaluateServiceDue("2025-06-20", "2025-06-01", 30)).toBe("due_soon")
  })

  it("returns ok when service date is far out", () => {
    expect(evaluateServiceDue("2026-12-31", "2025-06-01")).toBe("ok")
  })

  it("returns unknown for null service date", () => {
    expect(evaluateServiceDue(null, "2025-06-01")).toBe("unknown")
  })

  it("returns unknown for invalid date strings", () => {
    expect(evaluateServiceDue("not-a-date", "2025-06-01")).toBe("unknown")
  })
})

// ---------------------------------------------------------------------------
// Catalog summary
// ---------------------------------------------------------------------------

describe("EQUIP-301 catalog summary", () => {
  const TODAY = "2025-06-01"

  const items: EquipmentCatalogItem[] = [
    makeItem({ id: "i1", category: "audio",    status: "available",  ownership: "owned",  serial_number: "SN-1", service_due_date: "2024-01-01" }), // overdue
    makeItem({ id: "i2", category: "audio",    status: "deployed",   ownership: "owned",  serial_number: "SN-2", service_due_date: "2025-06-15" }), // due_soon
    makeItem({ id: "i3", category: "lighting", status: "in_service", ownership: "leased", serial_number: null,   service_due_date: null }),
    makeItem({ id: "i4", category: "lighting", status: "retired",    ownership: "vendor", vendor_id: "vnd-1", serial_number: null, service_due_date: "2026-01-01" }),
  ]

  it("counts total, by category, by status, by ownership", () => {
    const summary = buildCatalogSummary(items, TODAY)
    expect(summary.total).toBe(4)
    expect(summary.by_category.audio).toBe(2)
    expect(summary.by_category.lighting).toBe(2)
    expect(summary.by_status.available).toBe(1)
    expect(summary.by_status.deployed).toBe(1)
    expect(summary.by_status.in_service).toBe(1)
    expect(summary.by_status.retired).toBe(1)
    expect(summary.by_ownership.owned).toBe(2)
    expect(summary.by_ownership.leased).toBe(1)
    expect(summary.by_ownership.vendor).toBe(1)
  })

  it("identifies overdue and due_soon service counts", () => {
    const summary = buildCatalogSummary(items, TODAY)
    expect(summary.overdue_service_count).toBe(1)
    expect(summary.due_soon_count).toBe(1)
  })

  it("counts serialized assets correctly", () => {
    const summary = buildCatalogSummary(items, TODAY)
    expect(summary.serialized_count).toBe(2)
  })

  it("handles empty catalog", () => {
    const summary = buildCatalogSummary([], TODAY)
    expect(summary.total).toBe(0)
    expect(summary.overdue_service_count).toBe(0)
  })
})
