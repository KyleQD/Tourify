export interface AdminOpsContextParams {
  tourId?: string | null
  eventId?: string | null
  tab?: string | null
  siteMapId?: string | null
  entityType?: "venue" | "organization" | "artist" | null
  entityId?: string | null
  venueId?: string | null
  displayName?: string | null
}

function appendEmployerParams(search: URLSearchParams, params: AdminOpsContextParams) {
  if (params.entityType) search.set("entity_type", params.entityType)
  if (params.entityId) search.set("entity_id", params.entityId)
  if (params.venueId) search.set("venue_id", params.venueId)
  if (params.displayName) search.set("display_name", params.displayName)
}

export function buildAdminLogisticsHref(params: AdminOpsContextParams = {}): string {
  const search = new URLSearchParams()
  if (params.tourId) search.set("tourId", params.tourId)
  if (params.eventId) search.set("eventId", params.eventId)
  if (params.tab) search.set("tab", params.tab)
  if (params.siteMapId) search.set("siteMapId", params.siteMapId)
  appendEmployerParams(search, params)
  const query = search.toString()
  return query ? `/admin/dashboard/logistics?${query}` : "/admin/dashboard/logistics"
}

export function buildAdminRosterHref(params: AdminOpsContextParams = {}): string {
  const search = new URLSearchParams()
  if (params.tourId) search.set("tourId", params.tourId)
  if (params.eventId) search.set("eventId", params.eventId)
  appendEmployerParams(search, params)
  const query = search.toString()
  return query ? `/admin/dashboard/roster?${query}` : "/admin/dashboard/roster"
}

export function buildAdminHiringHref(params: AdminOpsContextParams = {}): string {
  const search = new URLSearchParams()
  if (params.tourId) search.set("tourId", params.tourId)
  if (params.eventId) search.set("eventId", params.eventId)
  if (params.tab) search.set("tab", params.tab)
  appendEmployerParams(search, params)
  const query = search.toString()
  return query ? `/admin/dashboard/hiring?${query}` : "/admin/dashboard/hiring"
}

export function buildAdminStaffHref(params: AdminOpsContextParams = {}): string {
  const search = new URLSearchParams()
  if (params.tourId) search.set("tourId", params.tourId)
  if (params.eventId) {
    search.set("eventId", params.eventId)
    search.set("event_id", params.eventId)
  }
  if (params.tab) search.set("tab", params.tab)
  appendEmployerParams(search, params)
  const query = search.toString()
  return query ? `/admin/dashboard/staff?${query}` : "/admin/dashboard/staff"
}

export function buildAdminSiteMapHref(params: AdminOpsContextParams = {}): string {
  return buildAdminLogisticsHref({
    tourId: params.tourId,
    eventId: params.eventId,
    tab: params.tab || "site-maps",
    siteMapId: params.siteMapId,
    entityType: params.entityType,
    entityId: params.entityId,
    venueId: params.venueId,
    displayName: params.displayName,
  })
}

export function mapAdvancingStatusToTourAdvanceStatus(status: string | null | undefined): string {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "ready" || normalized === "approved" || normalized === "complete" || normalized === "completed") {
    return "ready"
  }
  if (normalized === "sent" || normalized === "in_progress" || normalized === "review") {
    return "in_progress"
  }
  if (normalized === "blocked" || normalized === "rejected") return "blocked"
  if (normalized === "settled") return "settled"
  return "not_started"
}

/** Resolve employer scope from an events_v2-like row for roster/hiring deep links. */
export function resolveEmployerFromEventRow(event: {
  org_id?: string | null
  venue_id?: string | null
  settings?: Record<string, unknown> | null
} | null | undefined): Pick<AdminOpsContextParams, "entityType" | "entityId" | "venueId"> {
  if (!event) return {}
  const settings = event.settings && typeof event.settings === "object" ? event.settings : {}
  const venueAccountId =
    typeof settings.venue_account_id === "string" ? settings.venue_account_id : null

  if (venueAccountId) {
    return { entityType: "venue", entityId: venueAccountId, venueId: venueAccountId }
  }
  if (event.org_id) {
    return { entityType: "organization", entityId: event.org_id, venueId: event.venue_id || null }
  }
  if (event.venue_id) {
    return { entityType: "venue", entityId: event.venue_id, venueId: event.venue_id }
  }
  return {}
}
