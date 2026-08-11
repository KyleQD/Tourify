/**
 * TOUR-301 — Tour health/risk aggregation model (pure).
 *
 * Every health signal in the tour command-center must carry:
 *  - source:         which domain/subsystem produced the signal
 *  - severity:       ok / warning / error / unknown
 *  - threshold:      the numeric or boolean limit that was tested
 *  - owner:          domain responsible for resolution
 *  - freshness:      ISO timestamp of last evaluation + staleness flag
 *  - remediationUrl: path to the admin panel where the issue can be resolved
 *
 * Invariants:
 *  - "unknown" severity means the signal could not be evaluated (e.g.
 *    a dependency failed or data was not fetched). An unknown signal is
 *    NEVER scored as "healthy". The aggregated health is at most "degraded"
 *    when any signal is "unknown".
 *  - "error" signals make the aggregated health "unhealthy".
 *  - "warning" signals make the aggregated health "at_risk".
 *  - All signals "ok" → aggregated health is "healthy".
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

export type HealthSignalSeverity = "ok" | "warning" | "error" | "unknown"

export type HealthSignalDomain =
  | "plan"
  | "route"
  | "logistics"
  | "workforce"
  | "advancing"
  | "ticketing"
  | "finance"
  | "publication"
  | "vendor"
  | "contract"
  | "calendar"
  | "comms"
  | "system"

/**
 * A single health check signal.
 */
export interface TourHealthSignal {
  /** Stable machine-readable id for this signal type (e.g. "route.excessive_drive"). */
  signal_id: string
  /** Human-readable name shown in the UI. */
  label: string
  /** Which domain/system produced this signal. */
  source: HealthSignalDomain
  /** Current severity. "unknown" means the check could not run. */
  severity: HealthSignalSeverity
  /**
   * The threshold this signal checks against.
   * Examples:
   *  - { type: "count_lte", value: 0 }  — "zero open errors"
   *  - { type: "bool_true" }            — "flag must be true"
   *  - { type: "age_minutes_lte", value: 60 } — "fresher than 1 hour"
   */
  threshold: HealthThreshold
  /**
   * The actual value observed (for display and debugging).
   * null when the signal could not be evaluated.
   */
  observed_value: number | boolean | string | null
  /** Domain/team responsible for resolving an error or warning. */
  owner: HealthSignalDomain
  /** ISO timestamp when this signal was last evaluated. */
  evaluated_at: string
  /** Whether the signal data is considered stale (evaluated_at is too old). */
  is_stale: boolean
  /** Admin path to the panel where this issue can be remediated. */
  remediationUrl: string
  /** Optional human-readable explanation of the current state. */
  detail?: string | null
}

export type HealthThresholdType =
  | "count_eq"      // actual === value
  | "count_lte"     // actual <= value
  | "count_gte"     // actual >= value
  | "bool_true"     // actual === true
  | "bool_false"    // actual === false
  | "age_minutes_lte" // age in minutes <= value

export interface HealthThreshold {
  type: HealthThresholdType
  /** Numeric bound. Required for count_* and age_minutes_lte types. */
  value?: number
}

// ---------------------------------------------------------------------------
// Aggregated health
// ---------------------------------------------------------------------------

export type TourHealthStatus = "healthy" | "at_risk" | "unhealthy" | "degraded"

/**
 * Aggregated health summary for a tour.
 * "degraded" means one or more signals are "unknown" (check failed).
 */
export interface TourHealthSummary {
  tour_id: string
  /** Aggregated status computed from all signals. */
  status: TourHealthStatus
  /** All signals evaluated for this tour. */
  signals: TourHealthSignal[]
  /** Signals with severity "error". */
  errors: TourHealthSignal[]
  /** Signals with severity "warning". */
  warnings: TourHealthSignal[]
  /** Signals with severity "unknown" (checks that could not run). */
  unknown: TourHealthSignal[]
  /** Signals that are stale (evaluated_at older than freshness threshold). */
  stale: TourHealthSignal[]
  /** ISO timestamp of the oldest evaluated_at across all signals. */
  oldest_evaluation: string | null
  /** ISO timestamp of the newest evaluated_at across all signals. */
  newest_evaluation: string | null
}

// ---------------------------------------------------------------------------
// Aggregation engine
// ---------------------------------------------------------------------------

/**
 * Compute the aggregated health status from a set of signals.
 *
 * Rules (highest severity wins):
 *  1. Any "error"   → "unhealthy"
 *  2. Any "unknown" → "degraded"    (unknown is NEVER healthy)
 *  3. Any "warning" → "at_risk"
 *  4. All "ok"      → "healthy"
 *  5. Empty signal list → "degraded" (no data = not healthy)
 */
export function aggregateHealthStatus(signals: TourHealthSignal[]): TourHealthStatus {
  if (signals.length === 0) return "degraded"
  if (signals.some((s) => s.severity === "error")) return "unhealthy"
  if (signals.some((s) => s.severity === "unknown")) return "degraded"
  if (signals.some((s) => s.severity === "warning")) return "at_risk"
  return "healthy"
}

/**
 * Build the full health summary for a tour from a flat list of signals.
 */
export function buildTourHealthSummary(args: {
  tourId: string
  signals: TourHealthSignal[]
}): TourHealthSummary {
  const { tourId, signals } = args

  const errors = signals.filter((s) => s.severity === "error")
  const warnings = signals.filter((s) => s.severity === "warning")
  const unknown = signals.filter((s) => s.severity === "unknown")
  const stale = signals.filter((s) => s.is_stale)

  const evaluations = signals.map((s) => s.evaluated_at).sort()
  const oldest = evaluations[0] ?? null
  const newest = evaluations[evaluations.length - 1] ?? null

  return {
    tour_id: tourId,
    status: aggregateHealthStatus(signals),
    signals,
    errors,
    warnings,
    unknown,
    stale,
    oldest_evaluation: oldest,
    newest_evaluation: newest,
  }
}

// ---------------------------------------------------------------------------
// Threshold evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a threshold against an observed value and return the appropriate
 * severity. Useful when building signals from raw metric values.
 */
export function evaluateThreshold(
  threshold: HealthThreshold,
  observedValue: number | boolean | null,
): HealthSignalSeverity {
  if (observedValue === null) return "unknown"

  switch (threshold.type) {
    case "count_eq":
      return (observedValue as number) === threshold.value! ? "ok" : "error"
    case "count_lte":
      return (observedValue as number) <= threshold.value! ? "ok" : "error"
    case "count_gte":
      return (observedValue as number) >= threshold.value! ? "ok" : "error"
    case "bool_true":
      return observedValue === true ? "ok" : "error"
    case "bool_false":
      return observedValue === false ? "ok" : "error"
    case "age_minutes_lte":
      return (observedValue as number) <= threshold.value! ? "ok" : "warning"
  }
}

// ---------------------------------------------------------------------------
// Freshness helper
// ---------------------------------------------------------------------------

/**
 * Determine if a signal is stale given a max age in minutes.
 * A signal with no evaluated_at is always stale.
 */
export function isSignalStale(
  evaluatedAt: string | null,
  maxAgeMinutes: number,
  nowIso?: string,
): boolean {
  if (!evaluatedAt) return true
  const now = new Date(nowIso ?? new Date().toISOString()).getTime()
  const evaluated = new Date(evaluatedAt).getTime()
  const ageMinutes = (now - evaluated) / (1000 * 60)
  return ageMinutes > maxAgeMinutes
}

// ---------------------------------------------------------------------------
// Signal factory helpers
// ---------------------------------------------------------------------------

/**
 * Build a health signal, computing severity from threshold + observed value.
 */
export function buildSignal(args: {
  signal_id: string
  label: string
  source: HealthSignalDomain
  owner: HealthSignalDomain
  threshold: HealthThreshold
  observedValue: number | boolean | null
  evaluated_at: string
  maxAgeMinutes?: number
  remediationUrl: string
  detail?: string | null
  nowIso?: string
}): TourHealthSignal {
  const severity = evaluateThreshold(args.threshold, args.observedValue)
  const is_stale = isSignalStale(
    args.evaluated_at,
    args.maxAgeMinutes ?? 60,
    args.nowIso,
  )

  return {
    signal_id: args.signal_id,
    label: args.label,
    source: args.source,
    severity,
    threshold: args.threshold,
    observed_value: args.observedValue,
    owner: args.owner,
    evaluated_at: args.evaluated_at,
    is_stale,
    remediationUrl: args.remediationUrl,
    detail: args.detail ?? null,
  }
}

// ---------------------------------------------------------------------------
// Domain filter helpers
// ---------------------------------------------------------------------------

/** Filter signals by domain. */
export function signalsByDomain(
  signals: TourHealthSignal[],
  domain: HealthSignalDomain,
): TourHealthSignal[] {
  return signals.filter((s) => s.source === domain)
}

/** Get the worst severity for a given domain. */
export function domainHealthStatus(
  signals: TourHealthSignal[],
  domain: HealthSignalDomain,
): TourHealthStatus {
  const domainSignals = signalsByDomain(signals, domain)
  return aggregateHealthStatus(domainSignals)
}
