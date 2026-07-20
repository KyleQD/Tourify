import type { DiscoverTour, DiscoverTourStop } from "@/lib/discover/types"
import {
  selectDiscoverTours,
  settingsCityFromEvent,
  type TourArtistRow,
  type TourEventLink,
  type TourRow,
} from "@/lib/discover/tour-selection"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export { selectDiscoverTours } from "@/lib/discover/tour-selection"

export async function fetchDiscoverTours({
  limit = 12,
}: {
  limit?: number
} = {}): Promise<DiscoverTour[]> {
  try {
    const supabase = createServiceRoleClient()

    const { data: tours, error: toursError } = await supabase
      .from("tours")
      .select("id, slug, name, description, status, start_date, end_date, settings")
      .eq("status", "active")
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(Math.min(Math.max(limit * 3, 24), 80))

    if (toursError) {
      console.error("[Discover] Failed to load tours:", toursError)
      return []
    }

    const tourRows = (tours || []) as TourRow[]
    if (tourRows.length === 0) return []

    const tourIds = tourRows.map((tour) => tour.id)

    const [{ data: tourEventRows }, { data: tourArtistRows }] = await Promise.all([
      supabase
        .from("tour_events")
        .select(
          `
          tour_id,
          ordinal,
          event_id,
          events_v2:event_id (
            id,
            title,
            slug,
            status,
            start_at,
            settings
          )
        `
        )
        .in("tour_id", tourIds),
      supabase
        .from("tour_artists")
        .select("tour_id, artist_name")
        .in("tour_id", tourIds),
    ])

    const links: TourEventLink[] = (tourEventRows || []).map((row: any) => ({
      tour_id: String(row.tour_id),
      ordinal: row.ordinal,
      event_id: String(row.event_id),
      events_v2: Array.isArray(row.events_v2) ? row.events_v2[0] || null : row.events_v2 || null,
    }))

    return selectDiscoverTours({
      tours: tourRows,
      tourEvents: links,
      tourArtists: (tourArtistRows || []) as TourArtistRow[],
      limit,
    })
  } catch (error) {
    console.error("[Discover] Tours fetch failed:", error)
    return []
  }
}

export async function fetchPublicTourBySlug(slug: string): Promise<{
  tour: DiscoverTour | null
  stops: DiscoverTourStop[]
}> {
  const normalized = slug.trim()
  if (!normalized) return { tour: null, stops: [] }

  try {
    const supabase = createServiceRoleClient()
    const { data: tour, error } = await supabase
      .from("tours")
      .select("id, slug, name, description, status, start_date, end_date, settings")
      .eq("slug", normalized)
      .eq("status", "active")
      .maybeSingle()

    if (error || !tour) {
      if (error) console.error("[tours/public] load failed:", error)
      return { tour: null, stops: [] }
    }

    const [{ data: tourEventRows }, { data: tourArtistRows }] = await Promise.all([
      supabase
        .from("tour_events")
        .select(
          `
          tour_id,
          ordinal,
          event_id,
          events_v2:event_id (
            id,
            title,
            slug,
            status,
            start_at,
            settings
          )
        `
        )
        .eq("tour_id", tour.id)
        .order("ordinal", { ascending: true }),
      supabase.from("tour_artists").select("tour_id, artist_name").eq("tour_id", tour.id),
    ])

    const links: TourEventLink[] = (tourEventRows || []).map((row: any) => ({
      tour_id: String(row.tour_id),
      ordinal: row.ordinal,
      event_id: String(row.event_id),
      events_v2: Array.isArray(row.events_v2) ? row.events_v2[0] || null : row.events_v2 || null,
    }))

    const shaped = selectDiscoverTours({
      tours: [tour as TourRow],
      tourEvents: links,
      tourArtists: (tourArtistRows || []) as TourArtistRow[],
      limit: 1,
    })

    const stops: DiscoverTourStop[] = links
      .map((link) => {
        const event = link.events_v2
        if (!event?.id) return null
        const settings = event.settings || {}
        return {
          id: String(event.id),
          slug: event.slug ? String(event.slug) : null,
          title: String(event.title || "Event"),
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
          venue_name:
            typeof settings.venue_label === "string"
              ? settings.venue_label
              : typeof settings.venue_name === "string"
                ? settings.venue_name
                : null,
          venue_city: settingsCityFromEvent(settings),
          venue_state:
            typeof settings.venue_state === "string" ? settings.venue_state : null,
        } satisfies DiscoverTourStop
      })
      .filter(Boolean) as DiscoverTourStop[]

    stops.sort((a, b) => {
      const aMs = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER
      const bMs = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER
      return aMs - bMs
    })

    return { tour: shaped[0] || null, stops }
  } catch (error) {
    console.error("[tours/public] unexpected error:", error)
    return { tour: null, stops: [] }
  }
}
