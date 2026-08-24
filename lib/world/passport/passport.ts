/**
 * P21-T03/T04/T08/T09 — Music Passport progress model.
 *
 * The passport records EXPLICIT exploration only: checking in at a place,
 * marking a journey complete, logging a radio session. Passive browsing
 * never writes entries, so nothing embarrassing or sensitive appears on a
 * profile by default. Visibility is private unless the learner opts in.
 * Milestones are derived read-only — no streaks, no leaderboards.
 */

export type PassportVisibility = "private" | "shared"

export interface PassportSettings {
  visibility: PassportVisibility
  /** Whether completed journeys may appear publicly (only if shared). */
  shareJourneys: boolean
}

export const DEFAULT_PASSPORT_SETTINGS: PassportSettings = {
  visibility: "private",
  shareJourneys: false,
}

export interface PassportEntry {
  kind:
    | "place_explored"
    | "genre_discovered"
    | "scene_discovered"
    | "radio_heard"
    | "instrument_learned"
    | "journey_completed"
    | "event_attended"
  key: string
  /** ISO date the learner explicitly recorded it. */
  recordedAt: string
  /** Verified event attendance is optional and requires a ticket ref. */
  verification?: { ticketRef: string } | null
}

export interface MusicPassport {
  userId: string
  settings: PassportSettings
  entries: PassportEntry[]
}

/** Add an entry — explicit action only; dedupes by (kind,key). */
export function recordEntry(
  passport: MusicPassport,
  entry: Omit<PassportEntry, "verification"> & { verification?: { ticketRef: string } | null },
): { ok: true; passport: MusicPassport } | { ok: false; error: string } {
  if (!entry.key?.trim()) return { ok: false, error: "key_required" }
  const eventAttendance = entry.kind === "event_attended"
  if (eventAttendance && !entry.verification?.ticketRef) {
    return { ok: false, error: "event_attendance_requires_ticket_ref" }
  }
  if (!eventAttendance && entry.verification) {
    return { ok: false, error: "verification_only_for_events" }
  }
  const exists = passport.entries.some((e) => e.kind === entry.kind && e.key === entry.key)
  if (exists) return { ok: true, passport } // idempotent re-record
  return {
    ok: true,
    passport: {
      ...passport,
      entries: [...passport.entries, { ...entry, key: entry.key.trim() }],
    },
  }
}

/**
 * T08 — what may others see? Private passports expose nothing. Shared
 * passports expose counts and (optionally) journeys — never raw radio
 * history or attendance details.
 */
export function publicPassportView(passport: MusicPassport): Record<string, unknown> | null {
  if (passport.settings.visibility === "private") return null
  const count = (kind: PassportEntry["kind"]) =>
    passport.entries.filter((e) => e.kind === kind).length
  const view: Record<string, unknown> = {
    placesExplored: count("place_explored"),
    genresDiscovered: count("genre_discovered") + count("scene_discovered"),
    instrumentsLearned: count("instrument_learned"),
  }
  if (passport.settings.shareJourneys) {
    view.journeysCompleted = count("journey_completed")
  }
  return view
}

// ─── Milestones (T09): derived, gentle, opt-out friendly ─────────────────

export interface PassportMilestone {
  key: string
  label: string
  earned: boolean
}

const MILESTONE_THRESHOLDS: Array<{ key: string; label: string; kind: PassportEntry["kind"]; threshold: number }> = [
  { key: "first_place", label: "First place explored", kind: "place_explored", threshold: 1 },
  { key: "five_places", label: "Five places explored", kind: "place_explored", threshold: 5 },
  { key: "first_journey", label: "First journey completed", kind: "journey_completed", threshold: 1 },
  { key: "three_instruments", label: "Three instruments learned", kind: "instrument_learned", threshold: 3 },
]

/** Derive milestone state read-only from entries. */
export function deriveMilestones(passport: MusicPassport): PassportMilestone[] {
  return MILESTONE_THRESHOLDS.map(({ key, label, kind, threshold }) => ({
    key,
    label,
    earned: passport.entries.filter((e) => e.kind === kind).length >= threshold,
  }))
}
