/**
 * WORK-403 — Role/headcount template tests.
 */

import { describe, it, expect } from "vitest"
import {
  TEMPLATE_STATUS_TRANSITIONS,
  transitionTemplate,
  templateIsImmutable,
  previewTemplateApplication,
  executeTemplateApplication,
  validateTemplate,
  findMatchingTemplates,
  type RoleHeadcountTemplate,
  type TemplateRole,
  type ExistingRoleRow,
} from "@/lib/admin/staffing-role-templates"

const NOW = "2026-09-15T00:00:00.000Z"
const ACTOR = "mgr-1"
const TOUR = "tour-1"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSlot(overrides: Partial<TemplateRole> = {}): TemplateRole {
  return {
    slot_id: "s1",
    role_title: "Tour Manager",
    department: "Production",
    required_headcount: 1,
    is_required: true,
    required_skill_tags: [],
    applies_to_column_types: [],
    notes: null,
    ...overrides,
  }
}

function makeTemplate(overrides: Partial<RoleHeadcountTemplate> = {}): RoleHeadcountTemplate {
  return {
    template_id: "tmpl-1",
    org_id: "org-1",
    name: "Arena Show Standard",
    description: null,
    event_type: "arena",
    scale: "large",
    status: "draft",
    version: 1,
    roles: [
      makeSlot({ slot_id: "s1", role_title: "Tour Manager",  department: "Production", required_headcount: 1 }),
      makeSlot({ slot_id: "s2", role_title: "FOH Engineer",  department: "Audio",      required_headcount: 1 }),
      makeSlot({ slot_id: "s3", role_title: "Stage Manager", department: "Production", required_headcount: 2 }),
    ],
    created_by: ACTOR,
    created_at: NOW,
    updated_by: ACTOR,
    updated_at: NOW,
    supersedes_template_id: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

describe("WORK-403 — template status lifecycle", () => {
  it("documents all transitions", () => {
    expect(TEMPLATE_STATUS_TRANSITIONS["draft"]).toContain("published")
    expect(TEMPLATE_STATUS_TRANSITIONS["draft"]).toContain("archived")
    expect(TEMPLATE_STATUS_TRANSITIONS["published"]).toContain("archived")
    expect(TEMPLATE_STATUS_TRANSITIONS["archived"]).toHaveLength(0)
  })

  it("draft → published succeeds", () => {
    const t = makeTemplate({ status: "draft" })
    const r = transitionTemplate(t, "published", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.template.status).toBe("published")
    expect(r.template.updated_by).toBe(ACTOR)
  })

  it("published → archived succeeds", () => {
    const t = makeTemplate({ status: "published" })
    const r = transitionTemplate(t, "archived", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.template.status).toBe("archived")
  })

  it("invalid transition returns ok=false", () => {
    const t = makeTemplate({ status: "archived" })
    const r = transitionTemplate(t, "draft", ACTOR, NOW)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/archived.*draft/i)
  })

  it("published and archived templates are immutable", () => {
    expect(templateIsImmutable(makeTemplate({ status: "published" }))).toBe(true)
    expect(templateIsImmutable(makeTemplate({ status: "archived" }))).toBe(true)
    expect(templateIsImmutable(makeTemplate({ status: "draft" }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("WORK-403 — template validation", () => {
  it("valid template passes", () => {
    const r = validateTemplate(makeTemplate())
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it("missing name is an error", () => {
    const r = validateTemplate(makeTemplate({ name: "" }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("name"))).toBe(true)
  })

  it("missing org_id is an error", () => {
    const r = validateTemplate(makeTemplate({ org_id: "" }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("org_id"))).toBe(true)
  })

  it("duplicate role_title within template is an error", () => {
    const t = makeTemplate({
      roles: [
        makeSlot({ slot_id: "s1", role_title: "Tour Manager" }),
        makeSlot({ slot_id: "s2", role_title: "Tour Manager" }),
      ],
    })
    const r = validateTemplate(t)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.toLowerCase().includes("duplicate"))).toBe(true)
  })

  it("required_headcount < 1 is an error", () => {
    const t = makeTemplate({
      roles: [makeSlot({ required_headcount: 0 })],
    })
    const r = validateTemplate(t)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("headcount"))).toBe(true)
  })

  it("empty roles array produces a warning but is valid", () => {
    const r = validateTemplate(makeTemplate({ roles: [] }))
    expect(r.valid).toBe(true)
    expect(r.warnings.some((w) => w.includes("no role slots"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Apply preview — create / skip / conflict
// ---------------------------------------------------------------------------

describe("WORK-403 — apply preview", () => {
  it("creates all slots when no existing rows", () => {
    const preview = previewTemplateApplication({
      template: makeTemplate(),
      tourId: TOUR,
      existingRows: [],
    })
    expect(preview.creates).toBe(3)
    expect(preview.skips).toBe(0)
    expect(preview.conflicts).toBe(0)
    expect(preview.safe_to_apply).toBe(true)
  })

  it("skips slots that exactly match existing rows", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "Tour Manager",  department: "Production", required_headcount: 1 },
      { role_title: "FOH Engineer",  department: "Audio",      required_headcount: 1 },
    ]
    const preview = previewTemplateApplication({
      template: makeTemplate(),
      tourId: TOUR,
      existingRows: existing,
    })
    expect(preview.skips).toBe(2)
    expect(preview.creates).toBe(1)  // Stage Manager not in existing
    expect(preview.conflicts).toBe(0)
    expect(preview.safe_to_apply).toBe(true)
  })

  it("flags conflict when headcount differs", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "Stage Manager", department: "Production", required_headcount: 1 }, // template has 2
    ]
    const preview = previewTemplateApplication({
      template: makeTemplate(),
      tourId: TOUR,
      existingRows: existing,
    })
    const conflictItem = preview.items.find((i) => i.slot.role_title === "Stage Manager")
    expect(conflictItem?.action).toBe("conflict")
    expect(conflictItem?.conflict_detail).toMatch(/headcount/)
    expect(preview.conflicts).toBe(1)
    expect(preview.safe_to_apply).toBe(false)
  })

  it("flags conflict when department differs", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "FOH Engineer", department: "Production", required_headcount: 1 }, // template has "Audio"
    ]
    const preview = previewTemplateApplication({
      template: makeTemplate(),
      tourId: TOUR,
      existingRows: existing,
    })
    const conflictItem = preview.items.find((i) => i.slot.role_title === "FOH Engineer")
    expect(conflictItem?.action).toBe("conflict")
    expect(conflictItem?.conflict_detail).toMatch(/department/)
  })

  it("override_conflicts downgrades conflicts to skips", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "Stage Manager", department: "Production", required_headcount: 1 },
    ]
    const preview = previewTemplateApplication({
      template: makeTemplate(),
      tourId: TOUR,
      existingRows: existing,
      override_conflicts: true,
    })
    expect(preview.conflicts).toBe(0)
    expect(preview.safe_to_apply).toBe(true)
  })

  it("preview is non-destructive — does not modify template or existing rows", () => {
    const tmpl = makeTemplate()
    const existing: ExistingRoleRow[] = [{ role_title: "Tour Manager", department: "Production", required_headcount: 1 }]
    previewTemplateApplication({ template: tmpl, tourId: TOUR, existingRows: existing })
    expect(tmpl.roles).toHaveLength(3)           // unchanged
    expect(existing).toHaveLength(1)              // unchanged
  })

  it("preview records template_id and version", () => {
    const preview = previewTemplateApplication({ template: makeTemplate(), tourId: TOUR, existingRows: [] })
    expect(preview.template_id).toBe("tmpl-1")
    expect(preview.template_version).toBe(1)
    expect(preview.tour_id).toBe(TOUR)
  })
})

// ---------------------------------------------------------------------------
// Execute application
// ---------------------------------------------------------------------------

describe("WORK-403 — execute application", () => {
  it("returns slots_to_create for create-only preview", () => {
    const preview = previewTemplateApplication({ template: makeTemplate(), tourId: TOUR, existingRows: [] })
    const result = executeTemplateApplication(preview)
    expect(result.blocked_by_conflicts).toBe(false)
    expect(result.slots_to_create).toHaveLength(3)
  })

  it("blocked_by_conflicts=true when unresolved conflicts remain", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "Stage Manager", department: "Production", required_headcount: 1 },
    ]
    const preview = previewTemplateApplication({ template: makeTemplate(), tourId: TOUR, existingRows: existing })
    const result = executeTemplateApplication(preview)
    expect(result.blocked_by_conflicts).toBe(true)
    expect(result.slots_to_create).toHaveLength(0)
  })

  it("skipped slots are not included in slots_to_create", () => {
    const existing: ExistingRoleRow[] = [
      { role_title: "Tour Manager", department: "Production", required_headcount: 1 },
    ]
    const preview = previewTemplateApplication({ template: makeTemplate(), tourId: TOUR, existingRows: existing })
    const result = executeTemplateApplication(preview)
    const titles = result.slots_to_create.map((s) => s.role_title)
    expect(titles).not.toContain("Tour Manager")
    expect(titles).toContain("FOH Engineer")
    expect(titles).toContain("Stage Manager")
  })
})

// ---------------------------------------------------------------------------
// Template registry — findMatchingTemplates
// ---------------------------------------------------------------------------

describe("WORK-403 — template registry matching", () => {
  const templates: RoleHeadcountTemplate[] = [
    makeTemplate({ template_id: "t1", event_type: "arena",   scale: "large",  status: "published" }),
    makeTemplate({ template_id: "t2", event_type: "theater", scale: "medium", status: "published" }),
    makeTemplate({ template_id: "t3", event_type: "arena",   scale: "any",    status: "published" }),
    makeTemplate({ template_id: "t4", event_type: "any",     scale: "any",    status: "published" }),
    makeTemplate({ template_id: "t5", event_type: "arena",   scale: "large",  status: "draft" }),  // not published
  ]

  it("exact event_type+scale match takes priority", () => {
    const matches = findMatchingTemplates(templates, "arena", "large")
    expect(matches.map((t) => t.template_id)).toContain("t1")
    expect(matches.map((t) => t.template_id)).not.toContain("t3")
    expect(matches.map((t) => t.template_id)).not.toContain("t4")
  })

  it("falls back to event_type+any when no exact match", () => {
    const matches = findMatchingTemplates(templates, "arena", "xl")
    expect(matches.map((t) => t.template_id)).toContain("t3")
    expect(matches.map((t) => t.template_id)).not.toContain("t1")
  })

  it("falls back to any+any when no type match", () => {
    const matches = findMatchingTemplates(templates, "club", "small")
    expect(matches.map((t) => t.template_id)).toContain("t4")
  })

  it("draft templates are excluded from matching", () => {
    const matches = findMatchingTemplates(templates, "arena", "large")
    expect(matches.map((t) => t.template_id)).not.toContain("t5")
  })

  it("returns empty array when no published templates match", () => {
    const draftsOnly = templates.map((t) => ({ ...t, status: "draft" as const }))
    const matches = findMatchingTemplates(draftsOnly, "arena", "large")
    expect(matches).toHaveLength(0)
  })
})
