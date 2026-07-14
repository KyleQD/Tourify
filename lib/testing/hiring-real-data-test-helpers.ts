import type { Phase13CheckResult, Phase13ScenarioConfig, Phase13ScenarioKey } from "@/types/hiring-real-data-test"

export function pass(args: {
  scenarioKey: Phase13ScenarioKey | "global"
  name: string
  message: string
  metadata?: Record<string, unknown>
}): Phase13CheckResult {
  return { ...args, status: "pass" }
}

export function fail(args: {
  scenarioKey: Phase13ScenarioKey | "global"
  name: string
  message: string
  metadata?: Record<string, unknown>
}): Phase13CheckResult {
  return { ...args, status: "fail" }
}

export function warn(args: {
  scenarioKey: Phase13ScenarioKey | "global"
  name: string
  message: string
  metadata?: Record<string, unknown>
}): Phase13CheckResult {
  return { ...args, status: "warn" }
}

export function skip(args: {
  scenarioKey: Phase13ScenarioKey | "global"
  name: string
  message: string
  metadata?: Record<string, unknown>
}): Phase13CheckResult {
  return { ...args, status: "skip" }
}

export function buildEmployerQueryParams(scenario: Phase13ScenarioConfig): string {
  const params = new URLSearchParams({
    entity_type: scenario.employer.entityType,
    entity_id: scenario.employer.entityId,
  })

  if (scenario.employer.scope?.eventId) params.set("event_id", scenario.employer.scope.eventId)
  if (scenario.employer.scope?.tourId) params.set("tour_id", scenario.employer.scope.tourId)
  if (scenario.employer.scope?.venueId) params.set("venue_id", scenario.employer.scope.venueId)

  return params.toString()
}

export async function fetchJson(args: {
  url: string
  init?: RequestInit
  /** Override the global PHASE13_AUTH_BEARER_TOKEN for this specific request */
  actorToken?: string
}): Promise<{ ok: boolean; status: number; data: unknown; text: string }> {
  const authToken = args.actorToken || process.env.PHASE13_AUTH_BEARER_TOKEN || process.env.AUTH_BEARER_TOKEN
  const headers = new Headers(args.init?.headers)
  if (authToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${authToken}`)
  }

  const response = await fetch(args.url, { ...args.init, headers })
  const text = await response.text()

  try {
    return {
      ok: response.ok,
      status: response.status,
      data: text ? JSON.parse(text) : null,
      text,
    }
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      text,
    }
  }
}

export function summarizeResults(results: Phase13CheckResult[]) {
  return {
    total: results.length,
    passed: results.filter((result) => result.status === "pass").length,
    failed: results.filter((result) => result.status === "fail").length,
    warned: results.filter((result) => result.status === "warn").length,
    skipped: results.filter((result) => result.status === "skip").length,
  }
}
