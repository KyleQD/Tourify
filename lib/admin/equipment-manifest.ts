/**
 * EQUIP-302 — Equipment cases/kits and manifest versions.
 *
 * Two distinct but related models:
 *
 * 1. **EquipmentCase** — a scannable physical container (road case, soft bag,
 *    kit) with a versioned contents list.  Cases track what items travel
 *    inside them; a new contents version is created any time the loadout
 *    changes.  Published/sealed versions are immutable.
 *
 * 2. **EquipmentManifest** — a tour-level, department-scoped list of required
 *    equipment (items + cases) with quantities, alternates, sources, responsible
 *    roles, and an approval gate.  Once approved the manifest is published as
 *    an immutable snapshot; further edits require a new draft version.
 *
 * Both models enforce:
 *  - Immutability of published/sealed versions (mutation helpers throw).
 *  - Explicit approval workflow (draft → submitted → approved; alternates and
 *    quantities must be resolved before approval).
 *  - Quantity consistency (required vs. sourced vs. alternate).
 *
 * All helpers are pure (no I/O).
 */

import {
  type EquipmentAssetCategory,
  type EquipmentCatalogItem,
} from "@/lib/admin/equipment-catalog"

// ============================================================================
// PART 1 — Equipment Cases / Kits
// ============================================================================

// ---------------------------------------------------------------------------
// Case status lifecycle
// ---------------------------------------------------------------------------

export const EQUIPMENT_CASE_STATUSES = [
  "draft",       // Being configured; contents may change freely.
  "sealed",      // Contents locked; case is on tour and changes require a new version.
  "open",        // Physically open for loading/inspection; contents may be amended.
  "retired",     // Case decommissioned; no further operational use.
] as const
export type EquipmentCaseStatus = (typeof EQUIPMENT_CASE_STATUSES)[number]

export const CASE_STATUS_TRANSITIONS: Record<
  EquipmentCaseStatus,
  readonly EquipmentCaseStatus[]
> = {
  draft:   ["sealed", "retired"],
  sealed:  ["open", "retired"],
  open:    ["sealed", "draft", "retired"],
  retired: [],
}

export function canTransitionCaseStatus(
  from: EquipmentCaseStatus,
  to: EquipmentCaseStatus,
): boolean {
  if (from === to) return true
  return (CASE_STATUS_TRANSITIONS[from] as readonly EquipmentCaseStatus[]).includes(to)
}

export class CaseStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_case_status_transition"
  constructor(from: EquipmentCaseStatus, to: EquipmentCaseStatus) {
    super(`Illegal case status transition: ${from} → ${to}`)
    this.name = "CaseStatusTransitionError"
  }
}

export function assertCaseStatusTransition(
  from: EquipmentCaseStatus,
  to: EquipmentCaseStatus,
): void {
  if (!canTransitionCaseStatus(from, to)) throw new CaseStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Case contents — one entry per catalog item inside the case
// ---------------------------------------------------------------------------

export interface CaseContentEntry {
  /** References EquipmentCatalogItem.id */
  catalog_item_id: string
  quantity: number
  /** Slot label inside the case (e.g. "Bay A", "Layer 2"). */
  slot_label: string | null
  /** Notes specific to how this item is packed in this case. */
  packing_notes: string | null
}

// ---------------------------------------------------------------------------
// Case contents version — immutable snapshot once case is sealed
// ---------------------------------------------------------------------------

export interface CaseContentsVersion {
  /** Monotonically incrementing version number within a case. */
  version: number
  /** ISO 8601 timestamp when this version was created/sealed. */
  created_at: string
  created_by: string
  /** True once the case transitions to `sealed`; further mutations are forbidden. */
  is_sealed: boolean
  contents: CaseContentEntry[]
  /** SHA-256 hex digest of the canonical contents JSON (deterministic order). */
  checksum: string | null
}

// ---------------------------------------------------------------------------
// Equipment case
// ---------------------------------------------------------------------------

export interface EquipmentCase {
  id: string
  org_id: string
  /** Human name for the case/kit (e.g. "FOH Patch Case #1"). */
  name: string
  /** Scannable identifier — QR payload or barcode. */
  barcode: string | null
  asset_tag: string | null
  /** Broad category of contents (mirrors EquipmentAssetCategory for filtering). */
  category: EquipmentAssetCategory | null
  status: EquipmentCaseStatus
  /** Current active contents version. */
  current_version: number
  /** All historical contents versions (append-only). */
  versions: CaseContentsVersion[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Case mutation helpers
// ---------------------------------------------------------------------------

/**
 * Return whether a case's contents are mutable (i.e. the active version is
 * not sealed).
 */
export function isCaseMutable(c: EquipmentCase): boolean {
  return c.status === "draft" || c.status === "open"
}

/**
 * Create a new contents version on a case (draft → new version).
 * Throws if the case is sealed (immutable).
 */
export function addCaseContentsVersion(
  c: EquipmentCase,
  contents: CaseContentEntry[],
  createdBy: string,
  createdAt: string,
): EquipmentCase {
  if (!isCaseMutable(c)) {
    throw new Error(
      `Case '${c.id}' is ${c.status} and its contents are immutable. Transition to 'open' or 'draft' first.`,
    )
  }
  const nextVersion = c.current_version + 1
  const newVersion: CaseContentsVersion = {
    version: nextVersion,
    created_at: createdAt,
    created_by: createdBy,
    is_sealed: false,
    contents,
    checksum: null, // checksum computed by persistence layer (DB trigger / service)
  }
  return {
    ...c,
    current_version: nextVersion,
    versions: [...c.versions, newVersion],
    updated_at: createdAt,
  }
}

/**
 * Seal the active contents version of a case.
 * Throws if the case is not transitioning from `draft` or `open`.
 */
export function sealCase(
  c: EquipmentCase,
  sealedAt: string,
): EquipmentCase {
  if (!isCaseMutable(c)) {
    throw new Error(`Case '${c.id}' is already ${c.status}; cannot seal again without reopening.`)
  }
  assertCaseStatusTransition(c.status, "sealed")

  const updatedVersions = c.versions.map((v) =>
    v.version === c.current_version ? { ...v, is_sealed: true } : v,
  )
  return { ...c, status: "sealed", versions: updatedVersions, updated_at: sealedAt }
}

/** Retrieve the current (active) contents version. */
export function getCurrentCaseContents(c: EquipmentCase): CaseContentsVersion | null {
  return c.versions.find((v) => v.version === c.current_version) ?? null
}

// ============================================================================
// PART 2 — Equipment Manifests
// ============================================================================

// ---------------------------------------------------------------------------
// Manifest lifecycle
// ---------------------------------------------------------------------------

export const MANIFEST_STATUSES = [
  "draft",       // Being built; line-items may be added/changed freely.
  "submitted",   // Submitted for approval; no new line-items.
  "approved",    // Approved by responsible authority; published version is created.
  "published",   // Immutable snapshot distributed to production team.
  "superseded",  // Replaced by a newer published manifest version.
  "archived",    // Permanently closed; no further operational use.
] as const
export type ManifestStatus = (typeof MANIFEST_STATUSES)[number]

/** Published and archived manifests are immutable — no edits allowed. */
export const IMMUTABLE_MANIFEST_STATUSES = new Set<ManifestStatus>(["published", "superseded", "archived"])

export const MANIFEST_STATUS_TRANSITIONS: Record<
  ManifestStatus,
  readonly ManifestStatus[]
> = {
  draft:      ["submitted", "archived"],
  submitted:  ["draft", "approved", "archived"],   // draft = send back for revision
  approved:   ["published", "archived"],
  published:  ["superseded"],
  superseded: ["archived"],
  archived:   [],
}

export function canTransitionManifestStatus(
  from: ManifestStatus,
  to: ManifestStatus,
): boolean {
  if (from === to) return true
  return (MANIFEST_STATUS_TRANSITIONS[from] as readonly ManifestStatus[]).includes(to)
}

export class ManifestStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_manifest_status_transition"
  constructor(from: ManifestStatus, to: ManifestStatus) {
    super(`Illegal manifest status transition: ${from} → ${to}`)
    this.name = "ManifestStatusTransitionError"
  }
}

export function assertManifestStatusTransition(
  from: ManifestStatus,
  to: ManifestStatus,
): void {
  if (!canTransitionManifestStatus(from, to)) throw new ManifestStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Manifest line item — one row per required asset or case
// ---------------------------------------------------------------------------

export type ManifestSourceType =
  | "org_catalog"     // From the org's equipment_catalog_items
  | "vendor_rental"   // Sourced from an external vendor via rental agreement
  | "case"            // A full EquipmentCase (contents version is the detail)
  | "manual"          // Ad-hoc item not yet in catalog (must be catalogued before publish)

export interface ManifestAlternate {
  /** Alternate catalog_item_id or case_id. */
  alternate_id: string
  alternate_type: ManifestSourceType
  notes: string | null
}

export interface ManifestLineItem {
  id: string
  /** References EquipmentCatalogItem.id, EquipmentCase.id, or null for manual. */
  source_id: string | null
  source_type: ManifestSourceType
  /** Human label — derived from catalog if source_id set; required for manual. */
  label: string
  /** Total quantity required. */
  quantity_required: number
  /** Quantity confirmed as sourced/available. */
  quantity_sourced: number
  /** Approved alternates if primary is unavailable. */
  alternates: ManifestAlternate[]
  /** Department within the tour (e.g. "FOH Audio", "Lighting", "Video"). */
  department: string
  /** User/role responsible for this item's readiness. */
  responsible_role: string | null
  /** Free-form notes for this line. */
  notes: string | null
  /** True when all quantity is confirmed sourced (quantity_sourced >= quantity_required). */
  is_sourced: boolean
}

// ---------------------------------------------------------------------------
// Manifest approval record
// ---------------------------------------------------------------------------

export interface ManifestApproval {
  approved_by: string
  approved_at: string
  notes: string | null
}

// ---------------------------------------------------------------------------
// Published manifest snapshot — immutable
// ---------------------------------------------------------------------------

export interface PublishedManifestSnapshot {
  /** Monotonically incrementing publish version within a manifest. */
  publish_version: number
  published_at: string
  published_by: string
  /** Frozen copy of line-items at publish time. Mutations to the manifest
   *  after this point create a new draft/version; this snapshot never changes. */
  line_items: readonly ManifestLineItem[]
  /** SHA-256 checksum of the canonical snapshot JSON. */
  checksum: string | null
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export interface EquipmentManifest {
  id: string
  org_id: string
  tour_id: string
  /** Semver-like version label, e.g. "1.0", "1.1", "2.0". */
  version: string
  /** Department this manifest covers (may be "All" for a tour-wide manifest). */
  department: string
  title: string
  status: ManifestStatus
  line_items: ManifestLineItem[]
  approval: ManifestApproval | null
  /** Published snapshots — append-only; the latest is the current published version. */
  published_snapshots: PublishedManifestSnapshot[]
  created_at: string
  updated_at: string
  created_by: string
}

// ---------------------------------------------------------------------------
// Manifest mutation helpers
// ---------------------------------------------------------------------------

export function isManifestMutable(m: EquipmentManifest): boolean {
  return !IMMUTABLE_MANIFEST_STATUSES.has(m.status)
}

/**
 * Add or replace a line item in a draft/submitted manifest.
 * Throws if the manifest is immutable.
 */
export function upsertManifestLineItem(
  m: EquipmentManifest,
  item: ManifestLineItem,
  updatedAt: string,
): EquipmentManifest {
  if (!isManifestMutable(m)) {
    throw new Error(
      `Manifest '${m.id}' is ${m.status} and cannot be edited. Create a new draft version.`,
    )
  }
  if (m.status === "submitted") {
    throw new Error(
      `Manifest '${m.id}' is submitted for approval; send back to draft before editing line items.`,
    )
  }
  const existing = m.line_items.findIndex((l) => l.id === item.id)
  const line_items =
    existing >= 0
      ? m.line_items.map((l) => (l.id === item.id ? item : l))
      : [...m.line_items, item]
  return { ...m, line_items, updated_at: updatedAt }
}

/**
 * Remove a line item from a draft manifest.
 * Throws if the manifest is submitted or immutable.
 */
export function removeManifestLineItem(
  m: EquipmentManifest,
  lineItemId: string,
  updatedAt: string,
): EquipmentManifest {
  if (!isManifestMutable(m) || m.status === "submitted") {
    throw new Error(
      `Manifest '${m.id}' is ${m.status}; line items cannot be removed in this state.`,
    )
  }
  return {
    ...m,
    line_items: m.line_items.filter((l) => l.id !== lineItemId),
    updated_at: updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Approval helpers
// ---------------------------------------------------------------------------

export type ManifestReadinessCode =
  | "unsourced_required_items"
  | "manual_items_not_catalogued"
  | "empty_manifest"
  | "missing_responsible_role"

export interface ManifestReadinessIssue {
  code: ManifestReadinessCode
  message: string
  line_item_id?: string
}

export interface ManifestReadinessResult {
  ready: boolean
  issues: ManifestReadinessIssue[]
}

/**
 * Evaluate whether a manifest is ready to be approved.
 * All required items must be sourced; no manual items without source_id.
 */
export function evaluateManifestReadiness(m: EquipmentManifest): ManifestReadinessResult {
  const issues: ManifestReadinessIssue[] = []

  if (m.line_items.length === 0) {
    issues.push({ code: "empty_manifest", message: "Manifest has no line items" })
    return { ready: false, issues }
  }

  for (const item of m.line_items) {
    if (!item.is_sourced) {
      issues.push({
        code: "unsourced_required_items",
        message: `'${item.label}' requires ${item.quantity_required} but only ${item.quantity_sourced} are sourced`,
        line_item_id: item.id,
      })
    }
    if (item.source_type === "manual" && !item.source_id) {
      issues.push({
        code: "manual_items_not_catalogued",
        message: `'${item.label}' is a manual item and must be added to the catalog before approval`,
        line_item_id: item.id,
      })
    }
    if (!item.responsible_role) {
      issues.push({
        code: "missing_responsible_role",
        message: `'${item.label}' has no responsible role assigned`,
        line_item_id: item.id,
      })
    }
  }

  return { ready: issues.length === 0, issues }
}

/**
 * Approve a submitted manifest.  Stamps approval record and transitions to `approved`.
 * Enforces readiness before approving.
 */
export function approveManifest(
  m: EquipmentManifest,
  approval: ManifestApproval,
): EquipmentManifest {
  if (m.status !== "submitted") {
    throw new Error(`Manifest must be in 'submitted' state to approve; current: '${m.status}'`)
  }
  const readiness = evaluateManifestReadiness(m)
  if (!readiness.ready) {
    throw new Error(
      `Manifest cannot be approved: ${readiness.issues.map((i) => i.message).join("; ")}`,
    )
  }
  return {
    ...m,
    status: "approved",
    approval,
    updated_at: approval.approved_at,
  }
}

/**
 * Publish an approved manifest — creates an immutable snapshot.
 * After this the manifest is locked; any change must go through a new draft.
 */
export function publishManifest(
  m: EquipmentManifest,
  publishedBy: string,
  publishedAt: string,
): EquipmentManifest {
  if (m.status !== "approved") {
    throw new Error(`Manifest must be 'approved' before publishing; current: '${m.status}'`)
  }
  const nextPublishVersion =
    m.published_snapshots.length > 0
      ? Math.max(...m.published_snapshots.map((s) => s.publish_version)) + 1
      : 1

  const snapshot: PublishedManifestSnapshot = {
    publish_version: nextPublishVersion,
    published_at: publishedAt,
    published_by: publishedBy,
    line_items: m.line_items, // frozen reference — callers must not mutate
    checksum: null,
  }

  return {
    ...m,
    status: "published",
    published_snapshots: [...m.published_snapshots, snapshot],
    updated_at: publishedAt,
  }
}

/**
 * Supersede a published manifest with a new draft version.
 * Returns both the superseded original and the new draft (caller saves both).
 */
export function supersedManifest(
  m: EquipmentManifest,
  newVersionLabel: string,
  createdBy: string,
  createdAt: string,
): { superseded: EquipmentManifest; newDraft: EquipmentManifest } {
  if (m.status !== "published") {
    throw new Error(`Only published manifests can be superseded; current: '${m.status}'`)
  }
  const superseded: EquipmentManifest = {
    ...m,
    status: "superseded",
    updated_at: createdAt,
  }
  const newDraft: EquipmentManifest = {
    ...m,
    id: `${m.id}-v${newVersionLabel}`, // placeholder; real ID assigned by persistence layer
    version: newVersionLabel,
    status: "draft",
    approval: null,
    published_snapshots: [],
    created_at: createdAt,
    updated_at: createdAt,
    created_by: createdBy,
  }
  return { superseded, newDraft }
}

// ---------------------------------------------------------------------------
// Manifest summary helpers
// ---------------------------------------------------------------------------

export interface ManifestLineSummary {
  total_lines: number
  sourced_lines: number
  unsourced_lines: number
  total_quantity_required: number
  total_quantity_sourced: number
  departments: string[]
  has_manual_uncatalogued: boolean
}

export function buildManifestLineSummary(m: EquipmentManifest): ManifestLineSummary {
  let sourced = 0
  let total_required = 0
  let total_sourced = 0
  let has_manual = false
  const departments = new Set<string>()

  for (const item of m.line_items) {
    if (item.is_sourced) sourced += 1
    total_required += item.quantity_required
    total_sourced += item.quantity_sourced
    departments.add(item.department)
    if (item.source_type === "manual" && !item.source_id) has_manual = true
  }

  return {
    total_lines: m.line_items.length,
    sourced_lines: sourced,
    unsourced_lines: m.line_items.length - sourced,
    total_quantity_required: total_required,
    total_quantity_sourced: total_sourced,
    departments: [...departments].sort(),
    has_manual_uncatalogued: has_manual,
  }
}
