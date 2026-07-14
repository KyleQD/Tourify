import type { OnboardingField, OnboardingSectionKey } from "@/types/hiring-worker-onboarding"

export const PERSONAL_INFO_STEP_ID = "personal_info"
export const PERSONAL_INFO_ATTESTATION_FIELD = "personal_info_attestation"
export const PERSONAL_INFO_ATTESTED_AT_FIELD = "personal_info_attested_at"

/** Template sections that collapse into the first wizard step (preserve field.order). */
export const PERSONAL_INFO_SECTION_KEYS = [
  "identity",
  "contact",
  "emergency_contact",
  "work_eligibility",
] as const

export type WizardStepId = string

export interface WizardStepGroup {
  id: WizardStepId
  label: string
  fields: OnboardingField[]
  /** Canonical subsection keys present in this step (for optional headings). */
  subsections?: Array<{ key: string; label: string }>
}

const SECTION_ALIASES: Record<string, string> = {
  identity: "identity",
  contact: "contact",
  emergency: "emergency_contact",
  emergency_contact: "emergency_contact",
  "emergency contact": "emergency_contact",
  work_eligibility: "work_eligibility",
  "work eligibility": "work_eligibility",
  certifications: "certifications",
  tax_payment: "tax_payment",
  "tax / payment": "tax_payment",
  "tax/payment": "tax_payment",
  documents: "documents",
  waiver: "agreements",
  agreements: "agreements",
  review: "review",
  custom: "custom",
  personal_info: "personal_info",
  "personal info": "personal_info",
}

const STEP_LABELS: Record<string, string> = {
  personal_info: "Personal info",
  identity: "Identity",
  contact: "Contact",
  emergency_contact: "Emergency",
  work_eligibility: "Work eligibility",
  certifications: "Certifications",
  tax_payment: "Tax / payment",
  documents: "Documents",
  agreements: "Agreements",
  waiver: "Agreements",
  review: "Review",
  custom: "Additional info",
}

const PERSONAL_INFO_SET = new Set<string>(PERSONAL_INFO_SECTION_KEYS)

function slugifySection(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
}

/**
 * Normalize Title Case / snake_case / spaced template section labels to canonical keys.
 */
export function normalizeSectionKey(section?: string | null): string {
  if (!section || !section.trim()) return "custom"
  const slug = slugifySection(section)
  if (SECTION_ALIASES[slug]) return SECTION_ALIASES[slug]
  return slug.replace(/\s+/g, "_")
}

export function getStepLabel(stepId: string): string {
  return STEP_LABELS[stepId] || stepId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getSubsectionLabel(sectionKey: string): string {
  return STEP_LABELS[sectionKey] || getStepLabel(sectionKey)
}

function sortByOrder(fields: OnboardingField[]): OnboardingField[] {
  return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Build wizard steps: merge Identity/Contact/Emergency/Work eligibility into Personal info.
 * Other sections remain separate. Caller appends Review.
 */
export function buildWizardStepGroups(fields: OnboardingField[]): WizardStepGroup[] {
  const byCanonical = new Map<string, OnboardingField[]>()

  for (const field of fields) {
    const key = normalizeSectionKey(field.section)
    const list = byCanonical.get(key) ?? []
    list.push(field)
    byCanonical.set(key, list)
  }

  const personalFields: OnboardingField[] = []
  const subsections: Array<{ key: string; label: string }> = []

  for (const key of PERSONAL_INFO_SECTION_KEYS) {
    const sectionFields = byCanonical.get(key)
    if (!sectionFields?.length) continue
    personalFields.push(...sectionFields)
    subsections.push({ key, label: getSubsectionLabel(key) })
    byCanonical.delete(key)
  }

  const groups: WizardStepGroup[] = []

  if (personalFields.length > 0) {
    groups.push({
      id: PERSONAL_INFO_STEP_ID,
      label: getStepLabel(PERSONAL_INFO_STEP_ID),
      fields: sortByOrder(personalFields),
      subsections,
    })
  }

  // Preserve first-seen order of remaining sections from original field list.
  const remainingOrder: string[] = []
  for (const field of fields) {
    const key = normalizeSectionKey(field.section)
    if (PERSONAL_INFO_SET.has(key)) continue
    if (!remainingOrder.includes(key)) remainingOrder.push(key)
  }

  for (const key of remainingOrder) {
    const sectionFields = byCanonical.get(key)
    if (!sectionFields?.length) continue
    groups.push({
      id: key,
      label: getStepLabel(key),
      fields: sortByOrder(sectionFields),
    })
  }

  return groups
}

/**
 * Platform legal control: accuracy/ownership + consent to share with the hiring employer.
 * Kept separate from later liability waivers on the Agreements step.
 */
export function buildPersonalInfoAttestationField(employerDisplayName?: string | null): OnboardingField {
  const employer = employerDisplayName?.trim() || "your hiring employer"

  return {
    id: PERSONAL_INFO_ATTESTATION_FIELD,
    name: PERSONAL_INFO_ATTESTATION_FIELD,
    label: "Information accuracy and sharing consent",
    type: "waiver",
    section: "personal_info" as OnboardingSectionKey,
    order: 10_000,
    required: true,
    blocking: true,
    placeholder: `I certify that this information is my own, true, and complete, and I agree to share it with ${employer} for onboarding and employment administration.`,
    helpText:
      "This consent covers personal information on this step only. Separate worker agreements and safety waivers appear later.",
    metadata: {
      agreementType: "personal_info_attestation",
      requiresAcknowledgement: true,
      agreementBody: [
        `By checking the box below, you certify that:`,
        ``,
        `1. The personal information you provide on this step is true, complete, and your own.`,
        `2. You authorize Tourify to share this information with ${employer} solely for hiring, onboarding, roster, and employment administration related to this engagement.`,
        `3. You understand that later steps may include separate agreements (for example worker terms or safety acknowledgements) that are not covered by this certification.`,
        ``,
        `Providing false or misleading information may affect your eligibility for this engagement.`,
      ].join("\n"),
    },
  }
}

export function hasPersonalInfoAttestation(responses: Record<string, unknown>): boolean {
  return responses[PERSONAL_INFO_ATTESTATION_FIELD] === true
}

export function withAttestationTimestamp(
  responses: Record<string, unknown>
): Record<string, unknown> {
  if (!hasPersonalInfoAttestation(responses)) return responses
  if (typeof responses[PERSONAL_INFO_ATTESTED_AT_FIELD] === "string") return responses
  return {
    ...responses,
    [PERSONAL_INFO_ATTESTED_AT_FIELD]: new Date().toISOString(),
  }
}
