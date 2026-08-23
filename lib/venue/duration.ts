// ─────────────────────────────────────────────────────────────────────────────
// VEN-077 — duration is canonical MINUTES across form/API/DB/UI.
// Single formatting helper so every surface renders identical semantics.
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize any persisted/legacy duration value to whole minutes. */
export function normalizeDurationMinutes(value: unknown, fallback = 120): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n)
}

/**
 * Human formatting for minute-based durations: `45m`, `2h`, `2h 30m`.
 * Deterministic and tested — never re-derive units at call sites.
 */
export function formatDurationMinutes(value: unknown, fallback = 120): string {
  const minutes = normalizeDurationMinutes(value, fallback)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}
