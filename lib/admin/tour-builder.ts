import type { RouteStopDraft } from "@/components/admin/operations-builder/primitives"
import { assertUniqueContiguousOrdinals, assignContiguousOrdinals } from "@/lib/admin/tour-stop-ordinals"

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
  /** PLAN-101/102 optimistic draft plan version. */
  planVersion: number
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
  planVersion: 1,
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
    stop_type: "show",
    timezone: "",
    window_start: "",
    window_end: "",
    venue_id: null,
    venue_address: "",
    venue_city: "",
    venue_state: "",
    venue_postal_code: "",
    venue_country: "US",
    venue_website: "",
    technical_specs: "",
    notes: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    planning_status: "draft",
    ordinal: 0,
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
  // PLAN-101: prefer relational links; route JSON is a derived compatibility projection only.
  const routing = Array.isArray(settings.route)
      ? settings.route
      : Array.isArray(settings.routing)
        ? settings.routing
        : Array.isArray(tour?.routing)
          ? tour.routing
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
    stop_type: stop.stop_type || "show",
    timezone: stop.timezone || "",
    window_start: stop.window_start || "",
    window_end: stop.window_end || "",
    venue_id: stop.venue_id || null,
    venue_address: stop.venue_address || "",
    venue_city: stop.venue_city || "",
    venue_state: stop.venue_state || "",
    venue_postal_code: stop.venue_postal_code || "",
    venue_country: stop.venue_country || "US",
    venue_website: stop.venue_website || "",
    technical_specs: stop.technical_specs || "",
    notes: stop.notes || "",
    contact_name: stop.contact_name || "",
    contact_email: stop.contact_email || "",
    contact_phone: stop.contact_phone || "",
    planning_status: stop.planning_status || "draft",
    ordinal: index,
    event_id: stop.event_id || null,
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
    stop_type: event.stop_type || "show",
    timezone: event.timezone || "",
    window_start: event.window_start || "",
    window_end: event.window_end || "",
    venue_id: event.venue_id || null,
    venue_address: event.venue_address || "",
    venue_city: event.venue_city || "",
    venue_state: event.venue_state || "",
    venue_postal_code: event.venue_postal_code || "",
    venue_country: event.venue_country || "US",
    venue_website: event.venue_website || "",
    technical_specs: event.technical_specs || "",
    notes: event.notes || "",
    contact_name: event.contact_name || "",
    contact_email: event.contact_email || "",
    contact_phone: event.contact_phone || "",
    planning_status: event.planning_status || "draft",
    ordinal: index,
    event_id: event.id || null,
  }))

  // Prefer linked events so stop ids round-trip as real event UUIDs after save.
  const baseStops = assignContiguousOrdinals(
    stopsFromEvents.length ? stopsFromEvents : stopsFromRouting.length ? stopsFromRouting : [makeTourStop()],
  )
  const snapshots = Array.isArray(settings.planning_venue_snapshots)
    ? settings.planning_venue_snapshots
    : []
  const stops = baseStops.map((stop, index) => {
    const snapshot = snapshots.find((item: any) =>
      (item?.event_id && item.event_id === stop.event_id) || Number(item?.ordinal) === index,
    ) || {}
    return {
      ...stop,
      venue: snapshot.venue ?? stop.venue,
      venue_address: snapshot.venue_address ?? stop.venue_address,
      venue_city: snapshot.venue_city ?? stop.venue_city,
      venue_state: snapshot.venue_state ?? stop.venue_state,
      venue_postal_code: snapshot.venue_postal_code ?? stop.venue_postal_code,
      venue_country: snapshot.venue_country ?? stop.venue_country,
      venue_website: snapshot.venue_website ?? stop.venue_website,
      capacity: snapshot.capacity ?? stop.capacity,
      contact_name: snapshot.contact_name ?? stop.contact_name,
      contact_email: snapshot.contact_email ?? stop.contact_email,
      contact_phone: snapshot.contact_phone ?? stop.contact_phone,
      technical_specs: snapshot.technical_specs ?? stop.technical_specs,
    }
  })

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
    planVersion: typeof tour?.plan_version === "number" ? tour.plan_version : typeof tour?.planVersion === "number" ? tour.planVersion : 1,
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

/** Apply a canonical plan view onto builder form state (PLAN-102 conflict adopt). */
export function applyTourPlanToForm(
  form: TourBuilderFormState,
  plan: {
    planVersion?: number
    name?: string
    description?: string | null
    status?: string | null
    start_date?: string | null
    end_date?: string | null
    main_artist?: string | null
    route_notes?: string | null
    stops?: Array<{
      event_id?: string | null
      name?: string
      venue?: string | null
      date?: string | null
      time?: string | null
      market?: string | null
      leg_name?: string | null
      capacity?: number | null
      advance_status?: string
    }>
  },
): TourBuilderFormState {
  const stops = Array.isArray(plan.stops) && plan.stops.length
    ? plan.stops.map((stop, index) => ({
        id: String(stop.event_id || `stop-${index}`),
        name: stop.name || "",
        venue: stop.venue || "",
        date: stop.date || "",
        time: stop.time || "",
        market: stop.market || "",
        leg_name: stop.leg_name || "",
        capacity: stop.capacity != null ? String(stop.capacity) : "",
        advance_status: stop.advance_status || "not_started",
      }))
    : form.stops

  return {
    ...form,
    planVersion: typeof plan.planVersion === "number" ? plan.planVersion : form.planVersion,
    name: plan.name || form.name,
    description: plan.description || form.description,
    status: plan.status || form.status,
    startDate: plan.start_date || form.startDate,
    endDate: plan.end_date || form.endDate,
    mainArtist: plan.main_artist || form.mainArtist,
    routeNotes: plan.route_notes || form.routeNotes,
    stops,
    attachedEventIds: Array.isArray(plan.stops)
      ? plan.stops.map((stop) => stop.event_id).filter((id): id is string => Boolean(id))
      : form.attachedEventIds,
  }
}

/**
 * PLAN-101 — payload for PUT /api/admin/tours/:id/plan.
 * Does not include independent `routing` JSON (server derives route projection).
 */
export function buildTourPlanPayload(
  form: TourBuilderFormState,
  options: { readinessScore?: number } = {},
) {
  const status = form.status || "planning"
  const populatedStops = form.stops.filter((stop) => stop.name || stop.venue || stop.date)

  return {
    expectedPlanVersion: form.planVersion || 1,
    reconcileMode: "exact" as const,
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
    route_notes: form.routeNotes,
    stops: (() => {
      const ordered = assignContiguousOrdinals(
        populatedStops.map((stop, index) => ({ ...stop, id: stop.id, ordinal: index })),
      )
      assertUniqueContiguousOrdinals(ordered)
      return ordered.map((stop, index) => ({
        event_id: form.attachedEventIds.includes(stop.id) || stop.event_id === stop.id
          ? stop.id
          : stop.event_id || null,
        client_key: stop.id,
        name: stop.name || `Stop ${index + 1}`,
        venue: stop.venue || "",
        venue_id: stop.venue_id || null,
        venue_address: stop.venue_address || null,
        venue_city: stop.venue_city || null,
        venue_state: stop.venue_state || null,
        venue_postal_code: stop.venue_postal_code || null,
        venue_country: stop.venue_country || null,
        venue_website: stop.venue_website || null,
        technical_specs: stop.technical_specs || null,
        date: stop.date || form.startDate || new Date().toISOString().slice(0, 10),
        time: stop.time || null,
        timezone: stop.timezone || null,
        window_start: stop.window_start || null,
        window_end: stop.window_end || null,
        capacity: numberOrNull(String(stop.capacity || "")),
        market: stop.market || null,
        leg_name: stop.leg_name || null,
        notes: stop.notes || null,
        contact_name: stop.contact_name || null,
        contact_email: stop.contact_email || null,
        contact_phone: stop.contact_phone || null,
        planning_status: (stop.planning_status || "draft") as
          | "draft"
          | "confirmed"
          | "tentative"
          | "held"
          | "cancelled",
        advance_status: (stop.advance_status || "not_started") as
          | "not_started"
          | "in_progress"
          | "ready"
          | "blocked"
          | "settled",
        ordinal: stop.ordinal,
        stop_type: (stop.stop_type || "show") as
          | "show"
          | "rehearsal"
          | "promo"
          | "festival"
          | "travel"
          | "rest"
          | "load"
          | "other",
      }))
    })(),
    settings: {
      branding: form.branding,
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

/** @deprecated Prefer buildTourPlanPayload + /plan for existing tours (PLAN-101). */
export function buildTourBuilderPayload(
  form: TourBuilderFormState,
  options: { publish?: boolean; readinessScore?: number } = {},
) {
  const plan = buildTourPlanPayload(form, options)
  return {
    name: plan.name,
    main_artist: plan.main_artist,
    artist_id: plan.artist_id,
    description: plan.description,
    status: plan.status,
    start_date: plan.start_date,
    end_date: plan.end_date,
    markets: plan.markets,
    cover_image_url: plan.cover_image_url,
    budget: plan.budget,
    event_ids: plan.stops.map((stop) => stop.event_id).filter(Boolean),
    events: plan.stops.map((stop) => ({
      ...(stop.event_id ? { id: stop.event_id } : {}),
      name: stop.name,
      venue: stop.venue || "",
      date: stop.date,
      time: stop.time || undefined,
      capacity: stop.capacity ?? undefined,
      market: stop.market || undefined,
      leg_name: stop.leg_name || undefined,
      advance_status: stop.advance_status,
      ordinal: stop.ordinal,
    })),
    settings: plan.settings,
  }
}
