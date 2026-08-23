import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
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
 *
 * VEN-289 — unknown slugs resolve deterministically through
 * venue_slug_history (latest mapping first) and 308-redirect to the current
 * canonical slug, so renamed/malformed historical links keep working.
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
      "id, user_id, venue_name, url_slug, description, city, state, country, capacity, capacity_total, venue_types, amenities, social_links, avatar_url, cover_image_url, verification_status, account_tier, sound_system, lighting_rig, stage_dimensions, curfew, is_public, settings, contact_info, created_at, updated_at",
    )
    .or(`url_slug.eq.${slug},url_slug.eq.${normalized}`)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  // Unpublished venues are invisible to this anonymous SSR path; the owner
  // preview flows through the authenticated API instead.
  if (data.is_public === false) return null

  const record = data as unknown as Record<string, unknown>

  // VEN-240: public contact exposure is governed by the Venue's own
  // show_contact_info policy — projected here on the server so raw
  // contact_info never crosses the client boundary.
  const settings = (record.settings ?? {}) as Record<string, unknown>
  if (settings.show_contact_info === true) {
    const contact = (record.contact_info ?? {}) as Record<string, unknown>
    record.public_contact = {
      booking_email: typeof contact.booking_email === "string" ? contact.booking_email : null,
      email: typeof contact.email === "string" ? contact.email : null,
      phone: typeof contact.phone === "string" ? contact.phone : null,
    }
  }

  const { settings: _strippedSettings, ...safeRow } = record
  const publicVenue = toPublicVenueProfile(safeRow)
  return publicVenue
}

/**
 * VEN-289 — deterministic history resolution: latest recorded mapping wins,
 * and only mappings whose live profile still carries a public slug redirect.
 * Returns the current canonical slug, or null when no resolvable mapping exists.
 */
// venue_slug_history ships with migration 20260823020000, which postdates the
// generated DB types — access it through a minimal structural shim until
// types are regenerated.
interface HistoryRow {
  venue_profile_id: string
}

async function resolveHistoricalSlug(slug: string): Promise<string | null> {
  const supabase = await createClient()
  const fromHistory = supabase.from as unknown as (table: "venue_slug_history") => {
    select: (
      columns: string,
    ) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => {
          limit: (count: number) => PromiseLike<{ data: HistoryRow[] | null }>
        }
      }
    }
  }

  const { data: history } = await fromHistory("venue_slug_history")
    .select("venue_profile_id")
    .eq("old_slug", slug.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(5)

  const ids = Array.from(new Set((history ?? []).map((h) => h.venue_profile_id)))
  if (ids.length === 0) return null

  const { data: profiles } = await supabase
    .from("venue_profiles")
    .select("id, url_slug, is_public")
    .in("id", ids)
    .limit(1)
    .maybeSingle()

  const target = profiles as { id: string; url_slug: string | null; is_public: boolean | null } | null
  if (target?.url_slug && target.url_slug !== slug && target.is_public !== false) {
    return target.url_slug
  }
  return null
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
  let venue = await loadPublicVenue(slug)

  // VEN-289: renamed/malformed historical slugs 308 to the canonical URL.
  if (!venue) {
    const canonical = await resolveHistoricalSlug(slug)
    if (canonical) {
      permanentRedirect(`/venues/${encodeURIComponent(canonical)}`)
    }
    notFound()
  }

  if (!venue) notFound()

  // VEN-020: structured data built strictly from public-contract fields.
  const v = venue as unknown as Record<string, unknown>
  const addressParts = [v.city, v.state, v.country].filter(
    (x): x is string => typeof x === "string" && Boolean(x),
  )
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicVenue",
    name: v.venue_name,
    ...(v.description ? { description: v.description } : {}),
    url: `/venues/${String(v.url_slug ?? slug)}`,
    ...(addressParts.length > 0
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: v.city ?? undefined,
            addressRegion: v.state ?? undefined,
            addressCountry: v.country ?? undefined,
          },
        }
      : {}),
    ...(Array.isArray(v.venue_types) && v.venue_types.length > 0
      ? { additionalType: (v.venue_types as string[]).map((t) => `https://tourify.live/venue-types/${encodeURIComponent(t.toLowerCase().replace(/\s+/g, "-"))}`) }
      : {}),
    ...((v.capacity_total ?? v.capacity)
      ? { maximumAttendeeCapacity: Number(v.capacity_total ?? v.capacity) }
      : {}),
    ...(typeof v.avatar_url === "string" && v.avatar_url ? { image: [v.avatar_url] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VenueProfileClient slug={slug} initialVenue={venue as never} />
    </>
  )
}
