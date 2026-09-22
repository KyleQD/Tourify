import { redirect } from 'next/navigation'
import { buildAdminSiteMapHref } from '@/lib/admin/admin-ops-context'

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) return value[0]
  return null
}

export default async function SiteMapsEnhancedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const siteMapId = firstString(params.siteMapId)
  const eventId = firstString(params.eventId) || firstString(params.event_id)
  const tourId = firstString(params.tourId) || firstString(params.tour_id)
  const entityTypeRaw = firstString(params.entityType) || firstString(params.entity_type)
  const entityType =
    entityTypeRaw === 'venue' || entityTypeRaw === 'organization' || entityTypeRaw === 'artist'
      ? entityTypeRaw
      : null
  const entityId = firstString(params.entityId) || firstString(params.entity_id)
  const venueId = firstString(params.venueId) || firstString(params.venue_id)
  const displayName = firstString(params.displayName) || firstString(params.display_name)

  redirect(buildAdminSiteMapHref({
    siteMapId,
    eventId,
    tourId,
    entityType,
    entityId,
    venueId,
    displayName,
  }))
}
