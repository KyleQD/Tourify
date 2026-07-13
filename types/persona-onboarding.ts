import type { HiringEntityType } from "@/types/hiring-entity"

/**
 * Platform/persona onboarding is separate from staff hiring onboarding.
 * Staff hiring routes belong under /onboarding/hire/[token].
 */
export type PersonaOnboardingType =
  | "individual"
  | "artist"
  | "venue"
  | "organization"
  | "performanceAgency"
  | "staffingAgency"
  | "rentalCompany"
  | "productionCompany"
  | "promoter"

export interface PersonaOnboardingField {
  name: string
  label: string
  type: "text" | "textarea" | "url" | "email" | "number" | "select" | "multiselect"
  required?: boolean
  placeholder?: string
  helpText?: string
  options?: string[]
}

export interface PersonaOnboardingSection {
  id: string
  title: string
  description?: string
  fields: PersonaOnboardingField[]
}

export interface PersonaOnboardingConfig {
  type: PersonaOnboardingType
  title: string
  description: string
  createsHiringEntityType?: HiringEntityType
  sections: PersonaOnboardingSection[]
}

export interface PersonaOnboardingSubmission {
  type: PersonaOnboardingType
  responses: Record<string, unknown>
}

export interface PersonaOnboardingResult {
  ok: boolean
  profileId?: string
  entityType?: HiringEntityType
  redirectTo?: string
  message?: string
}
