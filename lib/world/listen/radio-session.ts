/**
 * P16-T05 — live radio session state machine (pure).
 *
 * Transient station errors trigger bounded automatic reconnects with a
 * fixed backoff; exhausting the budget lands in a terminal, honest
 * "unavailable" state. Rights denials are terminal immediately and never
 * retried (rights-resolved playback fails closed).
 */

export const MAX_RECONNECT_ATTEMPTS = 3
/** Backoff before each reconnect attempt, by attempt number. */
export const RECONNECT_BACKOFF_MS = [1_000, 5_000, 15_000] as const

export type RadioSessionState =
  | { phase: "idle" }
  | { phase: "connecting" }
  | { phase: "live" }
  | { phase: "reconnecting"; attempt: number; backoffMs: number }
  | { phase: "terminal"; reason: "unavailable" | "rights_denied" }

export type RadioSessionEvent =
  | "connect_requested"
  | "connected"
  | "transient_error"
  | "rights_denied"
  | "stopped"

/** Reduce one event. Deterministic; no I/O, no time reads. */
export function reduceRadioSession(state: RadioSessionState, event: RadioSessionEvent): RadioSessionState {
  if (state.phase === "terminal") return state // absorbing

  switch (event) {
    case "connect_requested":
      return { phase: "connecting" }
    case "connected":
      return { phase: "live" }
    case "rights_denied":
      return { phase: "terminal", reason: "rights_denied" }
    case "stopped":
      return { phase: "idle" }
    case "transient_error": {
      if (state.phase === "live" || state.phase === "connecting") {
        return { phase: "reconnecting", attempt: 1, backoffMs: RECONNECT_BACKOFF_MS[0] }
      }
      if (state.phase === "reconnecting") {
        if (state.attempt >= MAX_RECONNECT_ATTEMPTS) {
          return { phase: "terminal", reason: "unavailable" }
        }
        return {
          phase: "reconnecting",
          attempt: state.attempt + 1,
          backoffMs: RECONNECT_BACKOFF_MS[Math.min(state.attempt, RECONNECT_BACKOFF_MS.length - 1)],
        }
      }
      return state
    }
  }
}

/**
 * True when the current reconnect wait has elapsed and a retry should fire.
 * `elapsedMs` is injected so the reducer stays testable without fake timers.
 */
export function shouldAttemptReconnect(
  state: RadioSessionState & { phase: "reconnecting" },
  elapsedMs: number,
): boolean {
  return elapsedMs >= state.backoffMs
}
