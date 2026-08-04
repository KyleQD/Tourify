/**
 * PLAN-102 — Safe plan conflict diff (no protected/cross-org leakage).
 */

export interface TourPlanDiffStop {
  event_id: string | null
  ordinal: number
  name: string
  venue: string | null
  date: string | null
  time: string | null
  market: string | null
  advance_status?: string | null
}

export interface TourPlanDiffSnapshot {
  planVersion: number
  name: string
  description?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  main_artist?: string | null
  route_notes?: string | null
  stops: TourPlanDiffStop[]
}

export interface TourPlanFieldDiff {
  path: string
  server: string | null
  client: string | null
}

export interface TourPlanConflictDiff {
  expectedVersion: number
  currentVersion: number
  fields: TourPlanFieldDiff[]
  stops: {
    onlyOnServer: Array<{ event_id: string | null; name: string; ordinal: number }>
    onlyOnClient: Array<{ event_id: string | null; name: string; ordinal: number }>
    changed: Array<{ event_id: string | null; name: string; fields: string[] }>
    orderChanged: boolean
  }
}

function norm(value: unknown): string | null {
  if (value == null || value === "") return null
  return String(value)
}

function fieldDiff(
  path: string,
  server: unknown,
  client: unknown,
): TourPlanFieldDiff | null {
  const s = norm(server)
  const c = norm(client)
  if (s === c) return null
  return { path, server: s, client: c }
}

function stopKey(stop: TourPlanDiffStop, index: number): string {
  if (stop.event_id) return `event:${stop.event_id}`
  return `ordinal:${stop.ordinal ?? index}:${norm(stop.name) || "stop"}`
}

/**
 * Compare the client's submitted plan against the authoritative server snapshot.
 * Only returns non-sensitive planning fields.
 */
export function buildTourPlanConflictDiff(args: {
  expectedVersion: number
  server: TourPlanDiffSnapshot
  client: {
    name: string
    description?: string | null
    status?: string | null
    start_date?: string | null
    end_date?: string | null
    main_artist?: string | null
    route_notes?: string | null
    stops: TourPlanDiffStop[]
  }
}): TourPlanConflictDiff {
  const fields = [
    fieldDiff("name", args.server.name, args.client.name),
    fieldDiff("description", args.server.description, args.client.description),
    fieldDiff("status", args.server.status, args.client.status),
    fieldDiff("start_date", args.server.start_date, args.client.start_date),
    fieldDiff("end_date", args.server.end_date, args.client.end_date),
    fieldDiff("main_artist", args.server.main_artist, args.client.main_artist),
    fieldDiff("route_notes", args.server.route_notes, args.client.route_notes),
  ].filter((entry): entry is TourPlanFieldDiff => Boolean(entry))

  const serverStops = args.server.stops || []
  const clientStops = args.client.stops || []
  const serverByKey = new Map(serverStops.map((stop, index) => [stopKey(stop, index), stop]))
  const clientByKey = new Map(clientStops.map((stop, index) => [stopKey(stop, index), stop]))

  const onlyOnServer = [...serverByKey.entries()]
    .filter(([key]) => !clientByKey.has(key))
    .map(([, stop]) => ({
      event_id: stop.event_id,
      name: stop.name,
      ordinal: stop.ordinal,
    }))

  const onlyOnClient = [...clientByKey.entries()]
    .filter(([key]) => !serverByKey.has(key))
    .map(([, stop]) => ({
      event_id: stop.event_id,
      name: stop.name,
      ordinal: stop.ordinal,
    }))

  const changed: TourPlanConflictDiff["stops"]["changed"] = []
  for (const [key, serverStop] of serverByKey) {
    const clientStop = clientByKey.get(key)
    if (!clientStop) continue
    const stopFields = [
      fieldDiff("name", serverStop.name, clientStop.name),
      fieldDiff("venue", serverStop.venue, clientStop.venue),
      fieldDiff("date", serverStop.date, clientStop.date),
      fieldDiff("time", serverStop.time, clientStop.time),
      fieldDiff("market", serverStop.market, clientStop.market),
      fieldDiff("advance_status", serverStop.advance_status, clientStop.advance_status),
      fieldDiff("ordinal", serverStop.ordinal, clientStop.ordinal),
    ].filter((entry): entry is TourPlanFieldDiff => Boolean(entry))
    if (stopFields.length) {
      changed.push({
        event_id: serverStop.event_id,
        name: serverStop.name,
        fields: stopFields.map((entry) => entry.path),
      })
    }
  }

  const serverOrder = serverStops.map((stop, index) => stopKey(stop, index)).join("|")
  const clientOrder = clientStops.map((stop, index) => stopKey(stop, index)).join("|")

  return {
    expectedVersion: args.expectedVersion,
    currentVersion: args.server.planVersion,
    fields,
    stops: {
      onlyOnServer,
      onlyOnClient,
      changed,
      orderChanged: serverOrder !== clientOrder,
    },
  }
}

export function summarizeTourPlanConflictDiff(diff: TourPlanConflictDiff): string {
  const parts: string[] = [`Server is at v${diff.currentVersion} (you sent v${diff.expectedVersion}).`]
  if (diff.fields.length) {
    parts.push(`Changed fields: ${diff.fields.map((field) => field.path).join(", ")}.`)
  }
  if (diff.stops.onlyOnServer.length || diff.stops.onlyOnClient.length || diff.stops.changed.length) {
    parts.push(
      `Stops: +${diff.stops.onlyOnServer.length} on server, +${diff.stops.onlyOnClient.length} local-only, ${diff.stops.changed.length} modified.`,
    )
  }
  if (diff.stops.orderChanged) parts.push("Stop order differs.")
  parts.push("Local edits were not saved. Reload the server plan to continue.")
  return parts.join(" ")
}
