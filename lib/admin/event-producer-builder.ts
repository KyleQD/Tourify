export interface ProducerSelection {
  id: string
  label: string
  meta?: string
}

export interface EventProducerFormState {
  title: string
  status: string
  visibility: string
  type: string
  description: string
  tags: string
  date: string
  time: string
  endTime: string
  timezone: string
  doorsOpen: string
  loadIn: string
  soundCheck: string
  curfew: string
  setTimes: string
  venueName: string
  venueAccountId: string
  venueId: string
  room: string
  capacity: string
  address: string
  venueContactName: string
  venueContactEmail: string
  venueContactPhone: string
  selectedTourIds: string[]
  primaryTourId: string
  ordinal: string
  legName: string
  market: string
  selectedArtists: ProducerSelection[]
  selectedCrew: ProducerSelection[]
  selectedVendors: ProducerSelection[]
  stakeholders: string
  technicalRider: string
  hospitalityRider: string
  securityNotes: string
  promoterName: string
  promoterEmail: string
  promoterPhone: string
  settlementTerms: string
  travel: string
  lodging: string
  equipment: string
  siteMap: string
  supplyList: string
  documents: string
  ticketPrice: string
  vipPrice: string
  expectedRevenue: string
  expectedExpenses: string
  comps: string
  guestListBudget: string
  daySheetNotes: string
  producerIntent: string
  templateKey: string
  setupChecklist: Record<string, boolean>
}

export const initialEventProducerForm: EventProducerFormState = {
  title: "",
  status: "draft",
  visibility: "private",
  type: "live",
  description: "",
  tags: "",
  date: "",
  time: "",
  endTime: "",
  timezone: "America/Los_Angeles",
  doorsOpen: "",
  loadIn: "",
  soundCheck: "",
  curfew: "",
  setTimes: "",
  venueName: "",
  venueAccountId: "",
  venueId: "",
  room: "",
  capacity: "",
  address: "",
  venueContactName: "",
  venueContactEmail: "",
  venueContactPhone: "",
  selectedTourIds: [],
  primaryTourId: "",
  ordinal: "",
  legName: "",
  market: "",
  selectedArtists: [],
  selectedCrew: [],
  selectedVendors: [],
  stakeholders: "",
  technicalRider: "",
  hospitalityRider: "",
  securityNotes: "",
  promoterName: "",
  promoterEmail: "",
  promoterPhone: "",
  settlementTerms: "",
  travel: "",
  lodging: "",
  equipment: "",
  siteMap: "",
  supplyList: "",
  documents: "",
  ticketPrice: "",
  vipPrice: "",
  expectedRevenue: "",
  expectedExpenses: "",
  comps: "",
  guestListBudget: "",
  daySheetNotes: "",
  producerIntent: "single_event",
  templateKey: "producer_standard",
  setupChecklist: {
    logistics: true,
    site_map: true,
    staffing: true,
    vendors: true,
    ticketing: true,
    communications: true,
    day_sheet: true,
  },
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

export function combineIso(date: string, time: string) {
  if (!date) return ""
  const safeTime = (time || "00:00").slice(0, 5)
  const timestamp = Date.parse(`${date}T${safeTime}:00`)
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString()
}

function readSettings(event: any): Record<string, unknown> {
  return event?.settings && typeof event.settings === "object" && !Array.isArray(event.settings)
    ? event.settings
    : {}
}

export function defaultEndIso(date: string, startTime: string, endTime: string) {
  if (endTime) return combineIso(date, endTime)
  const start = combineIso(date, startTime)
  if (!start) return ""
  return new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString()
}

function isoToDateAndTime(value?: string | null) {
  if (!value) return { date: "", time: "" }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    const [datePart, timePart] = String(value).split("T")
    return { date: datePart || "", time: (timePart || "").slice(0, 5) }
  }
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  }
}

function asSelectionList(value: unknown, fallbackLabel: string): ProducerSelection[] {
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

/** Hydrate producer form state from GET /api/admin/events/[id] payload. */
export function hydrateEventProducerForm(event: any): EventProducerFormState {
  const start = isoToDateAndTime(event?.start_at || event?.event_date)
  const end = isoToDateAndTime(event?.end_at)
  const settings = readSettings(event)
  const tours = Array.isArray(event?.tours) ? event.tours : []
  const selectedTourIds = tours.map((tour: any) => String(tour.id)).filter(Boolean)
  const primaryTour = tours.find((tour: any) => tour.is_primary) || tours[0]
  const setup = event?.setup_context || event?.settings?.setup_context || {}
  const checklist = event?.setup_checklist || event?.settings?.setup_checklist || initialEventProducerForm.setupChecklist

  return {
    ...initialEventProducerForm,
    title: event?.title || event?.name || "",
    status: event?.status || "draft",
    visibility: event?.public_visibility || event?.visibility || "private",
    type: event?.event_type || event?.type || "live",
    description: event?.description || "",
    tags: Array.isArray(event?.tags) ? event.tags.join(", ") : String(event?.tags || ""),
    date: start.date,
    time: event?.event_time || start.time,
    endTime: end.time,
    timezone: event?.timezone || "America/Los_Angeles",
    doorsOpen: event?.doors_open || "",
    loadIn: event?.load_in_time || "",
    soundCheck: event?.sound_check_time || "",
    curfew: event?.curfew || "",
    setTimes: Array.isArray(event?.set_times)
      ? event.set_times.map((item: any) => item?.label || item).filter(Boolean).join(", ")
      : "",
    venueName: event?.venue_name || "",
    venueAccountId: String(settings.venue_account_id || settings.venue_profile_id || ""),
    venueId: event?.venue_id || "",
    room: event?.venue_room || event?.location || "",
    capacity: event?.capacity != null ? String(event.capacity) : "",
    address: event?.venue_address || "",
    venueContactName: event?.venue_contact_name || "",
    venueContactEmail: event?.venue_contact_email || "",
    venueContactPhone: event?.venue_contact_phone || "",
    selectedTourIds,
    primaryTourId: primaryTour?.id || event?.primary_tour_id || event?.tour_id || "",
    ordinal: primaryTour?.ordinal != null ? String(primaryTour.ordinal) : "",
    legName: primaryTour?.leg_name || "",
    market: primaryTour?.market || event?.market || "",
    selectedArtists: asSelectionList(setup.artists || event?.artist_ids, "Artist"),
    selectedCrew: asSelectionList(setup.crew || event?.staff_ids, "Crew"),
    selectedVendors: asSelectionList(setup.vendors || event?.vendor_ids, "Vendor"),
    stakeholders: event?.stakeholders || "",
    technicalRider: event?.technical_rider || "",
    hospitalityRider: event?.hospitality_rider || "",
    securityNotes: event?.security_notes || "",
    promoterName: event?.promoter_contact?.name || "",
    promoterEmail: event?.promoter_contact?.email || "",
    promoterPhone: event?.promoter_contact?.phone || "",
    settlementTerms: event?.settlement_terms || "",
    travel: event?.travel || "",
    lodging: event?.lodging || "",
    equipment: event?.equipment || "",
    siteMap: event?.site_map || "",
    supplyList: event?.supply_list || "",
    documents: event?.documents || "",
    ticketPrice: event?.ticket_price != null ? String(event.ticket_price) : "",
    vipPrice: event?.vip_price != null ? String(event.vip_price) : "",
    expectedRevenue: event?.expected_revenue != null ? String(event.expected_revenue) : "",
    expectedExpenses: event?.expected_expenses != null ? String(event.expected_expenses) : "",
    comps: event?.comps || "",
    guestListBudget: event?.guest_list_budget || "",
    daySheetNotes: event?.day_sheet_notes || "",
    producerIntent: event?.producer_intent || "single_event",
    templateKey: event?.template_key || "producer_standard",
    setupChecklist: { ...initialEventProducerForm.setupChecklist, ...checklist },
  }
}

export function buildEventProducerPayload(
  form: EventProducerFormState,
  options: { publish?: boolean; readinessScore?: number } = {},
) {
  const readinessScore = options.readinessScore ?? 0
  const startAt = combineIso(form.date, form.time)
  const primaryTourId = form.primaryTourId || form.selectedTourIds[0] || null
  const venueAccountId = form.venueAccountId || form.venueId || null

  return {
    title: form.title.trim() || "Untitled event",
    description: form.description,
    event_type: form.type,
    public_visibility: form.visibility,
    tags: parseList(form.tags),
    status: options.publish ? "confirmed" : form.status,
    start_at: startAt,
    end_at: defaultEndIso(form.date, form.time, form.endTime),
    timezone: form.timezone,
    venue_id: venueAccountId,
    venue_name: form.venueName,
    venue_address: form.address,
    venue_room: form.room,
    venue_contact_name: form.venueContactName,
    venue_contact_email: form.venueContactEmail,
    venue_contact_phone: form.venueContactPhone,
    location: form.room,
    capacity: numberOrUndefined(form.capacity),
    tour_ids: form.selectedTourIds,
    primary_tour_id: primaryTourId,
    tour_assignments: form.selectedTourIds.map((tourId, index) => ({
      tour_id: tourId,
      ordinal: numberOrUndefined(form.ordinal) ?? index,
      is_primary: tourId === primaryTourId,
      leg_name: form.legName || null,
      market: form.market || null,
      advance_status: readinessScore >= 80 ? "ready" : readinessScore >= 40 ? "in_progress" : "not_started",
    })),
    doors_open: form.doorsOpen,
    curfew: form.curfew,
    load_in_time: form.loadIn,
    sound_check_time: form.soundCheck,
    set_times: parseList(form.setTimes).map((value) => ({ label: value })),
    ticket_price: numberOrUndefined(form.ticketPrice),
    vip_price: numberOrUndefined(form.vipPrice),
    expected_revenue: numberOrUndefined(form.expectedRevenue),
    expected_expenses: numberOrUndefined(form.expectedExpenses),
    artist_ids: form.selectedArtists.map((artist) => artist.id),
    staff_ids: form.selectedCrew.map((crew) => crew.id),
    vendor_ids: form.selectedVendors.map((vendor) => vendor.id),
    stakeholders: form.stakeholders,
    hospitality_rider: form.hospitalityRider,
    technical_rider: form.technicalRider,
    security_notes: form.securityNotes,
    settlement_terms: form.settlementTerms,
    promoter_contact: {
      name: form.promoterName,
      email: form.promoterEmail,
      phone: form.promoterPhone,
    },
    travel: form.travel,
    lodging: form.lodging,
    equipment: form.equipment,
    site_map: form.siteMap,
    supply_list: form.supplyList,
    documents: form.documents,
    comps: form.comps,
    guest_list_budget: form.guestListBudget,
    day_sheet_notes: form.daySheetNotes,
    creation_source: "admin_event_producer_builder",
    producer_intent: form.producerIntent,
    template_key: form.templateKey,
    setup_checklist: form.setupChecklist,
    setup_context: {
      artists: form.selectedArtists,
      crew: form.selectedCrew,
      vendors: form.selectedVendors,
      venue_account_id: venueAccountId,
      handoff_sections: Object.entries(form.setupChecklist)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    },
  }
}
