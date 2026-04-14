import type { TipDismissalState } from "./types"

const STORAGE_KEY = "tourify:product-education:v1"
const VENUE_SPOTLIGHT_KEY = "tourify:venue-nav-spotlight:v1"

export const VENUE_SPOTLIGHT_CURRENT_VERSION = 1

export function readEducationState(): TipDismissalState {
  if (typeof window === "undefined") {
    return { dismissedTipIds: [], snoozedUntil: {}, venueSpotlightVersion: null }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return { dismissedTipIds: [], snoozedUntil: {}, venueSpotlightVersion: null }
    const parsed = JSON.parse(raw) as Partial<TipDismissalState>
    return {
      dismissedTipIds: Array.isArray(parsed.dismissedTipIds) ? parsed.dismissedTipIds : [],
      snoozedUntil:
        parsed.snoozedUntil && typeof parsed.snoozedUntil === "object"
          ? parsed.snoozedUntil
          : {},
      venueSpotlightVersion:
        typeof parsed.venueSpotlightVersion === "number" ? parsed.venueSpotlightVersion : null,
    }
  } catch {
    return { dismissedTipIds: [], snoozedUntil: {}, venueSpotlightVersion: null }
  }
}

export function writeEducationState(next: TipDismissalState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function persistTipDismissal(tipId: string) {
  const state = readEducationState()
  if (state.dismissedTipIds.includes(tipId)) return
  writeEducationState({
    ...state,
    dismissedTipIds: [...state.dismissedTipIds, tipId],
  })
}

export function persistTipSnooze(tipId: string, days: number) {
  const state = readEducationState()
  const until = new Date()
  until.setDate(until.getDate() + days)
  writeEducationState({
    ...state,
    snoozedUntil: { ...state.snoozedUntil, [tipId]: until.toISOString() },
  })
}

export function readVenueSpotlightDismissedVersion(): number | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(VENUE_SPOTLIGHT_KEY)
    if (v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeVenueSpotlightDismissedVersion(version: number) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(VENUE_SPOTLIGHT_KEY, String(version))
  } catch {
    /* ignore */
  }
}

const FAVORITES_KEY = "tourify:help-favorites:v1"
const RECENT_KEY = "tourify:help-recent:v1"

export function readHelpFavorites(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function writeHelpFavorites(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.slice(0, 50)))
  } catch {
    /* ignore */
  }
}

export function readHelpRecent(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function writeHelpRecent(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 8)))
  } catch {
    /* ignore */
  }
}
