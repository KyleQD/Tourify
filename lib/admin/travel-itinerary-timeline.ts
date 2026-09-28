/**
 * TRAVEL-304 — Itinerary timeline builder (pure).
 *
 * Merges route legs, travel segments, lodging nights, and show events
 * into a single chronological timeline for a person or group. Identifies:
 *
 *  - Gaps:    periods with no coverage between consecutive entries
 *  - Overlaps: two entries that conflict in time
 *  - Freshness: which entries have stale or missing data
 *
 * All times are expressed in the local IANA zone of each entry.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Timeline entry types
// ---------------------------------------------------------------------------

export type TimelineEntryKind =
  | "show"          // confirmed show/festival stop
  | "rehearsal"     // rehearsal stop
  | "travel"        // travel segment (flight, drive, etc.)
  | "lodging"       // hotel check-in/out night
  | "call"          // advance call, production meeting, etc.
  | "rest"          // explicit rest day
  | "transit"       // local transfer / ground transport
  | "other"         // any other operational day

export type TimelineEntryCoverage =
  | "confirmed"     // has confirmation/reference
  | "proposed"      // planned but not confirmed
  | "gap"           // synthesized gap entry

export interface TimelineEntry {
  entry_id: string
  kind: TimelineEntryKind
  coverage: TimelineEntryCoverage
  label: string
  /** UTC ISO start. */
  start_utc: string
  /** UTC ISO end. */
  end_utc: string
  /** IANA zone for local display. */
  ianaZone: string
  /** Local date (YYYY-MM-DD). */
  local_date: string
  /** Local start time (HH:MM). */
  local_start_time: string
  /** Local end time (HH:MM). */
  local_end_time: string
  /** Optional location / venue. */
  location?: string | null
  /** Source record id (segment_id, stop_id, etc.). */
  source_id: string | null
  /** ISO timestamp of when this entry data was last updated. */
  data_updated_at: string | null
  /** Whether the entry data is considered stale. */
  is_stale: boolean
}

export interface TimelineGap {
  after_entry_id: string
  before_entry_id: string | null
  gap_minutes: number
  label: string
}

export interface TimelineOverlap {
  entry_a_id: string
  entry_b_id: string
  overlap_minutes: number
  label: string
}

export interface PersonItinerary {
  person_id: string
  /** All timeline entries in chronological order. */
  entries: TimelineEntry[]
  /** Synthesized gap entries between consecutive entries. */
  gaps: TimelineGap[]
  /** Overlapping entry pairs. */
  overlaps: TimelineOverlap[]
  /** Entries with stale or missing data. */
  stale_entries: TimelineEntry[]
  /** Summary. */
  summary: {
    total_entries: number
    confirmed: number
    proposed: number
    gap_count: number
    overlap_count: number
    stale_count: number
  }
}

// ---------------------------------------------------------------------------
// UTC/local helpers
// ---------------------------------------------------------------------------

function utcToLocal(
  utcIso: string,
  ianaZone: string,
): { localDate: string; localTime: string } {
  const date = new Date(utcIso)
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)

  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: ianaZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)

  return { localDate, localTime }
}

function gapMinutes(endUtc: string, startUtc: string): number {
  return Math.round((new Date(startUtc).getTime() - new Date(endUtc).getTime()) / 60000)
}

function overlapMinutes(
  a: { start_utc: string; end_utc: string },
  b: { start_utc: string; end_utc: string },
): number {
  const overlapStart = Math.max(new Date(a.start_utc).getTime(), new Date(b.start_utc).getTime())
  const overlapEnd = Math.min(new Date(a.end_utc).getTime(), new Date(b.end_utc).getTime())
  return Math.max(0, Math.round((overlapEnd - overlapStart) / 60000))
}

function overlapsTime(
  a: { start_utc: string; end_utc: string },
  b: { start_utc: string; end_utc: string },
): boolean {
  return overlapMinutes(a, b) > 0
}

// ---------------------------------------------------------------------------
// Raw entry input (before local time enrichment)
// ---------------------------------------------------------------------------

export interface RawTimelineEntry {
  entry_id: string
  kind: TimelineEntryKind
  coverage: TimelineEntryCoverage
  label: string
  start_utc: string
  end_utc: string
  ianaZone: string
  location?: string | null
  source_id?: string | null
  data_updated_at?: string | null
  maxAgeMinutes?: number
  nowIso?: string
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

function enrichEntry(raw: RawTimelineEntry): TimelineEntry {
  const zone = raw.ianaZone || "UTC"
  const { localDate, localTime: localStart } = utcToLocal(raw.start_utc, zone)
  const { localTime: localEnd } = utcToLocal(raw.end_utc, zone)

  let is_stale = false
  if (!raw.data_updated_at) {
    is_stale = true
  } else {
    const maxAge = raw.maxAgeMinutes ?? 240 // 4h default
    const now = new Date(raw.nowIso ?? raw.data_updated_at).getTime()
    const updated = new Date(raw.data_updated_at).getTime()
    is_stale = (now - updated) / 60000 > maxAge
  }

  return {
    entry_id: raw.entry_id,
    kind: raw.kind,
    coverage: raw.coverage,
    label: raw.label,
    start_utc: raw.start_utc,
    end_utc: raw.end_utc,
    ianaZone: zone,
    local_date: localDate,
    local_start_time: localStart,
    local_end_time: localEnd,
    location: raw.location ?? null,
    source_id: raw.source_id ?? null,
    data_updated_at: raw.data_updated_at ?? null,
    is_stale,
  }
}

// ---------------------------------------------------------------------------
// Timeline builder
// ---------------------------------------------------------------------------

/**
 * Build the itinerary timeline for a single person.
 * Entries are sorted chronologically; gaps and overlaps are computed.
 */
export function buildPersonItinerary(args: {
  person_id: string
  rawEntries: RawTimelineEntry[]
  /** Minimum gap minutes to report (gaps shorter than this are ignored). */
  minGapMinutes?: number
}): PersonItinerary {
  const { person_id, rawEntries, minGapMinutes = 60 } = args

  const entries: TimelineEntry[] = rawEntries
    .map(enrichEntry)
    .sort((a, b) => new Date(a.start_utc).getTime() - new Date(b.start_utc).getTime())

  // Detect gaps
  const gaps: TimelineGap[] = []
  for (let i = 0; i < entries.length - 1; i++) {
    const curr = entries[i]
    const next = entries[i + 1]
    const gap = gapMinutes(curr.end_utc, next.start_utc)
    if (gap >= minGapMinutes) {
      gaps.push({
        after_entry_id: curr.entry_id,
        before_entry_id: next.entry_id,
        gap_minutes: gap,
        label: `Gap of ${Math.round(gap / 60)}h ${gap % 60}m between "${curr.label}" and "${next.label}"`,
      })
    }
  }

  // Detect overlaps
  const overlaps: TimelineOverlap[] = []
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (overlapsTime(entries[i], entries[j])) {
        const mins = overlapMinutes(entries[i], entries[j])
        overlaps.push({
          entry_a_id: entries[i].entry_id,
          entry_b_id: entries[j].entry_id,
          overlap_minutes: mins,
          label: `"${entries[i].label}" overlaps "${entries[j].label}" by ${mins}m`,
        })
      } else {
        // Since entries are sorted by start_utc, once next.start >= curr.end
        // there can be no more overlaps with curr
        break
      }
    }
  }

  const stale_entries = entries.filter((e) => e.is_stale)

  const summary = {
    total_entries: entries.length,
    confirmed: entries.filter((e) => e.coverage === "confirmed").length,
    proposed: entries.filter((e) => e.coverage === "proposed").length,
    gap_count: gaps.length,
    overlap_count: overlaps.length,
    stale_count: stale_entries.length,
  }

  return { person_id, entries, gaps, overlaps, stale_entries, summary }
}

// ---------------------------------------------------------------------------
// Group itinerary (multiple people, shared entries)
// ---------------------------------------------------------------------------

export interface GroupItinerary {
  entries_by_person: Map<string, PersonItinerary>
  /** Entries that every person in the group shares (same source_id). */
  shared_entries: TimelineEntry[]
  /** People with gaps or overlaps — the attention list. */
  attention_required: string[]
}

/**
 * Build itineraries for a group and identify shared entries and issues.
 */
export function buildGroupItinerary(args: {
  group: Array<{ person_id: string; rawEntries: RawTimelineEntry[] }>
  minGapMinutes?: number
}): GroupItinerary {
  const entries_by_person = new Map<string, PersonItinerary>()

  for (const member of args.group) {
    entries_by_person.set(
      member.person_id,
      buildPersonItinerary({
        person_id: member.person_id,
        rawEntries: member.rawEntries,
        minGapMinutes: args.minGapMinutes,
      }),
    )
  }

  // Shared entries: source_ids present for all members
  const sourceIdSets = Array.from(entries_by_person.values()).map(
    (itin) => new Set(itin.entries.map((e) => e.source_id).filter(Boolean)),
  )
  const sharedSourceIds =
    sourceIdSets.length === 0
      ? new Set<string | null>()
      : sourceIdSets.reduce((a, b) => new Set([...a].filter((id) => b.has(id))))

  const firstPersonEntries = Array.from(entries_by_person.values())[0]?.entries ?? []
  const shared_entries = firstPersonEntries.filter(
    (e) => e.source_id && sharedSourceIds.has(e.source_id),
  )

  const attention_required = Array.from(entries_by_person.entries())
    .filter(([, itin]) => itin.gaps.length > 0 || itin.overlaps.length > 0)
    .map(([pid]) => pid)

  return { entries_by_person, shared_entries, attention_required }
}
