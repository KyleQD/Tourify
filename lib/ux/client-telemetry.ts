export type UxEventName =
  | "viewed"
  | "started"
  | "validation_failed"
  | "submitted"
  | "succeeded"
  | "failed"
  | "recovered"
  | "abandoned"

interface TrackUxEventInput {
  eventName: UxEventName
  flow: string
  route: string
  step?: string
  source?: string
  latencyBucket?: "under_100ms" | "100_300ms" | "300_1000ms" | "over_1000ms"
  errorCategory?:
    | "connection"
    | "expired_session"
    | "permission"
    | "validation"
    | "conflict"
    | "rate_limit"
    | "unavailable"
    | "removed"
    | "unknown"
  context?: Record<string, string | number | boolean | null>
}

export function trackUxEvent(input: TrackUxEventInput): void {
  void fetch("/api/ux/telemetry", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    // Telemetry must never block or alter the user's workflow.
  })
}
