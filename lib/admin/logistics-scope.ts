/**
 * LOG-104 — Tour-first logistics scope URL contract.
 * Organization → tour → stop/event (/ optional leg). Never invent defaults.
 */

export const LOGISTICS_SCOPE_PARAMS = ["orgId", "tourId", "eventId", "legId", "tab", "stopId", "panel", "issueId"] as const

export interface LogisticsScopeState {
  orgId: string | null
  tourId: string | null
  eventId: string | null
  legId: string | null
  tab: string | null
  stopId: string | null
  panel: string | null
  issueId: string | null
}

export function parseLogisticsScopeParams(
  searchParams: URLSearchParams | Record<string, string | null | undefined>,
): LogisticsScopeState {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key)
    const value = searchParams[key]
    return typeof value === "string" && value.trim() ? value : null
  }

  return {
    orgId: get("orgId"),
    tourId: get("tourId"),
    eventId: get("eventId"),
    legId: get("legId"),
    tab: get("tab"),
    stopId: get("stopId"),
    panel: get("panel"),
    issueId: get("issueId"),
  }
}

export function buildLogisticsScopeSearchParams(args: {
  current: URLSearchParams
  updates: Partial<LogisticsScopeState>
}): URLSearchParams {
  const params = new URLSearchParams(args.current.toString())

  for (const key of LOGISTICS_SCOPE_PARAMS) {
    if (!(key in args.updates)) continue
    const value = args.updates[key]
    if (value) params.set(key, value)
    else params.delete(key)
  }

  // Clearing tour clears dependent stop/leg unless explicitly re-set in same update.
  if ("tourId" in args.updates && !args.updates.tourId) {
    if (!("eventId" in args.updates)) params.delete("eventId")
    if (!("legId" in args.updates)) params.delete("legId")
    if (!("stopId" in args.updates)) params.delete("stopId")
    if (!("panel" in args.updates)) params.delete("panel")
    if (!("issueId" in args.updates)) params.delete("issueId")
  }

  return params
}

/** Reject silent org/tour switches: URL org must match acting org when both present. */
export function assertLogisticsScopeOrgConsistency(args: {
  actingOrgId: string | null | undefined
  urlOrgId: string | null | undefined
}): { ok: true } | { ok: false; error: string } {
  if (!args.urlOrgId || !args.actingOrgId) return { ok: true }
  if (args.urlOrgId === args.actingOrgId) return { ok: true }
  return {
    ok: false,
    error: "URL orgId does not match the acting organization — refusing silent switch",
  }
}

export function formatLogisticsScopeBadge(scope: {
  orgLabel?: string | null
  tourName?: string | null
  eventName?: string | null
  legLabel?: string | null
}): string {
  const parts: string[] = []
  if (scope.orgLabel) parts.push(scope.orgLabel)
  if (scope.tourName) parts.push(scope.tourName)
  if (scope.eventName) parts.push(scope.eventName)
  else if (scope.tourName) parts.push("All stops")
  if (scope.legLabel) parts.push(scope.legLabel)
  if (parts.length === 0) return "No scope selected"
  return parts.join(" · ")
}
