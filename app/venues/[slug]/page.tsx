import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { toPublicVenueProfile } from "@/lib/venue/venue-profile-contract"
import { VenueProfileClient } from "./venue-profile-client"

/**
 * VEN-019 — /venues/[slug] is a server-rendered shell: the primary venue
 * payload (public allowlist contract) is fetched and rendered on the server;
 * interactive sections hydrate as client islands without blocking first paint.
 *
 * VEN-020 groundwork lives here too: canonical metadata is generated from the
 * STORED slug, not regenerated from the name.
 */

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>
}

async function loadPublicVenue(slug: string) {
  const supabase = await createClient()

  const normalized = slug.toLowerCase()
  const { data } = await supabase
    .from("venue_profiles")
    .select(
      "id, user_id, venue_name, url_slug, description, city, state, country, capacity, capacity_total, venue_types, amenities, social_links, avatar_url, cover_image_url, verification_status, account_tier, sound_system, lighting_rig, stage_dimensions, curfew, is_public, created_at, updated_at",
    )
    .or(`url_slug.eq.${slug},url_slug.eq.${normalized}`)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  // Unpublished venues are invisible to this anonymous SSR path; the owner
  // preview flows through the authenticated API instead.
  if (data.is_public === false) return null

  const publicVenue = toPublicVenueProfile(data as unknown as Record<string, unknown>)
  return publicVenue
}

export async function generateMetadata({ params }: VenueProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const venue = await loadPublicVenue(slug)

  if (!venue) return { title: "Venue not found | Tourify" }

  const title = `${venue.venue_name} | Tourify`
  const canonical = `/venues/${venue.url_slug || slug}`
  const description =
    venue.description?.slice(0, 160) ??
    `${venue.venue_name}${venue.city ? ` in ${venue.city}` : ""} on Tourify`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "profile",
      images: venue.cover_image_url || venue.avatar_url
        ? [{ url: (venue.cover_image_url || venue.avatar_url) as string }]
        : undefined,
    },
  }
}

export default async function VenueProfilePage({ params }: VenueProfilePageProps) {
  const { slug } = await params
  const venue = await loadPublicVenue(slug)

  if (!venue) notFound()

  return <VenueProfileClient slug={slug} initialVenue={venue as never} />
}
