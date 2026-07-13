import { describe, expect, it } from "vitest"

import {
  buildPersonalInfoAttestationField,
  buildWizardStepGroups,
  hasPersonalInfoAttestation,
  normalizeSectionKey,
  PERSONAL_INFO_STEP_ID,
  withAttestationTimestamp,
} from "@/lib/hiring/onboarding-step-groups"
import type { OnboardingField } from "@/types/hiring-worker-onboarding"

function field(partial: Partial<OnboardingField> & Pick<OnboardingField, "id" | "name" | "label" | "type" | "section">): OnboardingField {
  return {
    order: 0,
    required: false,
    ...partial,
  }
}

describe("normalizeSectionKey", () => {
  it("maps Title Case template sections to canonical keys", () => {
    expect(normalizeSectionKey("Identity")).toBe("identity")
    expect(normalizeSectionKey("Emergency Contact")).toBe("emergency_contact")
    expect(normalizeSectionKey("Work Eligibility")).toBe("work_eligibility")
    expect(normalizeSectionKey("Tax / Payment")).toBe("tax_payment")
    expect(normalizeSectionKey("Agreements")).toBe("agreements")
    expect(normalizeSectionKey("Waiver")).toBe("agreements")
  })
})

describe("buildWizardStepGroups", () => {
  it("consolidates the first four personal sections into one step in order", () => {
    const fields: OnboardingField[] = [
      field({ id: "legal_name", name: "legal_name", label: "Legal full name", type: "text", section: "identity", order: 10 }),
      field({ id: "phone", name: "phone", label: "Mobile phone", type: "phone", section: "contact", order: 100 }),
      field({ id: "emergency_contact", name: "emergency_contact", label: "Emergency contact", type: "emergency_contact", section: "emergency_contact", order: 120 }),
      field({ id: "work_authorization", name: "work_authorization", label: "Work auth", type: "checkbox", section: "work_eligibility", order: 200 }),
      field({ id: "government_id", name: "government_id", label: "Government ID", type: "id_document", section: "documents", order: 300 }),
      field({ id: "worker_agreement", name: "worker_agreement", label: "Worker agreement", type: "waiver", section: "agreements", order: 500 }),
    ]

    const groups = buildWizardStepGroups(fields)

    expect(groups.map((group) => group.id)).toEqual([
      PERSONAL_INFO_STEP_ID,
      "documents",
      "agreements",
    ])
    expect(groups[0].fields.map((item) => item.name)).toEqual([
      "legal_name",
      "phone",
      "emergency_contact",
      "work_authorization",
    ])
    expect(groups[0].label).toBe("Personal info")
    expect(groups[0].subsections?.map((item) => item.key)).toEqual([
      "identity",
      "contact",
      "emergency_contact",
      "work_eligibility",
    ])
  })
})

describe("personal info attestation", () => {
  it("builds a required blocking certification field naming the employer", () => {
    const attestation = buildPersonalInfoAttestationField("Neon Room")
    expect(attestation.required).toBe(true)
    expect(attestation.blocking).toBe(true)
    expect(attestation.type).toBe("waiver")
    expect(String(attestation.metadata?.agreementBody)).toContain("Neon Room")
  })

  it("stamps attested_at when certification is true", () => {
    expect(hasPersonalInfoAttestation({})).toBe(false)
    const stamped = withAttestationTimestamp({ personal_info_attestation: true })
    expect(stamped.personal_info_attestation).toBe(true)
    expect(typeof stamped.personal_info_attested_at).toBe("string")
  })
})
