import type { DiscoverTour } from "@/lib/discover/types"

export interface TourRow {
  id: string
  slug: string
  name: string
  description?: string | null
  status: string
  start_date?: string | null
  end_date?: string | null
  settings?: Record<string, unknown> | null
}

export interface TourEventLink {
  tour_id: string
  ordinal?: number | null
  event_id: string
  events_v2?: {
    id: string
    title: string
    slug?: string | null
    status?: string | null
    start_at?: string | null
    settings?: Record<string, unknown> | null
  } | null
}

export interface TourArtistRow {
  tour_id: string
  artist_name?: string | null
}

function settingsCity(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings) return null
  if (typeof settings.venue_city === "string" && settings.venue_city.trim())
    return settings.venue_city.trim()
  if (typeof settings.city === "string" && settings.city.trim()) return settings.city.trim()
  return null
}

function settingsPoster(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings) return null
  if (typeof settings.poster_url === "string" && settings.poster_url) return settings.poster_url
  if (typeof settings.cover_image_url === "string" && settings.cover_image_url)
    return settings.cover_image_url
  return null
}

function sortKeyForTour(tour: DiscoverTour): number {
  const next = tour.next_event_date || tour.start_date
  if (!next) return Number.MAX_SAFE_INTEGER
  const ms = new Date(next).getTime()
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms
}

/** Pure helper for ranking/shaping active tours (also used in tests). */
export function selectDiscoverTours({
  tours,
  tourEvents,
  tourArtists,
  limit,
  nowMs = Date.now(),
}: {
  tours: TourRow[]
  tourEvents: TourEventLink[]
  tourArtists: TourArtistRow[]
  limit: number
  nowMs?: number
}): DiscoverTour[] {
  const artistsByTour = new Map<string, string[]>()
  for (const row of tourArtists) {
    const name = String(row.artist_name || "").trim()
    if (!name) continue
    const list = artistsByTour.get(row.tour_id) || []
    if (!list.includes(name)) list.push(name)
    artistsByTour.set(row.tour_id, list)
  }

  const eventsByTour = new Map<string, TourEventLink[]>()
  for (const link of tourEvents) {
    const list = eventsByTour.get(link.tour_id) || []
    list.push(link)
    eventsByTour.set(link.tour_id, list)
  }

  const shaped: DiscoverTour[] = tours
    .filter((tour) => tour.status === "active" && tour.slug && tour.name)
    .map((tour) => {
      const links = eventsByTour.get(tour.id) || []
      const cities: string[] = []
      let nextEventDate: string | null = null
      let coverUrl: string | null =
        typeof tour.settings?.cover_url === "string"
          ? tour.settings.cover_url
          : typeof tour.settings?.poster_url === "string"
            ? tour.settings.poster_url
            : null

      const sortedLinks = [...links].sort((a, b) => {
        const aAt = a.events_v2?.start_at
          ? new Date(a.events_v2.start_at).getTime()
          : Number.MAX_SAFE_INTEGER
        const bAt = b.events_v2?.start_at
          ? new Date(b.events_v2.start_at).getTime()
          : Number.MAX_SAFE_INTEGER
        return aAt - bAt
      })

      for (const link of sortedLinks) {
        const event = link.events_v2
        if (!event) continue
        const city = settingsCity(event.settings)
        if (city && !cities.includes(city)) cities.push(city)
        if (!coverUrl) coverUrl = settingsPoster(event.settings)

        if (event.start_at) {
          const startMs = new Date(event.start_at).getTime()
          if (!Number.isNaN(startMs) && startMs >= nowMs) {
            if (!nextEventDate || startMs < new Date(nextEventDate).getTime())
              nextEventDate = event.start_at
          }
        }
      }

      return {
        id: tour.id,
        slug: tour.slug,
        name: tour.name,
        description: tour.description || null,
        start_date: tour.start_date || null,
        end_date: tour.end_date || null,
        event_count: links.length,
        next_event_date: nextEventDate,
        cities: cities.slice(0, 6),
        artist_names: (artistsByTour.get(tour.id) || []).slice(0, 4),
        cover_url: coverUrl,
      } satisfies DiscoverTour
    })

  return shaped.sort((a, b) => sortKeyForTour(a) - sortKeyForTour(b)).slice(0, limit)
}

export function settingsCityFromEvent(
  settings: Record<string, unknown> | null | undefined
): string | null {
  return settingsCity(settings)
}
