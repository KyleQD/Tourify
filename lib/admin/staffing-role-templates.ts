/**
 * WORK-403 — Role/headcount templates (pure).
 *
 * Organization-owned versioned templates define required roles/counts by
 * event type and scale. Templates can be applied to a tour with a preview
 * that shows what will be created, updated, or skipped — never silent.
 *
 * Concepts:
 *   RoleHeadcountTemplate  — versioned org-owned template (draft/published/archived)
 *   TemplateRole           — one role slot within a template (role, dept, headcount,
 *                            skills, is_required, applies_to column types)
 *   TemplateApplyPreview   — diff of what applying the template would do
 *                            (create/skip/conflict per slot) before committing
 *
 * Pure: no I/O, no `server-only`.
 */

import type { StaffingColumnType } from "@/lib/admin/staffing-matrix"
import type { TourPartyMemberStatus } from "@/lib/admin/tour-party-model"

// ---------------------------------------------------------------------------
// Template lifecycle
// ---------------------------------------------------------------------------

export type TemplateStatus = "draft" | "published" | "archived"

export const TEMPLATE_STATUS_TRANSITIONS: Record<TemplateStatus, TemplateStatus[]> = {
  draft:     ["published", "archived"],
  published: ["archived"],
  archived:  [],
}

// ---------------------------------------------------------------------------
// Template event type / scale
// ---------------------------------------------------------------------------

export type TemplateEventType =
  | "arena"
  | "theater"
  | "festival"
  | "club"
  | "outdoor_amphitheater"
  | "special_event"
  | "rehearsal_only"
  | "any"

export type TemplateScale =
  | "small"    // < 500 cap
  | "medium"   // 500–5 000 cap
  | "large"    // 5 000–20 000 cap
  | "xl"       // > 20 000 cap
  | "any"

// ---------------------------------------------------------------------------
// Template role slot
// ---------------------------------------------------------------------------

export interface TemplateRole {
  slot_id: string
  role_title: string
  department: string | null
  required_headcount: number
  /** Whether this slot is required (vs. recommended). */
  is_required: boolean
  /** Skill/credential tags required for this role. */
  required_skill_tags: string[]
  /** Which day types this slot applies to (empty = all). */
  applies_to_column_types: StaffingColumnType[]
  notes: string | null
}

// ---------------------------------------------------------------------------
// Template record
// ---------------------------------------------------------------------------

export interface RoleHeadcountTemplate {
  template_id: string
  org_id: string
  name: string
  description: string | null
  event_type: TemplateEventType
  scale: TemplateScale
  status: TemplateStatus
  version: number
  roles: TemplateRole[]
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
  /** If this replaced an earlier template. */
  supersedes_template_id: string | null
}

// ---------------------------------------------------------------------------
// Template status transitions
// ---------------------------------------------------------------------------

export interface TemplateTransitionResult {
  ok: boolean
  template: RoleHeadcountTemplate
  error?: string
}

export function transitionTemplate(
  template: RoleHeadcountTemplate,
  toStatus: TemplateStatus,
  actor: string,
  at: string,
): TemplateTransitionResult {
  const allowed = TEMPLATE_STATUS_TRANSITIONS[template.status]
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      template,
      error: `Cannot transition template from '${template.status}' to '${toStatus}'.`,
    }
  }
  return {
    ok: true,
    template: { ...template, status: toStatus, updated_by: actor, updated_at: at },
  }
}

/** Published templates are immutable — new edits must produce a new version. */
export function templateIsImmutable(template: RoleHeadcountTemplate): boolean {
  return template.status === "published" || template.status === "archived"
}

// ---------------------------------------------------------------------------
// Apply preview
// ---------------------------------------------------------------------------

export type TemplateSlotApplyAction =
  | "create"      // slot has no match in existing rows — will create a new role row
  | "skip"        // identical slot already exists — no action needed
  | "conflict"    // a row with the same role_title exists but with different headcount/dept

export interface TemplateSlotPreviewItem {
  slot: TemplateRole
  action: TemplateSlotApplyAction
  /** For 'conflict': the existing row details that differ. */
  conflict_detail: string | null
}

export interface TemplateApplyPreview {
  template_id: string
  template_version: number
  tour_id: string
  items: TemplateSlotPreviewItem[]
  creates: number
  skips: number
  conflicts: number
  /** True only when conflicts === 0 — safe to apply without override. */
  safe_to_apply: boolean
}

export interface ExistingRoleRow {
  role_title: string
  department: string | null
  required_headcount: number
}

/**
 * Build a preview of what applying a template to a tour would produce.
 * Never creates anything — returns the diff for user confirmation.
 */
export function previewTemplateApplication(args: {
  template: RoleHeadcountTemplate
  tourId: string
  existingRows: ExistingRoleRow[]
  /** When true, conflicts are downgraded to skips (override mode). */
  override_conflicts?: boolean
}): TemplateApplyPreview {
  const { template, tourId, existingRows, override_conflicts = false } = args

  const items: TemplateSlotPreviewItem[] = []

  for (const slot of template.roles) {
    const match = existingRows.find(
      (r) => r.role_title.trim().toLowerCase() === slot.role_title.trim().toLowerCase(),
    )

    if (!match) {
      items.push({ slot, action: "create", conflict_detail: null })
      continue
    }

    const headcountDiffers = match.required_headcount !== slot.required_headcount
    const deptDiffers =
      (match.department ?? "").toLowerCase() !== (slot.department ?? "").toLowerCase()

    if (headcountDiffers || deptDiffers) {
      const detail = [
        headcountDiffers
          ? `headcount: existing=${match.required_headcount} template=${slot.required_headcount}`
          : null,
        deptDiffers
          ? `department: existing='${match.department}' template='${slot.department}'`
          : null,
      ]
        .filter(Boolean)
        .join("; ")

      items.push({
        slot,
        action: override_conflicts ? "skip" : "conflict",
        conflict_detail: override_conflicts ? null : detail,
      })
    } else {
      items.push({ slot, action: "skip", conflict_detail: null })
    }
  }

  const creates = items.filter((i) => i.action === "create").length
  const skips = items.filter((i) => i.action === "skip").length
  const conflicts = items.filter((i) => i.action === "conflict").length

  return {
    template_id: template.template_id,
    template_version: template.version,
    tour_id: tourId,
    items,
    creates,
    skips,
    conflicts,
    safe_to_apply: conflicts === 0,
  }
}

/**
 * Execute the preview — returns only the slots that would be created.
 * Caller is responsible for persisting these as StaffingRows.
 * Conflicts must be resolved (override or skip) before calling this.
 */
export function executeTemplateApplication(
  preview: TemplateApplyPreview,
): { slots_to_create: TemplateRole[]; blocked_by_conflicts: boolean } {
  if (preview.conflicts > 0) {
    return { slots_to_create: [], blocked_by_conflicts: true }
  }
  const slots_to_create = preview.items
    .filter((i) => i.action === "create")
    .map((i) => i.slot)
  return { slots_to_create, blocked_by_conflicts: false }
}

// ---------------------------------------------------------------------------
// Template validation
// ---------------------------------------------------------------------------

export interface TemplateValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateTemplate(template: RoleHeadcountTemplate): TemplateValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!template.name?.trim()) errors.push("name is required")
  if (!template.org_id?.trim()) errors.push("org_id is required")
  if (template.roles.length === 0) warnings.push("template has no role slots")

  // Check for duplicate role titles
  const titles = template.roles.map((r) => r.role_title.trim().toLowerCase())
  const seen = new Set<string>()
  for (const t of titles) {
    if (seen.has(t)) errors.push(`duplicate role_title '${t}' in template`)
    seen.add(t)
  }

  // Check headcounts
  for (const role of template.roles) {
    if (role.required_headcount < 1) {
      errors.push(`role '${role.role_title}' has required_headcount < 1`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// Template registry helpers
// ---------------------------------------------------------------------------

/** Find best-matching template(s) for a given event type and scale. */
export function findMatchingTemplates(
  templates: RoleHeadcountTemplate[],
  eventType: TemplateEventType,
  scale: TemplateScale,
): RoleHeadcountTemplate[] {
  const published = templates.filter((t) => t.status === "published")
  // Exact match first, then any-type/any-scale fallbacks
  const exact = published.filter(
    (t) => t.event_type === eventType && t.scale === scale,
  )
  if (exact.length > 0) return exact
  const typeMatch = published.filter(
    (t) => t.event_type === eventType && t.scale === "any",
  )
  if (typeMatch.length > 0) return typeMatch
  return published.filter((t) => t.event_type === "any")
}
