/**
 * EVENT-104 — Safe event conflict diff (no silent overwrite).
 */

export interface EventVersionSnapshot {
  eventVersion: number
  title: string | null
  status: string | null
  start_at: string | null
  end_at: string | null
  venue_id: string | null
  capacity: number | null
  timezone: string | null
  age_restrictions: string | null
}

export interface EventFieldDiff {
  path: string
  server: string | null
  client: string | null
}

export interface EventVersionConflictDiff {
  expectedVersion: number
  currentVersion: number
  fields: EventFieldDiff[]
  tourPlanTouch: {
    serverTouchedAt: string | null
    clientAware: boolean
  }
}

function norm(value: unknown): string | null {
  if (value == null || value === "") return null
  return String(value)
}

function fieldDiff(path: string, server: unknown, client: unknown): EventFieldDiff | null {
  const s = norm(server)
  const c = norm(client)
  if (s === c) return null
  return { path, server: s, client: c }
}

export function buildEventVersionConflictDiff(input: {
  expectedVersion: number
  server: EventVersionSnapshot
  client: Partial<EventVersionSnapshot>
  serverTourPlanTouchedAt?: string | null
  clientTourPlanTouchedAt?: string | null
}): EventVersionConflictDiff {
  const fields = [
    fieldDiff("title", input.server.title, input.client.title),
    fieldDiff("status", input.server.status, input.client.status),
    fieldDiff("start_at", input.server.start_at, input.client.start_at),
    fieldDiff("end_at", input.server.end_at, input.client.end_at),
    fieldDiff("venue_id", input.server.venue_id, input.client.venue_id),
    fieldDiff("capacity", input.server.capacity, input.client.capacity),
    fieldDiff("timezone", input.server.timezone, input.client.timezone),
    fieldDiff("age_restrictions", input.server.age_restrictions, input.client.age_restrictions),
  ].filter((row): row is EventFieldDiff => Boolean(row))

  return {
    expectedVersion: input.expectedVersion,
    currentVersion: input.server.eventVersion,
    fields,
    tourPlanTouch: {
      serverTouchedAt: input.serverTourPlanTouchedAt ?? null,
      clientAware:
        Boolean(input.clientTourPlanTouchedAt)
        && input.clientTourPlanTouchedAt === input.serverTourPlanTouchedAt,
    },
  }
}

export function summarizeEventVersionConflictDiff(diff: EventVersionConflictDiff): string {
  const parts = [
    `Expected event version ${diff.expectedVersion}, server is ${diff.currentVersion}.`,
  ]
  if (diff.fields.length > 0)
    parts.push(`Changed fields: ${diff.fields.map((field) => field.path).join(", ")}.`)
  if (diff.tourPlanTouch.serverTouchedAt && !diff.tourPlanTouch.clientAware)
    parts.push("Tour plan updated this event since your last load — reconcile before saving.")
  return parts.join(" ")
}

export class EventVersionConflictError extends Error {
  readonly status = 409
  readonly code = "version_conflict"
  currentVersion: number
  expectedVersion: number
  diff: EventVersionConflictDiff
  serverEvent: Record<string, unknown> | null

  constructor(args: {
    currentVersion: number
    expectedVersion: number
    diff: EventVersionConflictDiff
    serverEvent?: Record<string, unknown> | null
  }) {
    super(summarizeEventVersionConflictDiff(args.diff))
    this.name = "EventVersionConflictError"
    this.currentVersion = args.currentVersion
    this.expectedVersion = args.expectedVersion
    this.diff = args.diff
    this.serverEvent = args.serverEvent ?? null
  }
}
