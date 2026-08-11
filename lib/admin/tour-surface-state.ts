/**
 * TOUR-105 — Explicit portfolio / command-center surface states.
 *
 * Distinguishes permission, unavailable dependency, stale snapshot, empty,
 * and system error with retry + correlation support.
 */

import { mapAdminScopeError } from "@/lib/admin/admin-request"

export type TourSurfaceKind =
  | "loading"
  | "ready"
  | "empty"
  | "permission"
  | "unavailable_dependency"
  | "stale_snapshot"
  | "system_error"

export interface TourSurfaceState {
  kind: TourSurfaceKind
  title: string
  message: string
  correlationId: string | null
  canRetry: boolean
  actionHint?: string
}

export interface ClassifyTourSurfaceInput {
  status?: number | null
  code?: string | null
  message?: string | null
  correlationId?: string | null
  /** When true, payload loaded but marked stale/freshness miss. */
  isStale?: boolean
  /** True when the primary resource request succeeded. */
  ok?: boolean
  itemCount?: number
  isLoading?: boolean
}

const DEPENDENCY_CODES = new Set([
  "42P01",
  "PGRST204",
  "PGRST205",
  "dependency_unavailable",
  "unavailable_dependency",
  "service_unavailable",
])

export function readCorrelationId(response: Response | null | undefined): string | null {
  if (!response) return null
  return (
    response.headers.get("x-correlation-id")
    || response.headers.get("x-request-id")
    || null
  )
}

export function classifyTourSurfaceState(input: ClassifyTourSurfaceInput): TourSurfaceState {
  if (input.isLoading) {
    return {
      kind: "loading",
      title: "Loading",
      message: "Loading tour data…",
      correlationId: input.correlationId ?? null,
      canRetry: false,
    }
  }

  const status = input.status ?? null
  const code = input.code ?? null

  if (status === 401 || status === 403 || code === "capability_required" || code === "capability_denied") {
    const copy = mapAdminScopeError(status || 403, code, input.message)
    return {
      kind: "permission",
      title: copy.title,
      message: copy.message,
      correlationId: input.correlationId ?? null,
      canRetry: false,
      actionHint: copy.actionHint,
    }
  }

  if (
    status === 503
    || status === 502
    || (code && DEPENDENCY_CODES.has(code))
    || code === "dependency_unavailable"
  ) {
    return {
      kind: "unavailable_dependency",
      title: "Dependency unavailable",
      message:
        input.message
        || "A required service or data store is temporarily unavailable. Retry in a moment.",
      correlationId: input.correlationId ?? null,
      canRetry: true,
      actionHint: "Retry",
    }
  }

  if (input.isStale && input.ok) {
    return {
      kind: "stale_snapshot",
      title: "Snapshot may be stale",
      message:
        input.message
        || "This view is showing a cached or delayed snapshot. Refresh to pull the latest state.",
      correlationId: input.correlationId ?? null,
      canRetry: true,
      actionHint: "Refresh",
    }
  }

  if (input.ok === false || (status != null && status >= 400)) {
    const copy = mapAdminScopeError(status || 500, code, input.message)
    return {
      kind: "system_error",
      title: copy.title === "Unable to load" ? "System error" : copy.title,
      message: copy.message,
      correlationId: input.correlationId ?? null,
      canRetry: true,
      actionHint: "Retry",
    }
  }

  if ((input.itemCount ?? 0) === 0) {
    return {
      kind: "empty",
      title: "No records",
      message: input.message || "No tours match this view.",
      correlationId: input.correlationId ?? null,
      canRetry: false,
    }
  }

  return {
    kind: "ready",
    title: "Ready",
    message: "",
    correlationId: input.correlationId ?? null,
    canRetry: false,
  }
}

export async function classifyTourFetchFailure(response: Response): Promise<TourSurfaceState> {
  let message: string | null = null
  let code: string | null = null
  try {
    const payload = await response.clone().json()
    message = typeof payload?.error === "string" ? payload.error : null
    code = typeof payload?.code === "string" ? payload.code : null
  } catch {
    // ignore non-JSON
  }
  return classifyTourSurfaceState({
    status: response.status,
    code,
    message,
    correlationId: readCorrelationId(response),
    ok: false,
  })
}
