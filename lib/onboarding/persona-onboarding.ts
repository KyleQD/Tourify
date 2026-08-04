import type {
  OnboardingField,
  OnboardingTemplate,
} from "@/lib/services/unified-onboarding.service"

export type PersonaOnboardingType = "artist" | "venue"

const artistFields: OnboardingField[] = [
  {
    id: "artist_name",
    type: "text",
    label: "Artist or band name",
    placeholder: "Your public artist name",
    required: true,
  },
  {
    id: "bio",
    type: "textarea",
    label: "Bio",
    placeholder: "Tell venues and fans about your work",
    required: false,
  },
  {
    id: "genres",
    type: "multiselect",
    label: "Genres",
    required: false,
    options: ["Alternative", "Country", "Electronic", "Hip-hop", "Jazz", "Pop", "R&B", "Rock"],
  },
]

const venueFields: OnboardingField[] = [
  {
    id: "venue_name",
    type: "text",
    label: "Venue name",
    placeholder: "Your venue's public name",
    required: true,
  },
  {
    id: "description",
    type: "textarea",
    label: "Description",
    placeholder: "Describe the space and the events you host",
    required: false,
  },
  {
    id: "address",
    type: "text",
    label: "Address",
    placeholder: "Street address",
    required: false,
  },
  {
    id: "capacity",
    type: "number",
    label: "Capacity",
    placeholder: "0",
    required: false,
  },
  {
    id: "venue_types",
    type: "multiselect",
    label: "Venue types",
    required: false,
    options: ["Arena", "Bar", "Club", "Festival site", "Outdoor", "Theater"],
  },
]

export function fallbackPersonaTemplate(
  accountType: PersonaOnboardingType,
): OnboardingTemplate {
  return {
    id: `fallback-${accountType}`,
    name: accountType === "artist" ? "Artist profile" : "Venue profile",
    description: "Add the essentials now. You can complete the rest from your profile.",
    flow_type: accountType,
    fields: accountType === "artist" ? artistFields : venueFields,
    is_default: true,
    is_active: true,
    created_at: "",
    updated_at: "",
  }
}

export function initializePersonaResponses(
  template: OnboardingTemplate,
  responses: Record<string, unknown> = {},
): Record<string, unknown> {
  return template.fields.reduce<Record<string, unknown>>((result, field) => {
    const fallback =
      field.type === "multiselect" ? [] : field.type === "checkbox" ? false : ""
    result[field.id] = responses[field.id] ?? fallback
    return result
  }, { ...responses })
}

export function validatePersonaResponses(
  template: OnboardingTemplate,
  responses: Record<string, unknown>,
): Record<string, string> {
  return template.fields.reduce<Record<string, string>>((errors, field) => {
    const value = responses[field.id]
    if (
      field.required &&
      (value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0))
    ) {
      errors[field.id] = `${field.label} is required`
    }
    return errors
  }, {})
}

function text(responses: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = responses[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function stringList(responses: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = responses[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string")
    }
  }
  return []
}

export function personaAccountPayload(
  accountType: PersonaOnboardingType,
  responses: Record<string, unknown>,
) {
  if (accountType === "artist") {
    return {
      artist_name: text(responses, "artist_name", "stage_name", "name"),
      bio: text(responses, "bio", "description"),
      genres: stringList(responses, "genres", "genre"),
      social_links:
        typeof responses.social_links === "object" && responses.social_links
          ? responses.social_links
          : {},
    }
  }

  const capacityValue = responses.capacity
  const capacity =
    typeof capacityValue === "number"
      ? capacityValue
      : Number.parseInt(String(capacityValue || "0"), 10) || 0

  return {
    venue_name: text(responses, "venue_name", "name"),
    description: text(responses, "description", "bio"),
    address: text(responses, "address", "street_address"),
    capacity,
    venue_types: stringList(responses, "venue_types", "types"),
    contact_info:
      typeof responses.contact_info === "object" && responses.contact_info
        ? responses.contact_info
        : {},
    social_links:
      typeof responses.social_links === "object" && responses.social_links
        ? responses.social_links
        : {},
  }
}
