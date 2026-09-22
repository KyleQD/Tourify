/**
 * Admin Data State Contract
 *
 * Unified data state model for all Admin domains.
 * Fixes: AUX-STATE-001, AUX-DASH-005, AUX-FIN-001, AUX-LOG-003,
 *        AUX-TIX-004, AUX-ANL-001, AUX-EVT-006, AUX-TOUR-009,
 *        AUX-FLOW-006, AUX-STATE-002, AUX-STATE-003
 *
 * Every significant dataset resolves to one of these states.
 * Failed primary data must NEVER be converted to valid-looking zero/empty.
 */

export type AdminDataState<T = unknown> =
  | { status: "loading" }
  | { status: "ready"; data: T; freshness?: AdminFreshness }
  | { status: "true-empty"; data: T; freshness?: AdminFreshness }
  | { status: "filtered-empty"; data: T; filters: Record<string, unknown>; freshness?: AdminFreshness }
  | { status: "stale"; data: T; lastUpdatedAt: string; freshness?: AdminFreshness }
  | { status: "degraded"; data?: T; unavailableSources: string[]; lastUpdatedAt?: string; freshness?: AdminFreshness }
  | { status: "denied"; reason?: string; requiredCapability?: string }
  | { status: "unavailable"; error?: string; retryable?: boolean; retry?: () => void };

export type AdminFreshness =
  | { state: "live" }
  | { state: "updated"; at: string }
  | { state: "stale"; at: string }
  | { state: "partial"; at?: string }
  | { state: "offline"; at?: string };

export type AdminMetricState<T = number> =
  | { status: "loading"; label?: string }
  | { status: "ready"; value: T; label?: string; scope?: string; coverage?: "full" | "partial" | "page-only"; freshness?: AdminFreshness }
  | { status: "unavailable"; label?: string; reason?: string; retry?: () => void }
  | { status: "degraded"; value?: T; label?: string; unavailableSources: string[]; freshness?: AdminFreshness };

/**
 * Error scope levels — prevents action errors from becoming page errors
 * and prevents page errors from being silently demoted to empty data.
 */
export type AdminErrorScope =
  | { scope: "field"; field: string; message: string }
  | { scope: "action"; action: string; message: string; retryable?: boolean; retry?: () => void }
  | { scope: "panel"; panel: string; message: string; retryable?: boolean; retry?: () => void }
  | { scope: "page"; message: string; retryable?: boolean; retry?: () => void }
  | { scope: "fatal"; message: string };

// ─── State Constructors ──────────────────────────────────────────────

export function loading<T>(): AdminDataState<T> {
  return { status: "loading" };
}

export function ready<T>(data: T, freshness?: AdminFreshness): AdminDataState<T> {
  return { status: "ready", data, freshness };
}

export function trueEmpty<T>(data: T, freshness?: AdminFreshness): AdminDataState<T> {
  return { status: "true-empty", data, freshness };
}

export function filteredEmpty<T>(data: T, filters: Record<string, unknown>, freshness?: AdminFreshness): AdminDataState<T> {
  return { status: "filtered-empty", data, filters, freshness };
}

export function stale<T>(data: T, lastUpdatedAt: string, freshness?: AdminFreshness): AdminDataState<T> {
  return { status: "stale", data, lastUpdatedAt, freshness };
}

export function degraded<T>(data: T | undefined, unavailableSources: string[], lastUpdatedAt?: string, freshness?: AdminFreshness): AdminDataState<T> {
  return { status: "degraded", data, unavailableSources, lastUpdatedAt, freshness };
}

export function denied<T>(reason?: string, requiredCapability?: string): AdminDataState<T> {
  return { status: "denied", reason, requiredCapability };
}

export function unavailable<T>(error?: string, retryable = true, retry?: () => void): AdminDataState<T> {
  return { status: "unavailable", error, retryable, retry };
}

// ─── Metric State Constructors ───────────────────────────────────────

export function metricLoading(label?: string): AdminMetricState {
  return { status: "loading", label };
}

export function metricReady(value: number, opts?: { label?: string; scope?: string; coverage?: "full" | "partial" | "page-only"; freshness?: AdminFreshness }): AdminMetricState {
  return { status: "ready", value, ...opts };
}

export function metricUnavailable(label?: string, reason?: string, retry?: () => void): AdminMetricState {
  return { status: "unavailable", label, reason, retry };
}

export function metricDegraded(value: number | undefined, unavailableSources: string[], opts?: { label?: string; freshness?: AdminFreshness }): AdminMetricState {
  return { status: "degraded", value, unavailableSources, ...opts };
}

// ─── State Guards ────────────────────────────────────────────────────

export function isLoading<T>(state: AdminDataState<T>): state is { status: "loading" } {
  return state.status === "loading";
}

export function isReady<T>(state: AdminDataState<T>): state is { status: "ready"; data: T; freshness?: AdminFreshness } {
  return state.status === "ready";
}

export function isTrueEmpty<T>(state: AdminDataState<T>): state is { status: "true-empty"; data: T } {
  return state.status === "true-empty";
}

export function isFilteredEmpty<T>(state: AdminDataState<T>): state is { status: "filtered-empty"; data: T; filters: Record<string, unknown> } {
  return state.status === "filtered-empty";
}

export function isStale<T>(state: AdminDataState<T>): state is { status: "stale"; data: T; lastUpdatedAt: string } {
  return state.status === "stale";
}

export function isDegraded<T>(state: AdminDataState<T>): state is { status: "degraded"; data?: T; unavailableSources: string[] } {
  return state.status === "degraded";
}

export function isDenied<T>(state: AdminDataState<T>): state is { status: "denied"; reason?: string } {
  return state.status === "denied";
}

export function isUnavailable<T>(state: AdminDataState<T>): state is { status: "unavailable"; error?: string; retryable?: boolean } {
  return state.status === "unavailable";
}

export function hasData<T>(state: AdminDataState<T>): state is { status: "ready"; data: T } | { status: "stale"; data: T } | { status: "degraded"; data: T } | { status: "true-empty"; data: T } | { status: "filtered-empty"; data: T } {
  return "data" in state && state.data !== undefined;
}

// ─── Freshness Helpers ───────────────────────────────────────────────

export function formatFreshness(freshness?: AdminFreshness): string {
  if (!freshness) return "";
  switch (freshness.state) {
    case "live": return "Live";
    case "updated": {
      const diff = Date.now() - new Date(freshness.at).getTime();
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return `Updated ${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Updated ${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `Updated ${hours}h ago`;
    }
    case "stale": return `Stale since ${new Date(freshness.at).toLocaleTimeString()}`;
    case "partial": return "Partial data";
    case "offline": return "Offline";
  }
}

export function isLive(freshness?: AdminFreshness): boolean {
  return freshness?.state === "live";
}

export function isStaleFreshness(freshness?: AdminFreshness): boolean {
  return freshness?.state === "stale" || freshness?.state === "offline";
}

// ─── API Response to State Mapping ───────────────────────────────────

/**
 * Safely convert a fetch response to an AdminDataState.
 * NEVER converts failures to legitimate-looking empty/zero.
 */
export async function responseToState<T>(
  response: Promise<Response>,
  options?: {
    transform?: (json: unknown) => T;
    emptyCheck?: (data: T) => boolean;
    retry?: () => void;
  }
): Promise<AdminDataState<T>> {
  try {
    const res = await response;

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return denied(
          res.status === 401 ? "Authentication required" : "Insufficient permissions"
        );
      }
      return unavailable(`Request failed (${res.status})`, res.status >= 500, options?.retry);
    }

    const json = await res.json();
    const data = options?.transform ? options.transform(json) : (json as T);

    if (options?.emptyCheck?.(data)) {
      return trueEmpty(data);
    }

    return ready(data);
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : "Network error",
      true,
      options?.retry
    );
  }
}

/**
 * Convert a fetch error to degraded state, preserving any existing data.
 */
export function toDegraded<T>(
  currentState: AdminDataState<T>,
  failedSource: string,
  lastUpdatedAt?: string
): AdminDataState<T> {
  if (hasData(currentState)) {
    return degraded(
      currentState.data,
      [failedSource],
      lastUpdatedAt,
      currentState.freshness
    );
  }
  return unavailable(`Source "${failedSource}" failed`, true);
}

/**
 * NEVER use this for real data. Only for truly optional/derived metrics
 * where zero is a legitimate value when the source is absent.
 */
export function optionalMetricFallback(value: number | null | undefined, fallback: number = 0): number {
  return value ?? fallback;
}
