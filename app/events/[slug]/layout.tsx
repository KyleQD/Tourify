import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { canNonOwnerViewArtistEvent } from '@/lib/artist/artist-event-visibility'
import { enrichPublicEventPageData } from '@/lib/events/get-public-event-page'
import {
  buildEventPreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { createClient } from '@/lib/supabase/server'

interface EventPublicLayoutProps {
  children: ReactNode
}

interface EventPublicMetadataProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: EventPublicMetadataProps): Promise<Metadata> {
  const { slug } = await params
  const fallbackPath = `/events/${encodeURIComponent(slug)}`
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!event) {
    const byId = await supabase
      .from('events')
      .select('*')
      .eq('id', slug)
      .maybeSingle()
    event = byId.data
  }

  if (!event) return buildUnavailablePreviewMetadata(fallbackPath)

  const isOwner = Boolean(user && event.artist_id === user.id)
  if (!isOwner && !canNonOwnerViewArtistEvent(event)) {
    return buildUnavailablePreviewMetadata(fallbackPath)
  }

  const enriched = await enrichPublicEventPageData({ supabase, event })
  const canonicalSlug = enriched.slug || slug

  return buildEventPreviewMetadata({
    title: enriched.title,
    description: enriched.description,
    eventDate: enriched.event_date,
    venueName: enriched.venue_name,
    city: enriched.venue_city,
    state: enriched.venue_state,
    country: enriched.venue_country,
    path: `/events/${encodeURIComponent(canonicalSlug)}`,
    imageUrl: enriched.poster_url,
  })
}

export default function EventPublicLayout({ children }: EventPublicLayoutProps) {
  return <>{children}</>
}
