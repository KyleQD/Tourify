/**
 * TRAVEL-306 — Traveler-specific itinerary publication (pure).
 *
 * Publishes a traveler-specific view of the itinerary. Each person receives:
 *  - Only their own travel segments, room nights, and show calls.
 *  - Approved group context (shared segments, collective check-in info).
 *  - A versioned snapshot so diffs between versions can be shown.
 *  - Acknowledgement state (the traveler has seen/confirmed the itinerary).
 *  - Offline access token (for disconnected viewing).
 *
 * Audience projection rules:
 *  - Private details (e.g. restricted accessibility notes, costs, other
 *    people's room assignments) are excluded from the projection.
 *  - Shared segment labels (carrier, schedule) are included.
 *  - The traveler sees only their roommate's name (not full details).
 *
 * Pure: no I/O, no `server-only`.
 */

import type { TimelineEntry } from "@/lib/admin/travel-itinerary-timeline"

// ---------------------------------------------------------------------------
// Projection types
// ---------------------------------------------------------------------------

/** A single projected itinerary entry for a traveler. */
export interface ProjectedEntry {
  entry_id: string
  kind: TimelineEntry["kind"]
  label: string
  local_date: string
  local_start_time: string
  local_end_time: string
  ianaZone: string
  location: string | null
  /** True if this entry is shared with the whole group. */
  is_group_entry: boolean
  coverage: TimelineEntry["coverage"]
}

/** A projected room assignment — traveler sees their room and roommate name only. */
export interface ProjectedRoomAssignment {
  room_night_id: string
  property_name: string
  address?: string | null
  check_in_date: string
  check_out_date: string
  room_type?: string | null
  /** Roommate names (display only — no IDs). */
  roommate_names: string[]
  /** Confirmation number visible to traveler. */
  confirmation_number?: string | null
}

/** Traveler-specific itinerary publication. */
export interface TravelerItineraryPublication {
  publication_id: string
  /** Stable version number — increments on each re-publish. */
  version: number
  /** ISO timestamp of this publication. */
  published_at: string
  /** Person this itinerary is for. */
  person_id: string
  person_name: string
  /** Tour / version this covers. */
  tour_id: string
  tour_version_id: string
  /** Projected timeline entries (only this person's + shared). */
  entries: ProjectedEntry[]
  /** Projected room assignments. */
  rooms: ProjectedRoomAssignment[]
  /** Acknowledgement state. */
  acknowledgement: ItineraryAcknowledgement
  /** Offline access token (short opaque string). */
  offline_token: string
  /** ISO expiry of the offline token. */
  offline_token_expires_at: string
}

export interface ItineraryAcknowledgement {
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_version: number | null
  /** True when a newer version has been published since last ack. */
  needs_reacknowledgement: boolean
}

// ---------------------------------------------------------------------------
// Diff between versions
// ---------------------------------------------------------------------------

export interface ItineraryDiffEntry {
  kind: "added" | "removed" | "changed"
  entry_id: string
  label: string
  changed_fields?: string[]
}

export interface ItineraryVersionDiff {
  from_version: number
  to_version: number
  changes: ItineraryDiffEntry[]
  has_changes: boolean
}

// ---------------------------------------------------------------------------
// Input types for projection
// ---------------------------------------------------------------------------

export interface ItineraryProjectionInput {
  person_id: string
  person_name: string
  tour_id: string
  tour_version_id: string
  /** All timeline entries for this person. */
  entries: TimelineEntry[]
  /** All room nights for this person. */
  rooms: Array<{
    room_night_id: string
    property_name: string
    address?: string | null
    check_in_date: string
    check_out_date: string
    room_type?: string | null
    confirmation_number?: string | null
    /** Other guests in the same room (display names only). */
    roommate_names: string[]
  }>
  /** Entries that are shared with the whole group (by source_id). */
  shared_source_ids: Set<string>
  /** ISO now for token expiry. */
  nowIso: string
  /** Offline token validity in hours. Default 72. */
  offlineTokenHours?: number
}

// ---------------------------------------------------------------------------
// Offline token helper (deterministic for tests)
// ---------------------------------------------------------------------------

function generateOfflineToken(personId: string, tourId: string, publishedAt: string): string {
  const raw = `offline:${personId}:${tourId}:${publishedAt}`
  return `oit_${btoa(raw).replace(/[+/=]/g, "").slice(0, 24)}`
}

// ---------------------------------------------------------------------------
// Projection engine
// ---------------------------------------------------------------------------

/**
 * Build a traveler-specific itinerary publication from the raw input.
 * Applies audience projection: excludes costs, other people's assignments,
 * full accessibility notes, and other private fields.
 */
export function projectTravelerItinerary(
  input: ItineraryProjectionInput,
  opts: { publicationId: string; version: number; previousVersion?: TravelerItineraryPublication | null },
): TravelerItineraryPublication {
  const { person_id, person_name, tour_id, tour_version_id, entries, rooms, shared_source_ids } = input
  const nowIso = input.nowIso

  const publishedAt = nowIso
  const offlineHours = input.offlineTokenHours ?? 72
  const offlineExpiry = new Date(new Date(nowIso).getTime() + offlineHours * 60 * 60 * 1000).toISOString()
  const offlineToken = generateOfflineToken(person_id, tour_id, publishedAt)

  // Project entries — only include entries for this person
  // (in practice, entries are already filtered upstream)
  const projectedEntries: ProjectedEntry[] = entries.map((entry) => ({
    entry_id: entry.entry_id,
    kind: entry.kind,
    label: entry.label,
    local_date: entry.local_date,
    local_start_time: entry.local_start_time,
    local_end_time: entry.local_end_time,
    ianaZone: entry.ianaZone,
    location: entry.location ?? null,
    is_group_entry: entry.source_id != null && shared_source_ids.has(entry.source_id),
    coverage: entry.coverage,
  }))

  // Project rooms — include only name of roommates (not IDs)
  const projectedRooms: ProjectedRoomAssignment[] = rooms.map((room) => ({
    room_night_id: room.room_night_id,
    property_name: room.property_name,
    address: room.address ?? null,
    check_in_date: room.check_in_date,
    check_out_date: room.check_out_date,
    room_type: room.room_type ?? null,
    roommate_names: room.roommate_names, // names only — no IDs
    confirmation_number: room.confirmation_number ?? null,
  }))

  // Acknowledgement
  const previousAck = opts.previousVersion?.acknowledgement
  const acknowledgement: ItineraryAcknowledgement = {
    acknowledged: previousAck?.acknowledged ?? false,
    acknowledged_at: previousAck?.acknowledged_at ?? null,
    acknowledged_version: previousAck?.acknowledged_version ?? null,
    needs_reacknowledgement:
      opts.version > 1 &&
      (previousAck == null ||
        !previousAck.acknowledged ||
        (previousAck.acknowledged_version ?? 0) < opts.version),
  }

  return {
    publication_id: opts.publicationId,
    version: opts.version,
    published_at: publishedAt,
    person_id,
    person_name,
    tour_id,
    tour_version_id,
    entries: projectedEntries,
    rooms: projectedRooms,
    acknowledgement,
    offline_token: offlineToken,
    offline_token_expires_at: offlineExpiry,
  }
}

// ---------------------------------------------------------------------------
// Acknowledge
// ---------------------------------------------------------------------------

/**
 * Record acknowledgement by the traveler.
 * Returns the updated publication; does not modify original.
 */
export function acknowledgeTravelerItinerary(
  pub: TravelerItineraryPublication,
  acknowledgedAt: string,
): TravelerItineraryPublication {
  return {
    ...pub,
    acknowledgement: {
      acknowledged: true,
      acknowledged_at: acknowledgedAt,
      acknowledged_version: pub.version,
      needs_reacknowledgement: false,
    },
  }
}

// ---------------------------------------------------------------------------
// Diff engine
// ---------------------------------------------------------------------------

/**
 * Compute the diff between two versions of a traveler itinerary.
 */
export function diffTravelerItineraries(
  previous: TravelerItineraryPublication,
  current: TravelerItineraryPublication,
): ItineraryVersionDiff {
  const prevEntryMap = new Map(previous.entries.map((e) => [e.entry_id, e]))
  const currEntryMap = new Map(current.entries.map((e) => [e.entry_id, e]))

  const changes: ItineraryDiffEntry[] = []

  // Removed entries
  for (const [id, prev] of prevEntryMap) {
    if (!currEntryMap.has(id)) {
      changes.push({ kind: "removed", entry_id: id, label: prev.label })
    }
  }

  // Added entries
  for (const [id, curr] of currEntryMap) {
    if (!prevEntryMap.has(id)) {
      changes.push({ kind: "added", entry_id: id, label: curr.label })
    }
  }

  // Changed entries (same id, different fields)
  for (const [id, curr] of currEntryMap) {
    const prev = prevEntryMap.get(id)
    if (!prev) continue
    const changed_fields: string[] = []
    const compareFields: (keyof ProjectedEntry)[] = [
      "local_date", "local_start_time", "local_end_time", "location", "coverage",
    ]
    for (const f of compareFields) {
      if (prev[f] !== curr[f]) changed_fields.push(f)
    }
    if (changed_fields.length > 0) {
      changes.push({ kind: "changed", entry_id: id, label: curr.label, changed_fields })
    }
  }

  return {
    from_version: previous.version,
    to_version: current.version,
    changes,
    has_changes: changes.length > 0,
  }
}
