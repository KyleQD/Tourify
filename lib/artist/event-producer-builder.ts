import {
  normalizeEventPageLayout,
  type EventPageLayout,
} from "@/lib/events/event-page-layout"

export interface ArtistProducerSelection {
  id: string
  label: string
  meta?: string
}

export interface ArtistEventProducerFormState {
  title: string
  status: string
  visibility: string
  type: string
  description: string
  tags: string
  posterUrl: string
  date: string
  time: string
  endTime: string
  timezone: string
  doorsOpen: string
  setTimes: string
  venueName: string
  venueId: string
  city: string
  state: string
  country: string
  postalCode: string
  website: string
  address: string
  capacity: string
  venueContactName: string
  venueContactEmail: string
  venueContactPhone: string
  technicalSpecs: string
  supportingArtists: ArtistProducerSelection[]
  lineupNotes: string
  ticketUrl: string
  ticketPriceMin: string
  ticketPriceMax: string
  marketingNotes: string
  shareBlurb: string
  pageTemplate: string
  pageLayout: EventPageLayout
}

export const initialArtistEventProducerForm: ArtistEventProducerFormState = {
  title: "",
  status: "draft",
  visibility: "public",
  type: "concert",
  description: "",
  tags: "",
  posterUrl: "",
  date: "",
  time: "19:00",
  endTime: "22:00",
  timezone: "America/Los_Angeles",
  doorsOpen: "18:30",
  setTimes: "",
  venueName: "",
  venueId: "",
  city: "",
  state: "",
  country: "USA",
  postalCode: "",
  website: "",
  address: "",
  capacity: "",
  venueContactName: "",
  venueContactEmail: "",
  venueContactPhone: "",
  technicalSpecs: "",
  supportingArtists: [],
  lineupNotes: "",
  ticketUrl: "",
  ticketPriceMin: "",
  ticketPriceMax: "",
  marketingNotes: "",
  shareBlurb: "",
  pageTemplate: "modern",
  pageLayout: normalizeEventPageLayout(null),
}

export function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

export function numberOrUndefined(value: string): number | undefined {
  const normalized = value.replace(/[$,]/g, "").trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function sanitizeImageUrl(value?: string | null): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed
  return null
}

function asSelectionList(value: unknown, fallbackLabel: string): ArtistProducerSelection[] {
  if (!Array.isArray(value)) return []
  return value.map((item: any, index) => {
    if (typeof item === "string") return { id: item, label: item, meta: fallbackLabel }
    return {
      id: String(item?.id || item?.user_id || `${fallbackLabel}-${index}`),
      label: item?.label || item?.name || item?.display_name || fallbackLabel,
      meta: item?.meta || item?.email || item?.role || fallbackLabel,
    }
  })
}

function timeFromValue(value?: string | null) {
  if (!value) return ""
  return String(value).slice(0, 5)
}

/** Hydrate producer form from GET /api/artist/events/[id] payload. */
export function hydrateArtistEventProducerForm(event: any): ArtistEventProducerFormState {
  const settings = event?.producer_settings || event?.settings || {}
  const tags = Array.isArray(event?.tags)
    ? event.tags
    : typeof event?.tags === "string"
      ? parseList(event.tags)
      : []

  return {
    ...initialArtistEventProducerForm,
    title: event?.title || event?.name || "",
    status: event?.status || "draft",
    visibility: settings.visibility || event?.visibility || "public",
    type: event?.event_type || event?.type || "concert",
    description: event?.description || "",
    tags: tags.join(", "),
    posterUrl: event?.poster_url || settings.poster_url || "",
    date: event?.event_date ? String(event.event_date).slice(0, 10) : "",
    time: timeFromValue(event?.start_time) || "19:00",
    endTime: timeFromValue(event?.end_time) || "22:00",
    timezone: settings.timezone || event?.timezone || "America/Los_Angeles",
    doorsOpen: timeFromValue(event?.doors_open) || "18:30",
    setTimes: Array.isArray(settings.set_times)
      ? settings.set_times.map((item: any) => item?.label || item).filter(Boolean).join(", ")
      : Array.isArray(event?.setlist)
        ? event.setlist.join(", ")
        : "",
    venueName: event?.venue_name || "",
    venueId: event?.venue_id || "",
    city: event?.city || "",
    state: event?.state || "",
    country: event?.country || "USA",
    postalCode: settings.venue_postal_code || "",
    website: settings.venue_website || "",
    address: event?.address || "",
    capacity: event?.capacity != null ? String(event.capacity) : "",
    venueContactName: settings.venue_contact_name || "",
    venueContactEmail: settings.venue_contact_email || "",
    venueContactPhone: settings.venue_contact_phone || "",
    technicalSpecs: settings.venue_technical_specs || "",
    supportingArtists: asSelectionList(settings.supporting_artists, "Artist"),
    lineupNotes: settings.lineup_notes || "",
    ticketUrl: event?.ticket_url || settings.ticket_url || "",
    ticketPriceMin: event?.ticket_price_min != null ? String(event.ticket_price_min) : "",
    ticketPriceMax: event?.ticket_price_max != null ? String(event.ticket_price_max) : "",
    marketingNotes: settings.marketing_notes || "",
    shareBlurb: settings.share_blurb || "",
    pageTemplate: settings.page_template || "modern",
    pageLayout: normalizeEventPageLayout(settings.page_layout),
  }
}

export function buildArtistEventProducerPayload(
  form: ArtistEventProducerFormState,
  options: { publish?: boolean } = {},
) {
  const tags = parseList(form.tags)
  const setTimes = parseList(form.setTimes)

  return {
    title: form.title.trim() || "Untitled event",
    name: form.title.trim() || "Untitled event",
    description: form.description || "",
    event_type: form.type || "concert",
    type: form.type || "concert",
    status: options.publish ? "published" : form.status === "published" ? "published" : "draft",
    event_date: form.date || null,
    doors_open: form.doorsOpen || null,
    start_time: form.time || null,
    end_time: form.endTime || null,
    venue_name: form.venueName || null,
    venue_id: form.venueId || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    country: form.country || null,
    capacity: numberOrUndefined(form.capacity) ?? null,
    tags,
    setlist: setTimes,
    ticket_url: form.ticketUrl || null,
    ticket_price_min: numberOrUndefined(form.ticketPriceMin) ?? null,
    ticket_price_max: numberOrUndefined(form.ticketPriceMax) ?? null,
    poster_url: sanitizeImageUrl(form.posterUrl),
    creator_account_type: "artist",
    creation_source: "artist_event_producer",
    producer_settings: {
      visibility: form.visibility,
      timezone: form.timezone,
      venue_contact_name: form.venueContactName,
      venue_contact_email: form.venueContactEmail,
      venue_contact_phone: form.venueContactPhone,
      venue_postal_code: form.postalCode,
      venue_website: form.website,
      venue_technical_specs: form.technicalSpecs,
      supporting_artists: form.supportingArtists,
      lineup_notes: form.lineupNotes,
      ticket_url: form.ticketUrl,
      marketing_notes: form.marketingNotes,
      share_blurb: form.shareBlurb,
      page_template: form.pageTemplate || "modern",
      page_layout: normalizeEventPageLayout(form.pageLayout),
      set_times: setTimes.map((label) => ({ label })),
    },
  }
}

export function prefillFromBooking(booking: {
  booking_details?: Record<string, any>
  eventName?: string
  eventDate?: string
}) {
  const details = booking.booking_details || {}
  return {
    ...initialArtistEventProducerForm,
    title: booking.eventName || details.performanceType || "Booked performance",
    description: details.description || "",
    date: (booking.eventDate || details.performanceDate || "").slice(0, 10),
    time: timeFromValue(details.performanceTime) || "19:00",
    doorsOpen: timeFromValue(details.soundcheckTime) || "18:30",
    venueName: details.venue || "",
    city: details.location || "",
    marketingNotes: details.compensation
      ? `Compensation: ${details.compensation}`
      : "",
    lineupNotes: details.requirements || details.additionalNotes || "",
  } satisfies ArtistEventProducerFormState
}
