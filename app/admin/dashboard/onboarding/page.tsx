import { redirect } from "next/navigation"

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

// The hiring onboarding template experience now lives under the Hiring hub so it uses the
// canonical staff_onboarding_templates table and employer scope. Preserve entity scope and
// deep-link into the builder when a specific template was requested.
export default async function LegacyOnboardingTemplatesRedirect({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {}

  const params = new URLSearchParams()
  const entityType = firstValue(resolved.entity_type)
  const entityId = firstValue(resolved.entity_id)
  const venueId = firstValue(resolved.venue_id)
  const eventId = firstValue(resolved.event_id)
  const tourId = firstValue(resolved.tour_id)

  if (entityType) params.set("entity_type", entityType)
  if (entityId) params.set("entity_id", entityId)
  if (venueId) params.set("venue_id", venueId)
  if (eventId) params.set("event_id", eventId)
  if (tourId) params.set("tour_id", tourId)

  const query = params.toString()
  const templateId = firstValue(resolved.template)

  if (templateId) {
    redirect(`/admin/dashboard/hiring/templates/${templateId}${query ? `?${query}` : ""}`)
  }

  redirect(`/admin/dashboard/hiring/templates${query ? `?${query}` : ""}`)
}
