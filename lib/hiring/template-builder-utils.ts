import type { OnboardingFieldType, OnboardingFormField } from "@/types/onboarding-template-resolver"

export interface FieldPaletteItem {
  type: OnboardingFieldType
  label: string
  description: string
  defaultSection: string
  isAgreement?: boolean
  defaultAgreementType?: string
}

export interface FieldPaletteGroup {
  category: string
  items: FieldPaletteItem[]
}

export const FIELD_PALETTE: FieldPaletteGroup[] = [
  {
    category: "Basic inputs",
    items: [
      { type: "text", label: "Short text", description: "Single-line text answer", defaultSection: "Details" },
      { type: "textarea", label: "Long text", description: "Multi-line text answer", defaultSection: "Details" },
      { type: "email", label: "Email", description: "Validated email address", defaultSection: "Contact" },
      { type: "phone", label: "Phone", description: "Mobile or contact number", defaultSection: "Contact" },
      { type: "number", label: "Number", description: "Numeric answer", defaultSection: "Details" },
      { type: "date", label: "Date", description: "Calendar date (supports minimum age)", defaultSection: "Identity" },
      { type: "select", label: "Dropdown", description: "Choose one option", defaultSection: "Details" },
      { type: "multiselect", label: "Multi-select", description: "Choose several options", defaultSection: "Details" },
      { type: "checkbox", label: "Checkbox", description: "Single confirmation checkbox", defaultSection: "Details" },
    ],
  },
  {
    category: "Structured info",
    items: [
      { type: "address", label: "Address", description: "Street, city, state, ZIP", defaultSection: "Contact" },
      { type: "emergency_contact", label: "Emergency contact", description: "Name, relationship, phone", defaultSection: "Emergency Contact" },
      { type: "tax_info", label: "Tax form", description: "W-9 / tax information", defaultSection: "Tax / Payment" },
      { type: "bank_info", label: "Payment info", description: "Direct deposit details", defaultSection: "Tax / Payment" },
    ],
  },
  {
    category: "Documents",
    items: [
      { type: "id_document", label: "Government ID", description: "Photo ID upload with review", defaultSection: "Documents" },
      { type: "file", label: "File / credential", description: "Certification or license upload", defaultSection: "Certifications" },
    ],
  },
  {
    category: "Agreements",
    items: [
      { type: "waiver", label: "Agreement / waiver", description: "One-click acceptance of legal text", defaultSection: "Agreements", isAgreement: true, defaultAgreementType: "worker" },
      { type: "training_acknowledgement", label: "Acknowledgement", description: "Confirm a policy or training", defaultSection: "Agreements", isAgreement: true, defaultAgreementType: "policy" },
    ],
  },
]

export const AGREEMENT_FIELD_TYPES: OnboardingFieldType[] = ["waiver", "training_acknowledgement"]

export function isAgreementField(field: Pick<OnboardingFormField, "type">): boolean {
  return AGREEMENT_FIELD_TYPES.includes(field.type)
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)
}

export function createFieldFromPalette(item: FieldPaletteItem, existingFields: OnboardingFormField[]): OnboardingFormField {
  const base = item.type
  let name: string = base
  let suffix = 1
  const usedNames = new Set(existingFields.map((field) => field.name))
  while (usedNames.has(name)) {
    suffix += 1
    name = `${base}_${suffix}`
  }

  const maxOrder = existingFields.reduce((max, field) => Math.max(max, field.order ?? 0), 0)

  const field: OnboardingFormField = {
    id: name,
    name,
    label: item.label,
    type: item.type,
    section: item.defaultSection,
    order: maxOrder + 10,
    required: !item.isAgreement ? true : true,
    blocking: item.isAgreement ? true : false,
  }

  if (item.type === "select" || item.type === "multiselect") {
    field.options = ["Option 1", "Option 2"]
  }

  if (item.type === "id_document" || item.type === "file") {
    field.requiresAdminReview = true
  }

  if (item.isAgreement) {
    field.metadata = {
      agreementType: item.defaultAgreementType ?? "policy",
      requiresAcknowledgement: true,
      agreementBody: "Enter the agreement text the worker must accept.",
    }
  }

  return field
}

export function getAgreementBody(field: OnboardingFormField): string {
  const metadata = field.metadata as Record<string, unknown> | undefined
  const body = metadata?.agreementBody
  return typeof body === "string" ? body : ""
}

export function getAgreementType(field: OnboardingFormField): string {
  const metadata = field.metadata as Record<string, unknown> | undefined
  const type = metadata?.agreementType
  return typeof type === "string" ? type : "policy"
}

export function groupFieldsBySection(fields: OnboardingFormField[]): Array<{ section: string; fields: OnboardingFormField[] }> {
  const ordered = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const sections: string[] = []
  const map = new Map<string, OnboardingFormField[]>()

  for (const field of ordered) {
    const section = field.section || "Details"
    if (!map.has(section)) {
      map.set(section, [])
      sections.push(section)
    }
    map.get(section)!.push(field)
  }

  return sections.map((section) => ({ section, fields: map.get(section)! }))
}
