/**
 * EQUIP-301 — Organization equipment catalog.
 *
 * Models the static/master record for every physical asset or asset type an
 * organization owns, leases, or rents from a vendor. This is the system of
 * record for identity, dimensions, ownership, state, and service schedule.
 *
 * Equipment manifests, movements, and custody events reference catalog items
 * by ID; they never replicate catalog state.
 *
 * Financial fields (purchase_price, insured_value, replacement_cost) are
 * marked `sensitive` — the caller must hold `can_finance` capability before
 * projecting them. Helpers enforce this; UI must not expose raw values without
 * a capability check.
 *
 * All helpers are pure (no I/O).
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * How the organization controls this asset.
 *  - `owned`      – Purchased; organization holds title.
 *  - `leased`     – Long-term lease; organization is responsible party.
 *  - `vendor`     – Rented or loaned per-tour from a third-party vendor.
 */
export const EQUIPMENT_OWNERSHIP_TYPES = ["owned", "leased", "vendor"] as const
export type EquipmentOwnershipType = (typeof EQUIPMENT_OWNERSHIP_TYPES)[number]

/**
 * Broad asset categories for grouping and manifest filtering.
 * Mirrors common touring domains; extend with `custom` for org-specific types.
 */
export const EQUIPMENT_ASSET_CATEGORIES = [
  "audio",
  "lighting",
  "video",
  "staging",
  "rigging",
  "backline",
  "power_distro",
  "communications",
  "transportation_gear",
  "merchandise",
  "production_office",
  "medical",
  "other",
] as const
export type EquipmentAssetCategory = (typeof EQUIPMENT_ASSET_CATEGORIES)[number]

/**
 * Current operational state of the asset.
 *  - `available`         – Ready to assign or include in a manifest.
 *  - `reserved`          – Assigned to a manifest/tour but not yet deployed.
 *  - `deployed`          – Currently on the road / in use.
 *  - `in_service`        – Undergoing maintenance or repair; not available.
 *  - `damaged`           – Damage reported; awaiting assessment/repair.
 *  - `lost`              – Reported lost or stolen.
 *  - `retired`           – Permanently removed from active inventory.
 */
export const EQUIPMENT_ASSET_STATUSES = [
  "available",
  "reserved",
  "deployed",
  "in_service",
  "damaged",
  "lost",
  "retired",
] as const
export type EquipmentAssetStatus = (typeof EQUIPMENT_ASSET_STATUSES)[number]

/** Terminal statuses: no further operational transitions allowed. */
export const TERMINAL_ASSET_STATUSES = new Set<EquipmentAssetStatus>(["lost", "retired"])

export const ASSET_STATUS_TRANSITIONS: Record<
  EquipmentAssetStatus,
  readonly EquipmentAssetStatus[]
> = {
  available: ["reserved", "deployed", "in_service", "damaged", "lost", "retired"],
  reserved: ["available", "deployed", "in_service", "damaged", "lost", "retired"],
  deployed: ["available", "in_service", "damaged", "lost"],
  in_service: ["available", "damaged", "retired"],
  damaged: ["in_service", "retired", "lost"],
  lost: [],
  retired: [],
}

export function canTransitionAssetStatus(
  from: EquipmentAssetStatus,
  to: EquipmentAssetStatus,
): boolean {
  if (from === to) return true
  return (ASSET_STATUS_TRANSITIONS[from] as readonly EquipmentAssetStatus[]).includes(to)
}

export class AssetStatusTransitionError extends Error {
  readonly status = 422
  readonly code = "illegal_asset_status_transition"
  constructor(from: EquipmentAssetStatus, to: EquipmentAssetStatus) {
    super(`Illegal asset status transition: ${from} → ${to}`)
    this.name = "AssetStatusTransitionError"
  }
}

export function assertAssetStatusTransition(
  from: EquipmentAssetStatus,
  to: EquipmentAssetStatus,
): void {
  if (!canTransitionAssetStatus(from, to)) throw new AssetStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Dimensions and physical properties
// ---------------------------------------------------------------------------

export interface AssetDimensions {
  /** Height in centimetres. */
  height_cm: number | null
  /** Width in centimetres. */
  width_cm: number | null
  /** Depth in centimetres. */
  depth_cm: number | null
  /** Weight in kilograms. */
  weight_kg: number | null
}

// ---------------------------------------------------------------------------
// Restricted financial fields (capability-gated)
// ---------------------------------------------------------------------------

/**
 * Financial data about an asset. Only callers holding `can_finance` may see
 * these values. Projection helpers enforce this pattern.
 */
export interface AssetFinancialData {
  /** Amount paid to acquire the asset (owned) or annual/total lease cost. */
  purchase_price: number | null
  /** Insured replacement value (from insurance policy). */
  insured_value: number | null
  /** Current estimated replacement cost if destroyed/lost. */
  replacement_cost: number | null
  /** ISO 4217 currency code for the above amounts. */
  currency: string
}

// ---------------------------------------------------------------------------
// Core catalog item
// ---------------------------------------------------------------------------

export interface EquipmentCatalogItem {
  /** Stable UUID — system of record identifier. */
  id: string
  org_id: string

  // Identity
  /** Human name (e.g. "Shure SM58 #3"). */
  name: string
  /** Manufacturer or brand. */
  manufacturer: string | null
  /** Model number or name. */
  model: string | null
  /** Serialized asset — unique manufacturer serial. Null for bulk/generic items. */
  serial_number: string | null
  /** Organization's internal asset tag / barcode / QR payload. */
  asset_tag: string | null

  // Classification
  category: EquipmentAssetCategory
  /** Sub-type within category (org-defined, e.g. "wireless mic", "moving head"). */
  asset_type: string | null
  ownership: EquipmentOwnershipType
  /** Vendor org_id or external vendor ID when ownership === "vendor". */
  vendor_id: string | null
  /** Quantity of this item type in the organization's inventory. For serialized
   *  items this should always be 1; for bulk items it tracks total stock. */
  quantity: number

  // Physical
  dimensions: AssetDimensions | null

  // Operational state
  status: EquipmentAssetStatus
  /** ISO 8601 date of next required service/maintenance. */
  service_due_date: string | null
  /** Notes about current condition (visible to non-finance users). */
  condition_notes: string | null

  // Financial (restricted — do not include in public projections)
  financial: AssetFinancialData | null

  // Audit
  created_at: string
  updated_at: string
  /** User ID of last person to modify this record. */
  updated_by: string | null
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AssetValidationCode =
  | "missing_name"
  | "missing_category"
  | "missing_ownership"
  | "vendor_id_required_for_vendor_ownership"
  | "serial_required_for_owned_high_value"
  | "negative_quantity"
  | "invalid_quantity_for_serialized"
  | "negative_dimension"
  | "negative_financial_value"
  | "invalid_service_date_format"

export interface AssetValidationIssue {
  code: AssetValidationCode
  field: string
  message: string
}

export interface AssetValidationResult {
  valid: boolean
  issues: AssetValidationIssue[]
}

/** Validate catalog item fields. Pure. Does not touch DB. */
export function validateEquipmentCatalogItem(
  item: Partial<EquipmentCatalogItem>,
): AssetValidationResult {
  const issues: AssetValidationIssue[] = []

  if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
    issues.push({ code: "missing_name", field: "name", message: "Asset name is required" })
  }

  if (!item.category || !(EQUIPMENT_ASSET_CATEGORIES as readonly string[]).includes(item.category)) {
    issues.push({
      code: "missing_category",
      field: "category",
      message: `Category must be one of: ${EQUIPMENT_ASSET_CATEGORIES.join(", ")}`,
    })
  }

  if (!item.ownership || !(EQUIPMENT_OWNERSHIP_TYPES as readonly string[]).includes(item.ownership)) {
    issues.push({
      code: "missing_ownership",
      field: "ownership",
      message: `Ownership must be one of: ${EQUIPMENT_OWNERSHIP_TYPES.join(", ")}`,
    })
  }

  if (item.ownership === "vendor" && !item.vendor_id) {
    issues.push({
      code: "vendor_id_required_for_vendor_ownership",
      field: "vendor_id",
      message: "vendor_id is required when ownership is 'vendor'",
    })
  }

  if (typeof item.quantity === "number" && item.quantity < 0) {
    issues.push({
      code: "negative_quantity",
      field: "quantity",
      message: "Quantity must be non-negative",
    })
  }

  if (item.serial_number && typeof item.quantity === "number" && item.quantity > 1) {
    issues.push({
      code: "invalid_quantity_for_serialized",
      field: "quantity",
      message: "Serialized assets (with serial_number) must have quantity = 1",
    })
  }

  if (item.dimensions) {
    const dims = item.dimensions
    for (const [field, value] of Object.entries(dims)) {
      if (typeof value === "number" && value < 0) {
        issues.push({
          code: "negative_dimension",
          field: `dimensions.${field}`,
          message: `Dimension ${field} must be non-negative`,
        })
      }
    }
  }

  if (item.financial) {
    const { purchase_price, insured_value, replacement_cost } = item.financial
    for (const [field, value] of Object.entries({ purchase_price, insured_value, replacement_cost })) {
      if (typeof value === "number" && value < 0) {
        issues.push({
          code: "negative_financial_value",
          field: `financial.${field}`,
          message: `Financial field ${field} must be non-negative`,
        })
      }
    }
  }

  if (item.service_due_date != null) {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(item.service_due_date) && !isNaN(Date.parse(item.service_due_date))
    if (!valid) {
      issues.push({
        code: "invalid_service_date_format",
        field: "service_due_date",
        message: "service_due_date must be an ISO date (YYYY-MM-DD)",
      })
    }
  }

  return { valid: issues.length === 0, issues }
}

// ---------------------------------------------------------------------------
// Financial projection (capability gate)
// ---------------------------------------------------------------------------

/** Asset shape with financial fields redacted. Safe for non-finance audiences. */
export type EquipmentCatalogItemPublic = Omit<EquipmentCatalogItem, "financial">

/**
 * Project an asset for a caller. If `hasFinanceCapability` is false the
 * `financial` field is stripped entirely from the returned value.
 */
export function projectEquipmentCatalogItem(
  item: EquipmentCatalogItem,
  hasFinanceCapability: boolean,
): EquipmentCatalogItemPublic | EquipmentCatalogItem {
  if (hasFinanceCapability) return item
  const { financial: _dropped, ...rest } = item
  return rest
}

// ---------------------------------------------------------------------------
// Service-due helpers
// ---------------------------------------------------------------------------

export type ServiceDueStatus = "ok" | "due_soon" | "overdue" | "unknown"

/**
 * Evaluate whether an asset's service is overdue or due soon.
 * `warnWithinDays` defaults to 30.
 */
export function evaluateServiceDue(
  serviceDueDate: string | null | undefined,
  todayIso: string,
  warnWithinDays = 30,
): ServiceDueStatus {
  if (!serviceDueDate) return "unknown"
  const due = Date.parse(serviceDueDate)
  const today = Date.parse(todayIso)
  if (isNaN(due) || isNaN(today)) return "unknown"
  if (today > due) return "overdue"
  const warnMs = warnWithinDays * 24 * 60 * 60 * 1000
  if (due - today <= warnMs) return "due_soon"
  return "ok"
}

// ---------------------------------------------------------------------------
// Catalog summary helpers
// ---------------------------------------------------------------------------

export interface CatalogSummary {
  total: number
  by_category: Record<string, number>
  by_status: Record<EquipmentAssetStatus, number>
  by_ownership: Record<EquipmentOwnershipType, number>
  overdue_service_count: number
  due_soon_count: number
  /** Serialized items (serial_number != null). */
  serialized_count: number
}

/**
 * Build a summary of a catalog item list.
 * `todayIso`: caller-supplied ISO date (YYYY-MM-DD) for service-due evaluation.
 */
export function buildCatalogSummary(
  items: readonly EquipmentCatalogItem[],
  todayIso: string,
): CatalogSummary {
  const by_category: Record<string, number> = {}
  const by_status = Object.fromEntries(
    EQUIPMENT_ASSET_STATUSES.map((s) => [s, 0]),
  ) as Record<EquipmentAssetStatus, number>
  const by_ownership = Object.fromEntries(
    EQUIPMENT_OWNERSHIP_TYPES.map((o) => [o, 0]),
  ) as Record<EquipmentOwnershipType, number>
  let overdue = 0
  let due_soon = 0
  let serialized = 0

  for (const item of items) {
    by_category[item.category] = (by_category[item.category] ?? 0) + 1
    by_status[item.status] += 1
    by_ownership[item.ownership] += 1

    const svc = evaluateServiceDue(item.service_due_date, todayIso)
    if (svc === "overdue") overdue += 1
    else if (svc === "due_soon") due_soon += 1

    if (item.serial_number) serialized += 1
  }

  return {
    total: items.length,
    by_category,
    by_status,
    by_ownership,
    overdue_service_count: overdue,
    due_soon_count: due_soon,
    serialized_count: serialized,
  }
}
