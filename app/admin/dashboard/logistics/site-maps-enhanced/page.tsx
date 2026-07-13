import { redirect } from 'next/navigation'
import { buildAdminSiteMapHref } from '@/lib/admin/admin-ops-context'

export default async function SiteMapsEnhancedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const siteMapId = typeof params.siteMapId === 'string' ? params.siteMapId : null
  const eventId = typeof params.eventId === 'string' ? params.eventId : null
  const tourId = typeof params.tourId === 'string' ? params.tourId : null

  redirect(buildAdminSiteMapHref({ siteMapId, eventId, tourId }))
}
