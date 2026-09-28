/**
 * ADV-401 — Create versioned organization templates
 *
 * An organization owns versioned advance templates.  Each template contains
 * sections; each section contains typed fields with conditional requirements,
 * default owners/due offsets, accepted file types, and validation rules.
 *
 * Version changes create a new template version and archive the old one.
 * Active advances snapshot the template_version at apply time so that later
 * template edits never silently change an open advance.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------

export type AdvanceFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "time"
  | "datetime"
  | "contact"        // structured name/email/phone/role
  | "address"        // structured postal
  | "file_upload"    // one or more files (see AdvanceFileConfig)
  | "select"         // single choice from options
  | "multiselect"    // multiple choices from options
  | "richtext";      // formatted text / HTML

// ---------------------------------------------------------------------------
// File upload config
// ---------------------------------------------------------------------------

export interface AdvanceFileConfig {
  /** MIME types accepted; e.g. ["application/pdf", "image/jpeg"] */
  accepted_mime_types: string[]
  /** Maximum individual file size in bytes */
  max_file_size_bytes: number
  /** Maximum total files for this field */
  max_files: number
  /** Whether each file requires malware-scan clearance before use */
  require_scan_clearance: boolean
}

// ---------------------------------------------------------------------------
// Conditional requirement
// ---------------------------------------------------------------------------

/**
 * A field or section is conditionally required when another field on the
 * same section has a specific value.
 */
export interface AdvanceConditionalRequirement {
  depends_on_field_id: string
  depends_on_value: string | boolean | number
  /** When the condition is true, the field is required */
  becomes_required: boolean
}

// ---------------------------------------------------------------------------
// Validation rule
// ---------------------------------------------------------------------------

export type AdvanceValidationRuleType =
  | "min_length"
  | "max_length"
  | "min_value"
  | "max_value"
  | "regex"
  | "required_when_status"   // required once section status reaches a threshold
  | "min_files"
  | "max_files";

export interface AdvanceValidationRule {
  type: AdvanceValidationRuleType
  value: string | number
  error_message: string
}

// ---------------------------------------------------------------------------
// Field definition
// ---------------------------------------------------------------------------

export interface AdvanceFieldDef {
  id: string
  section_id: string
  label: string
  description?: string
  field_type: AdvanceFieldType
  is_required: boolean
  /** Conditionally overrides is_required when the condition is met */
  conditional?: AdvanceConditionalRequirement
  /** For select/multiselect: available choices */
  options?: string[]
  /** For file_upload fields */
  file_config?: AdvanceFileConfig
  /** Validation rules applied in order */
  validation_rules: AdvanceValidationRule[]
  /** Free-text hint shown to the respondent */
  placeholder?: string
  ordinal: number
}

// ---------------------------------------------------------------------------
// Section definition
// ---------------------------------------------------------------------------

export type AdvanceSectionCategory =
  | "venue_details"
  | "production"
  | "staffing"
  | "hospitality"
  | "ticketing"
  | "security"
  | "media"
  | "transport"
  | "emergency"
  | "local_contacts"
  | "settlement"
  | "custom"

export interface AdvanceSectionDef {
  id: string
  template_id: string
  title: string
  description?: string
  category: AdvanceSectionCategory
  is_required: boolean
  /** Default owner role or user ID (resolved at advance apply time) */
  default_owner_role?: string
  /** ISO-8601 duration before event start: "P14D" = 14 days before */
  default_due_offset?: string
  /** Whether this section is sent to external respondents by default */
  is_external_by_default: boolean
  fields: AdvanceFieldDef[]
  ordinal: number
}

// ---------------------------------------------------------------------------
// Template lifecycle
// ---------------------------------------------------------------------------

export type AdvanceTemplateStatus = "draft" | "active" | "archived"

export interface AdvanceTemplate {
  id: string
  org_id: string
  name: string
  description?: string
  version: number
  status: AdvanceTemplateStatus
  sections: AdvanceSectionDef[]
  previous_version_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

export interface CreateAdvanceTemplateVersionInput {
  new_id: string
  name?: string
  description?: string
  sections: AdvanceSectionDef[]
  created_by: string
  now?: string
}

export interface CreateAdvanceTemplateVersionResult {
  previous: AdvanceTemplate   // archived
  next: AdvanceTemplate       // new draft
}

export function createAdvanceTemplateVersion(
  template: AdvanceTemplate,
  input: CreateAdvanceTemplateVersionInput,
): CreateAdvanceTemplateVersionResult {
  if (template.status === "archived") {
    throw new Error(
      `Cannot create a new version from an archived template (id: ${template.id}).`,
    )
  }
  const now = input.now ?? new Date().toISOString()

  const previous: AdvanceTemplate = { ...template, status: "archived", updated_at: now }

  const next: AdvanceTemplate = {
    id: input.new_id,
    org_id: template.org_id,
    name: input.name ?? template.name,
    description: input.description ?? template.description,
    version: template.version + 1,
    status: "draft",
    sections: input.sections,
    previous_version_id: template.id,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  }

  return { previous, next }
}

// ---------------------------------------------------------------------------
// Activate
// ---------------------------------------------------------------------------

export function activateAdvanceTemplate(
  template: AdvanceTemplate,
  now?: string,
): AdvanceTemplate {
  if (template.status !== "draft") {
    throw new Error(
      `Only draft templates can be activated (current status: ${template.status}).`,
    )
  }
  const ts = now ?? new Date().toISOString()
  return { ...template, status: "active", updated_at: ts }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface TemplateValidationIssue {
  location: string   // e.g. "section[s1].field[f2]"
  message: string
}

export interface AdvanceTemplateValidationResult {
  valid: boolean
  issues: TemplateValidationIssue[]
}

export function validateAdvanceTemplate(
  template: AdvanceTemplate,
): AdvanceTemplateValidationResult {
  const issues: TemplateValidationIssue[] = []

  if (!template.name.trim()) {
    issues.push({ location: "template", message: "Template name must not be blank." })
  }
  if (template.sections.length === 0) {
    issues.push({ location: "template", message: "Template must have at least one section." })
  }

  const sectionOrdinals = template.sections.map((s) => s.ordinal)
  const dupSectionOrdinals = sectionOrdinals.filter(
    (o, i) => sectionOrdinals.indexOf(o) !== i,
  )
  if (dupSectionOrdinals.length > 0) {
    issues.push({
      location: "template.sections",
      message: `Duplicate section ordinals: ${[...new Set(dupSectionOrdinals)].join(", ")}.`,
    })
  }

  for (const section of template.sections) {
    const loc = `section[${section.id}]`

    if (!section.title.trim()) {
      issues.push({ location: loc, message: "Section title must not be blank." })
    }

    const fieldOrdinals = section.fields.map((f) => f.ordinal)
    const dupFieldOrdinals = fieldOrdinals.filter((o, i) => fieldOrdinals.indexOf(o) !== i)
    if (dupFieldOrdinals.length > 0) {
      issues.push({
        location: `${loc}.fields`,
        message: `Duplicate field ordinals: ${[...new Set(dupFieldOrdinals)].join(", ")}.`,
      })
    }

    for (const field of section.fields) {
      const floc = `${loc}.field[${field.id}]`

      if (!field.label.trim()) {
        issues.push({ location: floc, message: "Field label must not be blank." })
      }
      if (
        (field.field_type === "select" || field.field_type === "multiselect") &&
        (!field.options || field.options.length === 0)
      ) {
        issues.push({
          location: floc,
          message: "Select/multiselect fields must have at least one option.",
        })
      }
      if (field.field_type === "file_upload") {
        if (!field.file_config) {
          issues.push({ location: floc, message: "file_upload fields must have a file_config." })
        } else {
          if (field.file_config.accepted_mime_types.length === 0) {
            issues.push({ location: floc, message: "file_config.accepted_mime_types must not be empty." })
          }
          if (field.file_config.max_file_size_bytes <= 0) {
            issues.push({ location: floc, message: "file_config.max_file_size_bytes must be > 0." })
          }
          if (field.file_config.max_files <= 0) {
            issues.push({ location: floc, message: "file_config.max_files must be > 0." })
          }
        }
      }
      if (field.conditional) {
        const refExists = section.fields.some(
          (f) => f.id === field.conditional!.depends_on_field_id,
        )
        if (!refExists) {
          issues.push({
            location: floc,
            message: `conditional.depends_on_field_id '${field.conditional.depends_on_field_id}' not found in section.`,
          })
        }
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

// ---------------------------------------------------------------------------
// Apply template to an advance — snapshot at apply time
// ---------------------------------------------------------------------------

export interface AppliedAdvanceSection {
  /** Snapshot of the section definition at apply time */
  template_section_id: string
  title: string
  category: AdvanceSectionCategory
  is_required: boolean
  is_external: boolean
  default_owner_role?: string
  due_date?: string                // computed from event_start_date + default_due_offset
  fields: AdvanceFieldDef[]        // immutable copy
  ordinal: number
}

export interface AppliedAdvanceTemplate {
  org_id: string
  template_id: string
  template_version: number
  sections: AppliedAdvanceSection[]
  applied_at: string
}

/**
 * Parses a "P_D" ISO-8601 duration (days only) and returns the number of
 * days, or null if the format is not a plain-day duration.
 */
export function parseDurationDaysAdv(
  duration: string | undefined,
): number | null {
  if (!duration) return null
  const m = duration.match(/^P(\d+)D$/)
  return m ? parseInt(m[1], 10) : null
}

export function applyAdvanceTemplate(
  template: AdvanceTemplate,
  eventStartDate: string,
  now?: string,
): AppliedAdvanceTemplate {
  if (template.status !== "active") {
    throw new Error(
      `Only active templates can be applied (status: ${template.status}).`,
    )
  }
  const ts = now ?? new Date().toISOString()

  const sections: AppliedAdvanceSection[] = template.sections.map((sec) => {
    let due_date: string | undefined
    const days = parseDurationDaysAdv(sec.default_due_offset)
    if (days !== null) {
      const d = new Date(eventStartDate)
      d.setDate(d.getDate() - days)
      due_date = d.toISOString().slice(0, 10)
    }

    return {
      template_section_id: sec.id,
      title: sec.title,
      category: sec.category,
      is_required: sec.is_required,
      is_external: sec.is_external_by_default,
      default_owner_role: sec.default_owner_role,
      due_date,
      fields: sec.fields.map((f) => ({ ...f })),   // deep copy
      ordinal: sec.ordinal,
    }
  })

  return {
    org_id: template.org_id,
    template_id: template.id,
    template_version: template.version,
    sections,
    applied_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Version history summary (for UI breadcrumb)
// ---------------------------------------------------------------------------

export interface AdvanceTemplateSummary {
  id: string
  org_id: string
  name: string
  version: number
  status: AdvanceTemplateStatus
  section_count: number
  created_by: string
  created_at: string
}

export function summarizeAdvanceTemplate(t: AdvanceTemplate): AdvanceTemplateSummary {
  return {
    id: t.id,
    org_id: t.org_id,
    name: t.name,
    version: t.version,
    status: t.status,
    section_count: t.sections.length,
    created_by: t.created_by,
    created_at: t.created_at,
  }
}
