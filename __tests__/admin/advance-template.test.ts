import { describe, it, expect } from "vitest"
import {
  createAdvanceTemplateVersion,
  activateAdvanceTemplate,
  validateAdvanceTemplate,
  applyAdvanceTemplate,
  parseDurationDaysAdv,
  summarizeAdvanceTemplate,
  type AdvanceTemplate,
  type AdvanceSectionDef,
  type AdvanceFieldDef,
} from "../../lib/admin/advance-template"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<AdvanceFieldDef> = {}): AdvanceFieldDef {
  return {
    id: "f1",
    section_id: "s1",
    label: "Stage dimensions",
    field_type: "text",
    is_required: true,
    validation_rules: [],
    ordinal: 1,
    ...overrides,
  }
}

function makeSection(overrides: Partial<AdvanceSectionDef> = {}): AdvanceSectionDef {
  return {
    id: "s1",
    template_id: "tmpl-1",
    title: "Venue Details",
    category: "venue_details",
    is_required: true,
    is_external_by_default: true,
    fields: [makeField()],
    ordinal: 1,
    ...overrides,
  }
}

function baseTemplate(overrides: Partial<AdvanceTemplate> = {}): AdvanceTemplate {
  return {
    id: "tmpl-1",
    org_id: "org-1",
    name: "Standard Venue Advance",
    version: 1,
    status: "active",
    sections: [
      makeSection(),
      makeSection({
        id: "s2",
        title: "Production",
        category: "production",
        ordinal: 2,
        default_due_offset: "P14D",
        default_owner_role: "production_manager",
        fields: [makeField({ id: "f2", section_id: "s2", ordinal: 1 })],
      }),
    ],
    created_by: "user-admin",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createAdvanceTemplateVersion
// ---------------------------------------------------------------------------

describe("createAdvanceTemplateVersion", () => {
  it("archives current, creates draft next version", () => {
    const { previous, next } = createAdvanceTemplateVersion(baseTemplate(), {
      new_id: "tmpl-2",
      sections: [makeSection()],
      created_by: "user-admin",
      now: "2025-06-01T00:00:00Z",
    })
    expect(previous.status).toBe("archived")
    expect(previous.id).toBe("tmpl-1")
    expect(next.id).toBe("tmpl-2")
    expect(next.version).toBe(2)
    expect(next.status).toBe("draft")
    expect(next.previous_version_id).toBe("tmpl-1")
  })

  it("preserves org_id and name when not overridden", () => {
    const { next } = createAdvanceTemplateVersion(baseTemplate(), {
      new_id: "tmpl-2",
      sections: [makeSection()],
      created_by: "user-admin",
    })
    expect(next.org_id).toBe("org-1")
    expect(next.name).toBe("Standard Venue Advance")
  })

  it("allows name override", () => {
    const { next } = createAdvanceTemplateVersion(baseTemplate(), {
      new_id: "tmpl-2",
      name: "Updated Venue Advance",
      sections: [makeSection()],
      created_by: "user-admin",
    })
    expect(next.name).toBe("Updated Venue Advance")
  })

  it("allows versioning a draft", () => {
    const { previous, next } = createAdvanceTemplateVersion(
      baseTemplate({ status: "draft" }),
      { new_id: "tmpl-2", sections: [makeSection()], created_by: "user-admin" },
    )
    expect(previous.status).toBe("archived")
    expect(next.version).toBe(2)
  })

  it("throws when versioning an archived template", () => {
    expect(() =>
      createAdvanceTemplateVersion(baseTemplate({ status: "archived" }), {
        new_id: "tmpl-2",
        sections: [],
        created_by: "user-admin",
      }),
    ).toThrow(/archived/)
  })
})

// ---------------------------------------------------------------------------
// activateAdvanceTemplate
// ---------------------------------------------------------------------------

describe("activateAdvanceTemplate", () => {
  it("activates a draft template", () => {
    const result = activateAdvanceTemplate(baseTemplate({ status: "draft" }))
    expect(result.status).toBe("active")
  })

  it("throws for non-draft templates", () => {
    expect(() => activateAdvanceTemplate(baseTemplate({ status: "active" }))).toThrow(/draft/)
    expect(() => activateAdvanceTemplate(baseTemplate({ status: "archived" }))).toThrow(/draft/)
  })
})

// ---------------------------------------------------------------------------
// validateAdvanceTemplate
// ---------------------------------------------------------------------------

describe("validateAdvanceTemplate", () => {
  it("passes a valid template", () => {
    const r = validateAdvanceTemplate(baseTemplate())
    expect(r.valid).toBe(true)
    expect(r.issues).toHaveLength(0)
  })

  it("fails on blank template name", () => {
    const r = validateAdvanceTemplate(baseTemplate({ name: "  " }))
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/name/)
  })

  it("fails when no sections", () => {
    const r = validateAdvanceTemplate(baseTemplate({ sections: [] }))
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/section/)
  })

  it("fails on duplicate section ordinals", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [makeSection({ ordinal: 1 }), makeSection({ id: "s2", ordinal: 1 })],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues.some((i) => i.message.includes("ordinal"))).toBe(true)
  })

  it("fails on blank section title", () => {
    const r = validateAdvanceTemplate(baseTemplate({ sections: [makeSection({ title: "" })] }))
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/title/)
  })

  it("fails on blank field label", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [makeSection({ fields: [makeField({ label: "" })] })],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/label/)
  })

  it("fails on select field with no options", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [
          makeSection({
            fields: [makeField({ field_type: "select", options: [] })],
          }),
        ],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/option/)
  })

  it("fails on file_upload field with no file_config", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [makeSection({ fields: [makeField({ field_type: "file_upload" })] })],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/file_config/)
  })

  it("fails on file_config with empty mime types", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [
          makeSection({
            fields: [
              makeField({
                field_type: "file_upload",
                file_config: {
                  accepted_mime_types: [],
                  max_file_size_bytes: 10_000_000,
                  max_files: 3,
                  require_scan_clearance: true,
                },
              }),
            ],
          }),
        ],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/accepted_mime_types/)
  })

  it("fails on conditional referencing non-existent field", () => {
    const r = validateAdvanceTemplate(
      baseTemplate({
        sections: [
          makeSection({
            fields: [
              makeField({
                conditional: {
                  depends_on_field_id: "nonexistent-field",
                  depends_on_value: true,
                  becomes_required: true,
                },
              }),
            ],
          }),
        ],
      }),
    )
    expect(r.valid).toBe(false)
    expect(r.issues[0].message).toMatch(/depends_on_field_id/)
  })

  it("passes conditional referencing a valid field", () => {
    const fields: AdvanceFieldDef[] = [
      makeField({ id: "f1", ordinal: 1 }),
      makeField({
        id: "f2",
        label: "More details",
        ordinal: 2,
        conditional: {
          depends_on_field_id: "f1",
          depends_on_value: "yes",
          becomes_required: true,
        },
      }),
    ]
    const r = validateAdvanceTemplate(
      baseTemplate({ sections: [makeSection({ fields })] }),
    )
    expect(r.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// parseDurationDaysAdv
// ---------------------------------------------------------------------------

describe("parseDurationDaysAdv", () => {
  it("parses P14D as 14", () => expect(parseDurationDaysAdv("P14D")).toBe(14))
  it("parses P1D as 1", () => expect(parseDurationDaysAdv("P1D")).toBe(1))
  it("returns null for P1M", () => expect(parseDurationDaysAdv("P1M")).toBeNull())
  it("returns null for undefined", () => expect(parseDurationDaysAdv(undefined)).toBeNull())
  it("returns null for empty string", () => expect(parseDurationDaysAdv("")).toBeNull())
})

// ---------------------------------------------------------------------------
// applyAdvanceTemplate
// ---------------------------------------------------------------------------

describe("applyAdvanceTemplate", () => {
  it("creates applied snapshot with correct template ref", () => {
    const applied = applyAdvanceTemplate(baseTemplate(), "2025-09-15", "2025-06-01T00:00:00Z")
    expect(applied.template_id).toBe("tmpl-1")
    expect(applied.template_version).toBe(1)
    expect(applied.sections).toHaveLength(2)
    expect(applied.applied_at).toBe("2025-06-01T00:00:00Z")
  })

  it("computes due dates from default_due_offset", () => {
    const applied = applyAdvanceTemplate(baseTemplate(), "2025-09-15", "2025-06-01T00:00:00Z")
    // section s2 has P14D → 14 days before 2025-09-15
    const s2 = applied.sections.find((s) => s.template_section_id === "s2")!
    expect(s2.due_date).toBe("2025-09-01")
  })

  it("leaves due_date undefined when no offset", () => {
    const applied = applyAdvanceTemplate(baseTemplate(), "2025-09-15", "2025-06-01T00:00:00Z")
    const s1 = applied.sections.find((s) => s.template_section_id === "s1")!
    expect(s1.due_date).toBeUndefined()
  })

  it("snapshot is independent — mutating template sections after apply does not affect snapshot", () => {
    const tmpl = baseTemplate()
    const applied = applyAdvanceTemplate(tmpl, "2025-09-15")
    // Mutate the template directly (simulating a version update)
    tmpl.sections[0].title = "CHANGED"
    // Snapshot still has original title
    expect(applied.sections[0].title).toBe("Venue Details")
  })

  it("throws when template is not active", () => {
    expect(() =>
      applyAdvanceTemplate(baseTemplate({ status: "draft" }), "2025-09-15"),
    ).toThrow(/active/)
  })

  it("sets is_external from section default", () => {
    const applied = applyAdvanceTemplate(baseTemplate(), "2025-09-15")
    expect(applied.sections[0].is_external).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// summarizeAdvanceTemplate
// ---------------------------------------------------------------------------

describe("summarizeAdvanceTemplate", () => {
  it("returns correct section count and metadata", () => {
    const s = summarizeAdvanceTemplate(baseTemplate())
    expect(s.section_count).toBe(2)
    expect(s.version).toBe(1)
    expect(s.status).toBe("active")
    expect(s.name).toBe("Standard Venue Advance")
  })
})
