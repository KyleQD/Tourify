/**
 * P4-T07 — form-level location telemetry.
 * Coarse outcome counters ONLY: selected / unresolved / abandoned / ambiguous.
 * Never records the query text, coordinates, or any identity.
 */
export type PlacePickerOutcome =
  | "selected"
  | "unresolved_submitted"
  | "abandoned"
  | "ambiguous_shown"

export interface PlacePickerEvent {
  outcome: PlacePickerOutcome
  resultCount?: number | undefined
}

export type PlacePickerSink = (event: PlacePickerEvent) => void

export function createPlacePickerTelemetry(sink: PlacePickerSink | null) {
  return {
    record(event: PlacePickerEvent): void {
      if (!sink) return
      // Hard scrub: only whitelisted keys survive.
      const safe: Record<string, unknown> = { outcome: event.outcome }
      if (typeof event.resultCount === "number" && Number.isFinite(event.resultCount)) {
        safe.resultCount = event.resultCount
      }
      sink(safe as unknown as PlacePickerEvent)
    },
  }
}
