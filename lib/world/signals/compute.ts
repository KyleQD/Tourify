/**
 * P9 — signal aggregation (pure, deterministic).
 *
 * Same input snapshot + same options ⇒ identical output. Per-user
 * contribution is capped before summation; below-floor cohorts are
 * suppressed with a reason rather than exposed.
 */
import {
  PRIVACY_FLOOR,
  sampleSizeBucket,
  timeDecay,
  WINDOW_MS,
  type RawActivityEvent,
  type SignalWindow,
} from "./types"

export interface SignalComputeOptions {
  nowMs: number
  halfLifeMs?: number
  minUniqueContributors?: number
  maxEventsPerContributor?: number
}

export interface SignalResult {
  placeBucket: string
  signalKind: string
  window: SignalWindow
  /** Decayed, per-user-capped score. Suppressed ⇒ null. */
  value: number | null
  uniqueContributors: number
  sampleSizeBucket: "<3" | "3-10" | "11-100" | "100+"
  suppressedReason?: "below_privacy_floor"
}

/** Filter events to the window and sort deterministically by contributor. */
function inWindow(events: RawActivityEvent[], window: SignalWindow, nowMs: number): RawActivityEvent[] {
  const span = WINDOW_MS[window]
  const cutoff = span === null ? 0 : nowMs - span
  return events
    .filter((e) => new Date(e.occurredAt).getTime() >= cutoff)
    .sort(
      (a, b) =>
        b.contributorHash.localeCompare(a.contributorHash) ||
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
}

/**
 * Compute one signal result for one (placeBucket, kind, window).
 * Deterministic for the same input snapshot.
 */
export function computeSignal(
  events: RawActivityEvent[],
  placeBucket: string,
  signalKind: string,
  window: SignalWindow,
  options: SignalComputeOptions,
): SignalResult {
  const scoped = inWindow(events, window, options.nowMs)
  const maxPerUser = options.maxEventsPerContributor ?? PRIVACY_FLOOR.maxEventsPerContributor
  const halfLifeMs = options.halfLifeMs ?? ((WINDOW_MS[window] ?? 7 * 24 * 3600_000) / 2)

  // Cap per-contributor contribution BEFORE summing (anti-manipulation).
  const perUser = new Map<string, RawActivityEvent[]>()
  for (const event of scoped) {
    const list = perUser.get(event.contributorHash) ?? []
    if (list.length < maxPerUser) list.push(event)
    perUser.set(event.contributorHash, list)
  }

  let value = 0
  for (const [, list] of perUser) {
    for (const event of list) {
      const weight = event.weight ?? 1
      value += weight * timeDecay(new Date(event.occurredAt).getTime(), options.nowMs, halfLifeMs)
    }
  }
  value = Math.round(value * 10000) / 10000

  const uniqueContributors = perUser.size
  const bucket = sampleSizeBucket(uniqueContributors)

  if (uniqueContributors < (options.minUniqueContributors ?? PRIVACY_FLOOR.minUniqueContributors)) {
    return {
      placeBucket,
      signalKind,
      window,
      value: null, // suppressed — never expose a below-floor cohort
      uniqueContributors,
      sampleSizeBucket: bucket,
      suppressedReason: "below_privacy_floor",
    }
  }

  return { placeBucket, signalKind, window, value, uniqueContributors, sampleSizeBucket: bucket }
}

/** Aggregate all groups from one event snapshot. */
export function computeAllSignals(
  events: RawActivityEvent[],
  windows: readonly SignalWindow[],
  options: SignalComputeOptions,
): SignalResult[] {
  const groups = new Map<string, RawActivityEvent[]>()
  for (const event of events) {
    const key = `${event.placeBucket}|${event.signalKind}`
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }
  const out: SignalResult[] = []
  for (const [groupKey, groupEvents] of [...groups.entries()].sort()) {
    const [placeBucket, signalKind] = groupKey.split("|")
    for (const window of windows) {
      out.push(computeSignal(groupEvents, placeBucket, signalKind, window, options))
    }
  }
  return out.sort(
    (a, b) =>
      a.placeBucket.localeCompare(b.placeBucket) ||
      a.signalKind.localeCompare(b.signalKind) ||
      a.window.localeCompare(b.window),
  )
}
