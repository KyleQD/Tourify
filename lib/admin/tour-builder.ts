import type { RouteStopDraft } from "@/components/admin/operations-builder/primitives"

export interface TourBuilderFormState {
  name: string
  mainArtist: string
  artistAccountId: string
  description: string
  status: string
  startDate: string
  endDate: string
  markets: string
  branding: string
  coverImageUrl: string
  routeNotes: string
  stops: RouteStopDraft[]
  attachedEventIds: string[]
  people: string
  vendors: string
  permissions: string
  transportation: string
  lodging: string
  equipment: string
  freight: string
  supplies: string
  siteMaps: string
  budget: string
  guarantees: string
  settlements: string
  perDiems: string
  documents: string
  credentials: string
  announcements: string
  auditNotes: string
}

export const initialTourBuilderForm: TourBuilderFormState = {
  name: "",
  mainArtist: "",
  artistAccountId: "",
  description: "",
  status: "planning",
  startDate: "",
  endDate: "",
  markets: "",
  branding: "",
  coverImageUrl: "",
  routeNotes: "",
  stops: [],
  attachedEventIds: [],
  people: "",
  vendors: "",
  permissions: "",
  transportation: "",
  lodging: "",
  equipment: "",
  freight: "",
  supplies: "",
  siteMaps: "",
  budget: "",
  guarantees: "",
  settlements: "",
  perDiems: "",
  documents: "",
  credentials: "",
  announcements: "",
  auditNotes: "",
}

export function makeTourStop(): RouteStopDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    venue: "",
    date: "",
    time: "",
    market: "",
    leg_name: "",
    capacity: "",
    advance_status: "not_started",
  }
}

function toDateInput(value?: string | null) {
  if (!value) return ""
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return String(value).slice(0, 10)
  }
}

export function hydrateTourBuilderForm(tour: any, linkedEvents: any[] = []): TourBuilderFormState {
  const settings = tour?.settings || {}
  const routing = Array.isArray(tour?.routing)
    ? tour.routing
    : Array.isArray(settings.route)
      ? settings.route
      : Array.isArray(settings.routing)
        ? settings.routing
        : []
  const events = linkedEvents.length
    ? linkedEvents
    : Array.isArray(tour?.events)
      ? tour.events
      : []

  const stopsFromRouting: RouteStopDraft[] = routing.map((stop: any, index: number) => ({
    id: String(stop.event_id || stop.id || `route-${index}`),
    name: stop.name || stop.city || `Stop ${index + 1}`,
    venue: stop.venue || stop.venue_name || "",
    date: toDateInput(stop.date || stop.event_date),
    time: stop.time || stop.load_in_time || "",
    market: stop.market || stop.city || "",
    leg_name: stop.leg_name || "",
    capacity: stop.capacity != null ? String(stop.capacity) : "",
    advance_status: stop.advance_status || "not_started",
  }))

  const stopsFromEvents: RouteStopDraft[] = events.map((event: any, index: number) => ({
    id: String(event.id || `event-${index}`),
    name: event.name || event.title || `Show ${index + 1}`,
    venue: event.venue_name || "",
    date: toDateInput(event.event_date || event.start_at),
    time: event.event_time || "",
    market: event.market || event.tour?.market || "",
    leg_name: event.leg_name || event.tour?.leg_name || "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    advance_status: event.advance_status || event.tour?.advance_status || "not_started",
  }))

  // Prefer linked events so stop ids round-trip as real event UUIDs after save.
  const stops = stopsFromEvents.length ? stopsFromEvents : stopsFromRouting.length ? stopsFromRouting : [makeTourStop()]

  const artistAccountId =
    tour?.artist_id ||
    settings.artist_account_id ||
    (Array.isArray(settings.artist_account_ids) ? settings.artist_account_ids[0] : "") ||
    ""

  return {
    ...initialTourBuilderForm,
    name: tour?.name || "",
    mainArtist: tour?.main_artist || tour?.artist || "",
    artistAccountId: String(artistAccountId || ""),
    description: tour?.description || "",
    status: tour?.status || "planning",
    startDate: toDateInput(tour?.start_date),
    endDate: toDateInput(tour?.end_date),
    markets: Array.isArray(tour?.markets) ? tour.markets.join(", ") : String(tour?.markets || settings.markets || ""),
    branding: settings.branding || tour?.branding || "",
    coverImageUrl: tour?.cover_image_url || "",
    routeNotes: settings.route_notes || tour?.route_notes || "",
    stops,
    attachedEventIds: events.map((event: any) => String(event.id)).filter(Boolean),
    people: settings.people || "",
    vendors: settings.vendors || "",
    permissions: settings.permissions || "",
    transportation: settings.transportation || "",
    lodging: settings.lodging || "",
    equipment: settings.equipment || "",
    freight: settings.freight || "",
    supplies: settings.supplies || "",
    siteMaps: settings.site_maps || "",
    budget: tour?.budget != null ? String(tour.budget) : settings.budget || "",
    guarantees: settings.guarantees || "",
    settlements: settings.settlements || "",
    perDiems: settings.per_diems || "",
    documents: settings.documents || "",
    credentials: settings.credentials || "",
    announcements: settings.announcements || "",
    auditNotes: settings.audit_notes || "",
  }
}

export function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

export function numberOrNull(value: string) {
  const normalized = value.replace(/[$,]/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildTourBuilderPayload(
  form: TourBuilderFormState,
  options: { publish?: boolean; readinessScore?: number } = {}
) {
  // Publishing is a separate server-side command. The save preceding it must
  // not activate a draft or bypass readiness/capability checks.
  const status = form.status || "planning"
  const populatedStops = form.stops.filter((stop) => stop.name || stop.venue || stop.date)
  const routing = form.stops.map((stop, index) => ({
    order: index + 1,
    name: stop.name,
    venue: stop.venue,
    date: stop.date,
    time: stop.time,
    market: stop.market,
    leg_name: stop.leg_name,
    capacity: stop.capacity,
    advance_status: stop.advance_status,
    event_id: form.attachedEventIds.includes(stop.id) ? stop.id : null,
  }))

  return {
    name: form.name.trim() || "Untitled tour",
    main_artist: form.mainArtist,
    artist_id: form.artistAccountId || null,
    description: form.description,
    status,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    markets: parseList(form.markets),
    cover_image_url: form.coverImageUrl || null,
    budget: numberOrNull(form.budget),
    event_ids: form.attachedEventIds,
    events: populatedStops.map((stop, index) => ({
      ...(form.attachedEventIds.includes(stop.id) ? { id: stop.id } : {}),
      name: stop.name || `Stop ${index + 1}`,
      venue: stop.venue || "",
      date: stop.date || form.startDate,
      time: stop.time || undefined,
      capacity: numberOrNull(String(stop.capacity || "")) ?? undefined,
      market: stop.market || undefined,
      leg_name: stop.leg_name || undefined,
      advance_status: stop.advance_status || "not_started",
      ordinal: index,
    })),
    routing,
    settings: {
      branding: form.branding,
      route_notes: form.routeNotes,
      route: routing,
      people: form.people,
      vendors: form.vendors,
      permissions: form.permissions,
      transportation: form.transportation,
      lodging: form.lodging,
      equipment: form.equipment,
      freight: form.freight,
      supplies: form.supplies,
      site_maps: form.siteMaps,
      budget: form.budget,
      guarantees: form.guarantees,
      settlements: form.settlements,
      per_diems: form.perDiems,
      documents: form.documents,
      credentials: form.credentials,
      announcements: form.announcements,
      audit_notes: form.auditNotes,
      artist_account_id: form.artistAccountId || null,
      artist_account_ids: form.artistAccountId ? [form.artistAccountId] : [],
      readiness_score: options.readinessScore ?? 0,
      creation_source: "admin_tour_operations_builder",
    },
  }
}
