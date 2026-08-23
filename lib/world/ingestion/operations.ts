/**
 * P15 — ingestion operations domain (pure, deterministic).
 *
 * Provider scheduling policy, bounded retries, dead-letter summaries,
 * per-provider kill switches, and candidate dedupe keys. No I/O: the runner
 * and console consume these rules; tests pin them.
 */

// ─── Providers (P15-T10 common staging contract) ─────────────────────────

export const INGESTION_PROVIDERS = ["musicbrainz", "radio-browser"] as const
export type IngestionProvider = (typeof INGESTION_PROVIDERS)[number]

export function isIngestionProvider(value: string): value is IngestionProvider {
  return (INGESTION_PROVIDERS as readonly string[]).includes(value)
}

/** Job kinds separate identity refresh from health refresh (P15-T05). */
export const INGESTION_JOB_KINDS = ["identity_refresh", "health_refresh"] as const
export type IngestionJobKind = (typeof INGESTION_JOB_KINDS)[number]

// ─── Kill switches / feature flags (P15-T07) ─────────────────────────────

/**
 * Fail-closed: a provider runs only when its env flag is explicitly "true".
 * `WORLD_INGEST_<PROVIDER>_ENABLED` with the provider uppercased and
 * non-alphanumerics underscored (e.g. WORLD_INGEST_RADIO_BROWSER_ENABLED).
 * An optional global kill switch (`WORLD_INGEST_KILLED=true`) wins over
 * everything so operators can stop all collection in one move.
 */
export function providerEnvFlagName(provider: IngestionProvider): string {
  return `WORLD_INGEST_${provider.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_ENABLED`
}

export interface SwitchBoard {
  get(name: string): string | undefined | null
}

const PROCESS_BOARD: Pick<SwitchBoard, "get"> = {
  get: (name: string) => process.env[name],
}

function asBoard(env: NodeJS.ProcessEnv | Pick<SwitchBoard, "get">): Pick<SwitchBoard, "get"> {
  return typeof (env as Pick<SwitchBoard, "get">).get === "function"
    ? (env as Pick<SwitchBoard, "get">)
    : { get: (name) => (env as NodeJS.ProcessEnv)[name] }
}

export function providerEnabled(
  provider: IngestionProvider,
  env: Pick<SwitchBoard, "get"> = PROCESS_BOARD,
): boolean {
  const board = asBoard(env)
  if ((board.get("WORLD_INGEST_KILLED") ?? "").toLowerCase() === "true") return false
  return (board.get(providerEnvFlagName(provider)) ?? "").toLowerCase() === "true"
}

// ─── Scheduling policy (P15-T03) ──────────────────────────────────────────

export interface SchedulePolicyEntry {
  jobKind: IngestionJobKind
  /** Minimum interval between runs — never faster than source-safe cadence. */
  minIntervalMs: number
  /** Human-readable rationale recorded in run metadata. */
  rationale: string
}

const HOUR = 3600_000
const DAY = 24 * HOUR

/** Frozen policy: MusicBrainz is generous but rate-limited; Radio-Browser is community-hosted. */
export const SCHEDULE_POLICY: Readonly<
  Record<IngestionProvider, Readonly<Record<IngestionJobKind, SchedulePolicyEntry>>>
> = Object.freeze({
  // Entries use explicit jobKind literals to satisfy the frozen policy type.
  musicbrainz: Object.freeze({
    identity_refresh: {
      jobKind: "identity_refresh" as const,
      minIntervalMs: DAY,
      rationale: "MusicBrainz metadata changes slowly; daily refresh respects the live-data mirror.",
    },
    health_refresh: {
      jobKind: "health_refresh" as const,
      minIntervalMs: DAY,
      rationale: "MusicBrainz has no station health concept; identity cadence applies.",
    },
  }),
  "radio-browser": Object.freeze({
    identity_refresh: {
      jobKind: "identity_refresh" as const,
      minIntervalMs: 12 * HOUR,
      rationale: "Community directory churns moderately; twice-daily stays polite.",
    },
    health_refresh: {
      jobKind: "health_refresh" as const,
      minIntervalMs: HOUR,
      rationale: "Station uptime changes hourly; health checks are cheap HEAD-style lookups.",
    },
  }),
})

export type ScheduleDecision =
  | { due: true; nextWatermarkFrom: number }
  | { due: false; reason: "killed" | "disabled" | "before_min_interval"; retryInMs: number }

/**
 * Decide whether a scheduled job may run now. Deterministic given explicit
 * `now` and last-run watermark.
 */
export function decideSchedule(
  provider: IngestionProvider,
  jobKind: IngestionJobKind,
  opts: {
    nowMs: number
    lastRunAtMs: number | null
    board?: Pick<SwitchBoard, "get">
  },
): ScheduleDecision {
  const board = asBoard(opts.board ?? process.env)
  if (!providerEnabled(provider, board)) {
    return { due: false, reason: providerKilledOrDisabled(board), retryInMs: Number.POSITIVE_INFINITY }
  }
  const policy = SCHEDULE_POLICY[provider][jobKind]
  const elapsed = opts.lastRunAtMs === null ? Number.POSITIVE_INFINITY : opts.nowMs - opts.lastRunAtMs
  if (elapsed < policy.minIntervalMs) {
    return { due: false, reason: "before_min_interval", retryInMs: policy.minIntervalMs - elapsed }
  }
  return { due: true, nextWatermarkFrom: opts.nowMs }
}

function providerKilledOrDisabled(board: Pick<SwitchBoard, "get">): "killed" | "disabled" {
  return (board.get("WORLD_INGEST_KILLED") ?? "").toLowerCase() === "true" ? "killed" : "disabled"
}

// ─── Bounded retries + dead letters (P15-T04) ─────────────────────────────

export const RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  baseBackoffMs: 1200,
  maxBackoffMs: 30_000,
})

/** Exponential backoff capped at max. Attempt is 1-based. */
export function backoffForAttempt(attempt: number): number {
  const clamped = Math.max(1, Math.floor(attempt))
  const raw = RETRY_POLICY.baseBackoffMs * 2 ** (clamped - 1)
  return Math.min(raw, RETRY_POLICY.maxBackoffMs)
}

export interface DeadLetter<T = unknown> {
  recordId: string
  reason: string
  attempts: number
  payload: T
  firstFailedAt: string
  lastFailedAt: string
}

/**
 * Fold one failed attempt into a dead-letter entry (pure). Records that
 * exhaust `maxAttempts` stay here for operator review/retry — never silently
 * dropped, never auto-published.
 */
export function foldDeadLetter<T>(
  existing: DeadLetter<T> | null,
  recordId: string,
  reason: string,
  payload: T,
  nowIso: string,
): DeadLetter<T> {
  if (!existing) {
    return {
      recordId,
      reason,
      attempts: 1,
      payload,
      firstFailedAt: nowIso,
      lastFailedAt: nowIso,
    }
  }
  return {
    ...existing,
    reason,
    attempts: existing.attempts + 1,
    lastFailedAt: nowIso,
  }
}

export function isDead(existing: DeadLetter<unknown> | null): boolean {
  return existing !== null && existing.attempts >= RETRY_POLICY.maxAttempts
}

/** Compact error summary for run rows / console display. */
export function summarizeDeadLetters(letters: ReadonlyArray<DeadLetter<unknown>>): Array<{
  reason: string
  count: number
}> {
  const byReason = new Map<string, number>()
  for (const letter of letters) {
    byReason.set(letter.reason, (byReason.get(letter.reason) ?? 0) + 1)
  }
  return [...byReason.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([reason, count]) => ({ reason, count }))
}

// ─── Cursors / watermarks (P15-T02) ───────────────────────────────────────

export interface ProviderCursorState {
  provider: IngestionProvider
  jobKind: IngestionJobKind
  /** Opaque upstream position (page/browse offset/last timestamp). */
  cursor: string | null
  /** Last successful run start (ms epoch). */
  lastRunAtMs: number | null
  updated_at: string
}

export function initialCursorState(provider: IngestionProvider, jobKind: IngestionJobKind): ProviderCursorState {
  return { provider, jobKind, cursor: null, lastRunAtMs: null, updated_at: new Date().toISOString() }
}

/**
 * Advance a durable cursor after a successful run. Idempotent for identical
 * inputs; watermark only moves forward.
 */
export function advanceCursor(
  state: ProviderCursorState,
  next: { cursor: string | null; ranAtMs: number },
): ProviderCursorState {
  return {
    ...state,
    cursor: next.cursor,
    lastRunAtMs:
      state.lastRunAtMs === null || next.ranAtMs > state.lastRunAtMs ? next.ranAtMs : state.lastRunAtMs,
    updated_at: new Date().toISOString(),
  }
}

// ─── Candidate duplication detection (P15-T06) ───────────────────────────

/**
 * Stable natural identity for a provider record. The staging table already
 * enforces unique (source_id, entity_kind, external_record_id); this key is
 * the application-level mirror used to skip work before insert.
 */
export function stableProviderRecordId(
  provider: IngestionProvider,
  entityKind: string,
  externalRecordId: string,
): string {
  const ext = externalRecordId?.trim()
  if (!ext) throw new Error("dedupe_requires_external_record_id")
  return `${provider}|${entityKind}|${ext}`
}

/**
 * Normalized alias set for fuzzy duplicate checks (same station/artist under
 * spelling variants). Deterministic: lowercase, diacritic-folded,
 * non-alphanumerics collapsed. Empty strings produce no aliases.
 */
export function normalizedAliases(name: string): string[] {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  if (!base) return []
  const aliases = new Set<string>([base])
  // Common radio suffixes are noise across directory variants.
  const withoutSuffix = base.replace(/\s*(fm|am|radio|the)\b/g, "").trim()
  if (withoutSuffix) aliases.add(withoutSuffix.replace(/\s+/g, " "))
  return [...aliases].sort()
}

/** True when two names collapse to the same normalized alias. */
export function aliasesCollide(a: string, b: string): boolean {
  const left = normalizedAliases(a)
  const right = new Set(normalizedAliases(b))
  return left.some((alias) => right.has(alias))
}
