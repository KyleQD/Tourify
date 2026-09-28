import { EnhancedEventPageLoader } from "@/components/events/enhanced-event-page-loader"
import { createClient } from "@/lib/supabase/server"
import { enrichPublicEventPageData } from "@/lib/events/get-public-event-page"
import { resolvePublicEvent } from "@/lib/events/resolve-public-event"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface EventPageProps {
  params: Promise<{ slug: string }>
}

/**
 * VEN-021 — event leaf pages expose valid Event/MusicEvent structured data
 * plus canonical metadata generated from STORED fields.
 */
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const event = await resolvePublicEvent(slug, user?.id || null)
  if (!event) return { title: "Event not found | Tourify" }

  const record = event as unknown as Record<string, unknown>
  const title = `${String(record.title ?? "Event")} | Tourify`
  const canonical = `/events/${String(record.slug ?? slug)}`
  const description =
    typeof record.description === "string" && record.description.trim()
      ? record.description.slice(0, 160)
      : undefined

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      images:
        typeof record.poster_url === "string" && record.poster_url
          ? [{ url: record.poster_url }]
          : undefined,
    },
  }
}

function buildEventJsonLd(event: Record<string, unknown>) {
  const start =
    typeof event.start_at === "string" && event.start_at
      ? event.start_at
      : typeof event.event_date === "string" && event.event_date
        ? event.event_date
        : null
  if (!start) return null

  const venueName = typeof event.venue_name === "string" ? event.venue_name : null
  const locationCity =
    typeof event.city === "string" && event.city
      ? { "@type": "Place", name: venueName ?? "Venue", address: event.city }
      : undefined

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: start,
    url: `/events/${String(event.slug ?? event.id)}`,
    ...(typeof event.description === "string" && event.description
      ? { description: event.description }
      : {}),
    ...(locationCity ? { location: locationCity } : {}),
    ...(venueName
      ? {
          location: {
            "@type": "MusicVenue",
            name: venueName,
            ...(typeof event.city === "string" && event.city
              ? { address: { "@type": "PostalAddress", addressLocality: event.city } }
              : {}),
          },
        }
      : {}),
    ...(typeof event.poster_url === "string" && event.poster_url ? { image: [event.poster_url] } : {}),
  }
  return data
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const event = await resolvePublicEvent(slug, user?.id || null)
  if (!event) notFound()

  const enriched = await enrichPublicEventPageData({ supabase, event })
  const jsonLd = buildEventJsonLd(enriched as unknown as Record<string, unknown>)

  return (
    <>
      {/* VEN-021: valid MusicEvent markup for crawlers/link previews. */}
      {jsonLd && (
        <script
          type="application/ld+json"
          // Schema payload is built from server-verified fields only.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EnhancedEventPageLoader eventId={enriched.id} event={enriched} />
    </>
  )
}
