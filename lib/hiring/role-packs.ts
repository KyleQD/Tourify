import { DEFAULT_STAFF_ONBOARDING_TEMPLATES } from "@/lib/hiring/default-onboarding-templates"
import type { StaffOnboardingTemplate } from "@/types/onboarding-template-resolver"

export interface RolePackDefinition {
  id: string
  label: string
  description: string
  /** Match against global/default template name or tags */
  matchTags: string[]
  fallbackTemplateName: string
}

export const ROLE_PACKS: RolePackDefinition[] = [
  {
    id: "security",
    label: "Security",
    description: "Licensed security / guard onboarding with certifications.",
    matchTags: ["security", "licensed"],
    fallbackTemplateName: "Security Guard",
  },
  {
    id: "bartender",
    label: "Bartender",
    description: "Bar staff with alcohol service and age checks.",
    matchTags: ["bar", "alcohol", "service"],
    fallbackTemplateName: "Bartender",
  },
  {
    id: "production",
    label: "Production",
    description: "Stagehands and production crew onboarding.",
    matchTags: ["production", "crew"],
    fallbackTemplateName: "Production Crew",
  },
  {
    id: "tour_crew",
    label: "Tour crew",
    description: "Touring crew onboarding pack.",
    matchTags: ["tour", "crew"],
    fallbackTemplateName: "Production Crew",
  },
  {
    id: "org_staff",
    label: "Org staff",
    description: "General organization staff onboarding.",
    matchTags: ["default", "general", "staff"],
    fallbackTemplateName: "General Staff",
  },
]

export function resolveRolePackTemplate(packId: string): StaffOnboardingTemplate | null {
  const pack = ROLE_PACKS.find((item) => item.id === packId)
  if (!pack) return null

  const byName = DEFAULT_STAFF_ONBOARDING_TEMPLATES.find(
    (template) => template.name.toLowerCase() === pack.fallbackTemplateName.toLowerCase()
  )
  if (byName) return byName

  return (
    DEFAULT_STAFF_ONBOARDING_TEMPLATES.find((template) =>
      (template.tags ?? []).some((tag) => pack.matchTags.includes(tag.toLowerCase()))
    ) ?? null
  )
}
