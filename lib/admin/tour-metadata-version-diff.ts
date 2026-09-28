/**
 * TOUR-201 — Safe tour metadata conflict diff (no silent overwrite).
 */

export interface TourMetadataSnapshot {
  metadataVersion: number
  name: string | null
  description: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  budget: string | null
  revenue: string | null
  expenses: string | null
  main_artist: string | null
  genre: string | null
}

export interface TourFieldDiff {
  path: string
  server: string | null
  client: string | null
}

export interface TourMetadataConflictDiff {
  expectedVersion: number
  currentVersion: number
  fields: TourFieldDiff[]
}

function norm(value: unknown): string | null {
  if (value == null || value === "") return null
  return String(value)
}

function fieldDiff(path: string, server: unknown, client: unknown): TourFieldDiff | null {
  const s = norm(server)
  const c = norm(client)
  if (s === c) return null
  return { path, server: s, client: c }
}

export function buildTourMetadataConflictDiff(input: {
  expectedVersion: number
  server: TourMetadataSnapshot
  client: Partial<TourMetadataSnapshot>
}): TourMetadataConflictDiff {
  const fields = [
    fieldDiff("name", input.server.name, input.client.name),
    fieldDiff("description", input.server.description, input.client.description),
    fieldDiff("status", input.server.status, input.client.status),
    fieldDiff("start_date", input.server.start_date, input.client.start_date),
    fieldDiff("end_date", input.server.end_date, input.client.end_date),
    fieldDiff("budget", input.server.budget, input.client.budget),
    fieldDiff("revenue", input.server.revenue, input.client.revenue),
    fieldDiff("expenses", input.server.expenses, input.client.expenses),
    fieldDiff("main_artist", input.server.main_artist, input.client.main_artist),
    fieldDiff("genre", input.server.genre, input.client.genre),
  ].filter((row): row is TourFieldDiff => Boolean(row))

  return {
    expectedVersion: input.expectedVersion,
    currentVersion: input.server.metadataVersion,
    fields,
  }
}

export function summarizeTourMetadataConflictDiff(diff: TourMetadataConflictDiff): string {
  const parts = [
    `Expected tour metadata version ${diff.expectedVersion}, server is ${diff.currentVersion}.`,
  ]
  if (diff.fields.length > 0)
    parts.push(`Conflicting fields: ${diff.fields.map((field) => field.path).join(", ")}.`)
  parts.push("Reload the tour or reapply your changes intentionally.")
  return parts.join(" ")
}

export class TourMetadataVersionConflictError extends Error {
  readonly status = 409
  readonly code = "version_conflict"
  currentVersion: number
  expectedVersion: number
  diff: TourMetadataConflictDiff
  serverTour: Record<string, unknown> | null

  constructor(args: {
    currentVersion: number
    expectedVersion: number
    diff: TourMetadataConflictDiff
    serverTour?: Record<string, unknown> | null
  }) {
    super(summarizeTourMetadataConflictDiff(args.diff))
    this.name = "TourMetadataVersionConflictError"
    this.currentVersion = args.currentVersion
    this.expectedVersion = args.expectedVersion
    this.diff = args.diff
    this.serverTour = args.serverTour ?? null
  }
}
