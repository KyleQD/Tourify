import { describe, it, expect } from "vitest"
import {
  validateFieldValue,
  upsertFieldResponse,
  summarizeSectionValidation,
  type AdvanceFieldResponse,
  type AdvanceFileRefValue,
  type AdvanceContactValue,
  type AdvanceAddressValue,
} from "../../lib/admin/advance-response-validation"
import type { AdvanceFieldDef } from "../../lib/admin/advance-template"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function field(overrides: Partial<AdvanceFieldDef> = {}): AdvanceFieldDef {
  return {
    id: "f1",
    section_id: "s1",
    label: "Stage width",
    field_type: "text",
    is_required: true,
    validation_rules: [],
    ordinal: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// validateFieldValue — missing
// ---------------------------------------------------------------------------

describe("validateFieldValue — missing", () => {
  it("returns missing for required empty string", () => {
    const r = validateFieldValue(field({ is_required: true }), "")
    expect(r.state).toBe("missing")
  })
  it("returns missing for required null", () => {
    const r = validateFieldValue(field({ is_required: true }), null)
    expect(r.state).toBe("missing")
  })
  it("returns valid for optional empty value", () => {
    const r = validateFieldValue(field({ is_required: false }), "")
    expect(r.state).toBe("valid")
  })
})

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

describe("validateFieldValue — text", () => {
  it("passes a simple string", () => {
    expect(validateFieldValue(field(), "Madison Square Garden").state).toBe("valid")
  })
  it("fails min_length rule", () => {
    const f = field({ validation_rules: [{ type: "min_length", value: 5, error_message: "Too short" }] })
    const r = validateFieldValue(f, "Hi")
    expect(r.state).toBe("invalid")
    expect(r.messages[0]).toBe("Too short")
  })
  it("fails max_length rule", () => {
    const f = field({ validation_rules: [{ type: "max_length", value: 3, error_message: "Too long" }] })
    const r = validateFieldValue(f, "Hello")
    expect(r.state).toBe("invalid")
  })
  it("passes regex rule", () => {
    const f = field({ validation_rules: [{ type: "regex", value: "^\\d{5}$", error_message: "5 digits" }] })
    expect(validateFieldValue(f, "90210").state).toBe("valid")
    expect(validateFieldValue(f, "abc").state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// number
// ---------------------------------------------------------------------------

describe("validateFieldValue — number", () => {
  it("passes a valid number", () => {
    expect(validateFieldValue(field({ field_type: "number" }), 120).state).toBe("valid")
  })
  it("fails for non-number value", () => {
    expect(validateFieldValue(field({ field_type: "number" }), "abc").state).toBe("invalid")
  })
  it("fails min_value rule", () => {
    const f = field({ field_type: "number", validation_rules: [{ type: "min_value", value: 10, error_message: "Too low" }] })
    expect(validateFieldValue(f, 5).state).toBe("invalid")
  })
  it("fails max_value rule", () => {
    const f = field({ field_type: "number", validation_rules: [{ type: "max_value", value: 100, error_message: "Too high" }] })
    expect(validateFieldValue(f, 200).state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// boolean
// ---------------------------------------------------------------------------

describe("validateFieldValue — boolean", () => {
  it("passes true/false", () => {
    expect(validateFieldValue(field({ field_type: "boolean" }), true).state).toBe("valid")
    expect(validateFieldValue(field({ field_type: "boolean" }), false).state).toBe("valid")
  })
  it("fails for non-boolean", () => {
    expect(validateFieldValue(field({ field_type: "boolean" }), "yes").state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// date / time / datetime
// ---------------------------------------------------------------------------

describe("validateFieldValue — date", () => {
  it("passes YYYY-MM-DD", () => {
    expect(validateFieldValue(field({ field_type: "date" }), "2025-09-15").state).toBe("valid")
  })
  it("fails non-date string", () => {
    expect(validateFieldValue(field({ field_type: "date" }), "tomorrow").state).toBe("invalid")
  })
})

describe("validateFieldValue — time", () => {
  it("passes HH:MM", () => {
    expect(validateFieldValue(field({ field_type: "time" }), "14:30").state).toBe("valid")
  })
  it("passes HH:MM:SS", () => {
    expect(validateFieldValue(field({ field_type: "time" }), "14:30:00").state).toBe("valid")
  })
  it("fails invalid time", () => {
    expect(validateFieldValue(field({ field_type: "time" }), "2pm").state).toBe("invalid")
  })
})

describe("validateFieldValue — datetime", () => {
  it("passes ISO datetime", () => {
    expect(validateFieldValue(field({ field_type: "datetime" }), "2025-09-15T14:30:00Z").state).toBe("valid")
  })
  it("fails non-datetime", () => {
    expect(validateFieldValue(field({ field_type: "datetime" }), "not a date").state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// contact
// ---------------------------------------------------------------------------

describe("validateFieldValue — contact", () => {
  it("passes complete contact", () => {
    const c: AdvanceContactValue = { name: "Jane Doe", role: "Venue Manager", email: "jane@venue.com", phone: "+1-555-0100" }
    expect(validateFieldValue(field({ field_type: "contact" }), c).state).toBe("valid")
  })
  it("fails contact with empty name", () => {
    const c: AdvanceContactValue = { name: "" }
    expect(validateFieldValue(field({ field_type: "contact" }), c).state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// address
// ---------------------------------------------------------------------------

describe("validateFieldValue — address", () => {
  it("passes complete address", () => {
    const a: AdvanceAddressValue = { line1: "4 Penn Plaza", city: "New York", country: "US" }
    expect(validateFieldValue(field({ field_type: "address" }), a).state).toBe("valid")
  })
  it("fails address missing city", () => {
    const a: AdvanceAddressValue = { line1: "4 Penn Plaza", city: "", country: "US" }
    expect(validateFieldValue(field({ field_type: "address" }), a).state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// file_upload
// ---------------------------------------------------------------------------

describe("validateFieldValue — file_upload", () => {
  const fileField = field({
    field_type: "file_upload",
    file_config: { accepted_mime_types: ["application/pdf"], max_file_size_bytes: 10_000_000, max_files: 3, require_scan_clearance: true },
  })

  const cleared: AdvanceFileRefValue = { upload_slot_id: "slot-1", original_filename: "plan.pdf", mime_type: "application/pdf", file_size_bytes: 500_000, scan_cleared: true }
  const pending: AdvanceFileRefValue = { ...cleared, scan_cleared: false }

  it("returns pending_scan when any file not yet scanned", () => {
    expect(validateFieldValue(fileField, [pending]).state).toBe("pending_scan")
  })
  it("passes cleared files within limits", () => {
    expect(validateFieldValue(fileField, [cleared]).state).toBe("valid")
  })
  it("fails when too many files", () => {
    const r = validateFieldValue(fileField, [cleared, cleared, cleared, cleared])
    expect(r.state).toBe("invalid")
    expect(r.messages[0]).toMatch(/Too many files/)
  })
  it("fails when file exceeds size limit", () => {
    const big: AdvanceFileRefValue = { ...cleared, file_size_bytes: 20_000_000 }
    expect(validateFieldValue(fileField, [big]).state).toBe("invalid")
  })
  it("fails when MIME type not accepted", () => {
    const wrong: AdvanceFileRefValue = { ...cleared, mime_type: "image/png" }
    expect(validateFieldValue(fileField, [wrong]).state).toBe("invalid")
  })
})

// ---------------------------------------------------------------------------
// select / multiselect
// ---------------------------------------------------------------------------

describe("validateFieldValue — select", () => {
  const sel = field({ field_type: "select", options: ["yes", "no", "tbd"] })
  it("passes valid option", () => expect(validateFieldValue(sel, "yes").state).toBe("valid"))
  it("fails invalid option", () => expect(validateFieldValue(sel, "maybe").state).toBe("invalid"))
})

describe("validateFieldValue — multiselect", () => {
  const ms = field({ field_type: "multiselect", options: ["wifi", "power", "rigging"] })
  it("passes valid array", () => expect(validateFieldValue(ms, ["wifi", "power"]).state).toBe("valid"))
  it("fails when array contains invalid option", () => expect(validateFieldValue(ms, ["wifi", "catering"]).state).toBe("invalid"))
  it("fails when value is not an array", () => expect(validateFieldValue(ms, "wifi").state).toBe("invalid"))
})

// ---------------------------------------------------------------------------
// upsertFieldResponse
// ---------------------------------------------------------------------------

describe("upsertFieldResponse", () => {
  it("creates a new response when none exists", () => {
    const resp = upsertFieldResponse(undefined, {
      id: "r1",
      advance_section_id: "as-1",
      field_id: "f1",
      field_def: field(),
      new_value: "Garden State Arts Center",
      updated_by: "user-coord",
      now: "2025-06-10T00:00:00Z",
    })
    expect(resp.value).toBe("Garden State Arts Center")
    expect(resp.validation_state).toBe("valid")
    expect(resp.revision_history).toHaveLength(0)
  })

  it("updates and records revision history", () => {
    const existing: AdvanceFieldResponse = {
      id: "r1",
      advance_section_id: "as-1",
      field_id: "f1",
      field_type: "text",
      value: "Old value",
      validation_state: "valid",
      validation_messages: [],
      revision_history: [],
      created_by: "user-coord",
      created_at: "2025-06-01T00:00:00Z",
      updated_at: "2025-06-01T00:00:00Z",
    }
    const updated = upsertFieldResponse(existing, {
      id: "r1",
      advance_section_id: "as-1",
      field_id: "f1",
      field_def: field(),
      new_value: "New value",
      updated_by: "user-pm",
      revision_reason: "Venue corrected",
      now: "2025-06-15T00:00:00Z",
    })
    expect(updated.value).toBe("New value")
    expect(updated.revision_history).toHaveLength(1)
    expect(updated.revision_history[0].previous_value).toBe("Old value")
    expect(updated.revision_history[0].reason).toBe("Venue corrected")
  })

  it("sets missing state when required field set to empty", () => {
    const resp = upsertFieldResponse(undefined, {
      id: "r1",
      advance_section_id: "as-1",
      field_id: "f1",
      field_def: field({ is_required: true }),
      new_value: "",
      updated_by: "user-coord",
    })
    expect(resp.validation_state).toBe("missing")
  })
})

// ---------------------------------------------------------------------------
// summarizeSectionValidation
// ---------------------------------------------------------------------------

describe("summarizeSectionValidation", () => {
  it("reports can_submit when all fields valid", () => {
    const fields = [field({ id: "f1" }), field({ id: "f2" })]
    const responses: AdvanceFieldResponse[] = [
      { id: "r1", advance_section_id: "as-1", field_id: "f1", field_type: "text", value: "A", validation_state: "valid", validation_messages: [], revision_history: [], created_by: "u", created_at: "", updated_at: "" },
      { id: "r2", advance_section_id: "as-1", field_id: "f2", field_type: "text", value: "B", validation_state: "valid", validation_messages: [], revision_history: [], created_by: "u", created_at: "", updated_at: "" },
    ]
    const s = summarizeSectionValidation("as-1", fields, responses)
    expect(s.can_submit).toBe(true)
    expect(s.valid).toBe(2)
    expect(s.missing).toBe(0)
  })

  it("blocks can_submit when a required field is missing", () => {
    const fields = [field({ id: "f1", is_required: true })]
    const s = summarizeSectionValidation("as-1", fields, [])
    expect(s.can_submit).toBe(false)
    expect(s.missing).toBe(1)
  })
})
