/**
 * ADV-404 — Add typed response and file validation
 *
 * Each advance section field response carries:
 *   - A typed value (text, number, boolean, date, time, datetime,
 *     contact, address, file_ref, select, multiselect, richtext)
 *   - Optional unit annotation (e.g. "kW", "m", "lbs")
 *   - IANA time zone for date/time/datetime values
 *   - Immutable revision history
 *   - Validation state (valid/invalid/missing/pending_scan)
 *
 * File references carry malware-scan status and per-section/field
 * file count limits.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { AdvanceFieldDef, AdvanceValidationRule } from "./advance-template"

// ---------------------------------------------------------------------------
// Typed value
// ---------------------------------------------------------------------------

/** Structured contact — used for contact-type field values */
export interface AdvanceContactValue {
  name: string
  role?: string
  email?: string
  phone?: string
  company?: string
}

/** Structured address */
export interface AdvanceAddressValue {
  line1: string
  line2?: string
  city: string
  region?: string
  postal_code?: string
  country: string
}

/** File reference — points to a scanned upload */
export interface AdvanceFileRefValue {
  upload_slot_id: string
  original_filename: string
  mime_type: string
  file_size_bytes: number
  /** true only when the malware scan has cleared it */
  scan_cleared: boolean
}

export type AdvanceFieldValue =
  | string
  | number
  | boolean
  | null
  | AdvanceContactValue
  | AdvanceAddressValue
  | AdvanceFileRefValue
  | AdvanceFileRefValue[]   // file_upload multi
  | string[]               // multiselect

// ---------------------------------------------------------------------------
// Validation state
// ---------------------------------------------------------------------------

export type AdvanceFieldValidationState =
  | "valid"
  | "invalid"
  | "missing"        // required field has no value
  | "pending_scan"   // file uploaded but scan not yet complete

export interface AdvanceFieldValidationResult {
  field_id: string
  state: AdvanceFieldValidationState
  messages: string[]
}

// ---------------------------------------------------------------------------
// Validate a single field value
// ---------------------------------------------------------------------------

export function validateFieldValue(
  field: AdvanceFieldDef,
  value: AdvanceFieldValue | undefined,
): AdvanceFieldValidationResult {
  const messages: string[] = []

  // Missing check
  if (value === null || value === undefined || value === "") {
    if (field.is_required) {
      return { field_id: field.id, state: "missing", messages: ["This field is required."] }
    }
    return { field_id: field.id, state: "valid", messages: [] }
  }

  // Type-specific checks
  switch (field.field_type) {
    case "text":
    case "richtext": {
      if (typeof value !== "string") {
        messages.push("Expected a text value.")
        break
      }
      for (const rule of field.validation_rules) {
        applyStringRule(rule, value as string, messages)
      }
      break
    }
    case "number": {
      if (typeof value !== "number" || isNaN(value)) {
        messages.push("Expected a numeric value.")
        break
      }
      for (const rule of field.validation_rules) {
        applyNumberRule(rule, value as number, messages)
      }
      break
    }
    case "boolean": {
      if (typeof value !== "boolean") messages.push("Expected a yes/no value.")
      break
    }
    case "date": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value as string)) {
        messages.push("Expected a date in YYYY-MM-DD format.")
      }
      break
    }
    case "time": {
      if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value as string)) {
        messages.push("Expected a time in HH:MM or HH:MM:SS format.")
      }
      break
    }
    case "datetime": {
      if (typeof value !== "string" || isNaN(Date.parse(value as string))) {
        messages.push("Expected an ISO-8601 datetime value.")
      }
      break
    }
    case "contact": {
      const c = value as AdvanceContactValue
      if (!c || typeof c !== "object" || Array.isArray(c)) {
        messages.push("Expected a contact object.")
        break
      }
      if (!c.name?.trim()) messages.push("Contact name is required.")
      break
    }
    case "address": {
      const a = value as AdvanceAddressValue
      if (!a || typeof a !== "object" || Array.isArray(a)) {
        messages.push("Expected an address object.")
        break
      }
      if (!a.line1?.trim()) messages.push("Address line1 is required.")
      if (!a.city?.trim()) messages.push("Address city is required.")
      if (!a.country?.trim()) messages.push("Address country is required.")
      break
    }
    case "file_upload": {
      const fc = field.file_config
      const files = Array.isArray(value) ? (value as AdvanceFileRefValue[]) : [value as AdvanceFileRefValue]
      // Check scan status
      const pendingScan = files.some((f) => !f.scan_cleared)
      if (pendingScan) {
        return { field_id: field.id, state: "pending_scan", messages: ["File is awaiting malware scan clearance."] }
      }
      if (fc) {
        if (files.length > fc.max_files) {
          messages.push(`Too many files: maximum is ${fc.max_files}.`)
        }
        for (const file of files) {
          if (file.file_size_bytes > fc.max_file_size_bytes) {
            messages.push(`File '${file.original_filename}' exceeds the ${fc.max_file_size_bytes} byte limit.`)
          }
          if (fc.accepted_mime_types.length > 0 && !fc.accepted_mime_types.includes(file.mime_type)) {
            messages.push(`File type '${file.mime_type}' is not accepted.`)
          }
        }
      }
      break
    }
    case "select": {
      if (typeof value !== "string") {
        messages.push("Expected a single selection value.")
        break
      }
      if (field.options && !field.options.includes(value as string)) {
        messages.push(`Value '${value}' is not a valid option.`)
      }
      break
    }
    case "multiselect": {
      if (!Array.isArray(value)) {
        messages.push("Expected an array of selection values.")
        break
      }
      if (field.options) {
        for (const v of value as string[]) {
          if (!field.options.includes(v)) {
            messages.push(`Value '${v}' is not a valid option.`)
          }
        }
      }
      break
    }
  }

  return {
    field_id: field.id,
    state: messages.length === 0 ? "valid" : "invalid",
    messages,
  }
}

// ---------------------------------------------------------------------------
// Validation rule helpers
// ---------------------------------------------------------------------------

function applyStringRule(rule: AdvanceValidationRule, value: string, messages: string[]): void {
  switch (rule.type) {
    case "min_length":
      if (value.length < Number(rule.value)) messages.push(rule.error_message)
      break
    case "max_length":
      if (value.length > Number(rule.value)) messages.push(rule.error_message)
      break
    case "regex":
      if (!new RegExp(String(rule.value)).test(value)) messages.push(rule.error_message)
      break
  }
}

function applyNumberRule(rule: AdvanceValidationRule, value: number, messages: string[]): void {
  switch (rule.type) {
    case "min_value":
      if (value < Number(rule.value)) messages.push(rule.error_message)
      break
    case "max_value":
      if (value > Number(rule.value)) messages.push(rule.error_message)
      break
  }
}

// ---------------------------------------------------------------------------
// Field response with revision history
// ---------------------------------------------------------------------------

export interface AdvanceFieldResponseRevision {
  revised_at: string
  revised_by: string
  previous_value: AdvanceFieldValue
  reason?: string
}

export interface AdvanceFieldResponse {
  id: string
  advance_section_id: string
  field_id: string
  field_type: AdvanceFieldDef["field_type"]
  value: AdvanceFieldValue
  /** IANA time zone for date/time/datetime values */
  time_zone?: string
  /** Unit annotation for number values (e.g. "kW", "m") */
  unit?: string
  validation_state: AdvanceFieldValidationState
  validation_messages: string[]
  revision_history: AdvanceFieldResponseRevision[]
  created_by: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Upsert response (creates or updates; records revision history)
// ---------------------------------------------------------------------------

export interface UpsertFieldResponseInput {
  id: string
  advance_section_id: string
  field_id: string
  field_def: AdvanceFieldDef
  new_value: AdvanceFieldValue
  time_zone?: string
  unit?: string
  updated_by: string
  revision_reason?: string
  now?: string
}

export function upsertFieldResponse(
  existing: AdvanceFieldResponse | undefined,
  input: UpsertFieldResponseInput,
): AdvanceFieldResponse {
  const ts = input.now ?? new Date().toISOString()
  const validation = validateFieldValue(input.field_def, input.new_value)

  if (!existing) {
    return {
      id: input.id,
      advance_section_id: input.advance_section_id,
      field_id: input.field_id,
      field_type: input.field_def.field_type,
      value: input.new_value,
      time_zone: input.time_zone,
      unit: input.unit,
      validation_state: validation.state,
      validation_messages: validation.messages,
      revision_history: [],
      created_by: input.updated_by,
      created_at: ts,
      updated_at: ts,
    }
  }

  const revision: AdvanceFieldResponseRevision = {
    revised_at: ts,
    revised_by: input.updated_by,
    previous_value: existing.value,
    reason: input.revision_reason,
  }

  return {
    ...existing,
    value: input.new_value,
    time_zone: input.time_zone ?? existing.time_zone,
    unit: input.unit ?? existing.unit,
    validation_state: validation.state,
    validation_messages: validation.messages,
    revision_history: [...existing.revision_history, revision],
    updated_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Section-level validation summary
// ---------------------------------------------------------------------------

export interface SectionValidationSummary {
  section_id: string
  total_fields: number
  valid: number
  invalid: number
  missing: number
  pending_scan: number
  can_submit: boolean
}

export function summarizeSectionValidation(
  sectionId: string,
  fields: AdvanceFieldDef[],
  responses: AdvanceFieldResponse[],
): SectionValidationSummary {
  let valid = 0, invalid = 0, missing = 0, pending_scan = 0

  for (const field of fields) {
    const resp = responses.find((r) => r.field_id === field.id)
    const result = validateFieldValue(field, resp?.value)
    switch (result.state) {
      case "valid": valid++; break
      case "invalid": invalid++; break
      case "missing": missing++; break
      case "pending_scan": pending_scan++; break
    }
  }

  return {
    section_id: sectionId,
    total_fields: fields.length,
    valid,
    invalid,
    missing,
    pending_scan,
    can_submit: invalid === 0 && missing === 0 && pending_scan === 0,
  }
}
