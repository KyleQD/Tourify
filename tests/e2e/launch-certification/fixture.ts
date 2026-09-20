import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export const CERTIFICATION_AREAS = [
  "authentication",
  "personas",
  "discovery",
  "events",
  "ticketing",
  "marketplace",
  "messaging",
  "uploads",
  "account-deletion",
  "negative-authorization",
  "replay",
  "concurrency",
] as const

export type CertificationArea = (typeof CERTIFICATION_AREAS)[number]

export interface ActorFixture {
  emailEnv: string
  passwordEnv: string
}

export interface JsonAssertion {
  path: string
  equals?: unknown
  contains?: string
  exists?: boolean
}

export interface RequestStep {
  name: string
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  body?: unknown
  rawBody?: string
  headers?: Record<string, string>
  stripeSigningSecretEnv?: string
  expectedStatuses: number[]
  assertions?: JsonAssertion[]
  capture?: Record<string, string>
}

export interface BrowserJourney {
  name: string
  area: CertificationArea
  path: string
  actor?: string
  expectedUrl?: string
  expectedText?: string
  accessibility?: boolean
  responsive?: boolean
  performanceBudgetMs?: number
}

interface BaseApiScenario {
  name: string
  area: CertificationArea
  actor?: string
}

export interface SequenceScenario extends BaseApiScenario {
  mode: "sequence"
  steps: RequestStep[]
}

export interface ReplayScenario extends BaseApiScenario {
  mode: "replay"
  request: RequestStep
  repetitions: number
  finalAssertions?: JsonAssertion[]
}

export interface ConcurrencyScenario extends BaseApiScenario {
  mode: "concurrency"
  request: RequestStep
  attempts: number
  expectedStatusCounts: Record<string, number>
  stableJsonPaths?: string[]
}

export type ApiScenario = SequenceScenario | ReplayScenario | ConcurrencyScenario

export interface LaunchCertificationFixture {
  schemaVersion: 1
  release: {
    expectedShaEnv: string
    probe: {
      path: string
      expectedStatus: number
      shaHeader?: string
      shaJsonPath?: string
    }
  }
  supabase: {
    urlEnv: string
    anonKeyEnv: string
  }
  actors: Record<string, ActorFixture>
  browserJourneys: BrowserJourney[]
  apiScenarios: ApiScenario[]
}

const TEMPLATE = /\{\{(env|capture)\.([A-Za-z0-9_.-]+)\}\}/g
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Launch certification fixture invalid: ${message}`)
}

function requireString(value: unknown, path: string) {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be a non-empty string`)
}

function validateStep(step: RequestStep, path: string) {
  assert(step && typeof step === "object", `${path} must be an object`)
  requireString(step.name, `${path}.name`)
  assert(HTTP_METHODS.has(step.method), `${path}.method is not supported`)
  requireString(step.path, `${path}.path`)
  assert(step.path.startsWith("/"), `${path}.path must be relative to the certified base URL`)
  assert(Array.isArray(step.expectedStatuses) && step.expectedStatuses.length > 0, `${path}.expectedStatuses is required`)
  assert(
    step.expectedStatuses.every((status) => Number.isInteger(status) && status >= 100 && status <= 599),
    `${path}.expectedStatuses contains an invalid HTTP status`,
  )
  assert(!(step.body !== undefined && step.rawBody !== undefined), `${path} cannot define both body and rawBody`)
  if (step.stripeSigningSecretEnv) {
    requireString(step.stripeSigningSecretEnv, `${path}.stripeSigningSecretEnv`)
    assert(step.rawBody !== undefined, `${path}.rawBody is required for Stripe signing`)
  }
  for (const [header, value] of Object.entries(step.headers ?? {})) {
    requireString(header, `${path}.headers key`)
    requireString(value, `${path}.headers.${header}`)
  }
  for (const [capture, jsonPath] of Object.entries(step.capture ?? {})) {
    requireString(capture, `${path}.capture key`)
    requireString(jsonPath, `${path}.capture.${capture}`)
  }
  for (const [index, assertion] of (step.assertions ?? []).entries()) {
    requireString(assertion.path, `${path}.assertions[${index}].path`)
    assert(
      assertion.exists !== undefined ||
        assertion.contains !== undefined ||
        Object.prototype.hasOwnProperty.call(assertion, "equals"),
      `${path}.assertions[${index}] must define exists, contains, or equals`,
    )
  }
}

export function validateLaunchCertificationFixture(value: unknown): LaunchCertificationFixture {
  assert(value && typeof value === "object", "root must be an object")
  const fixture = value as LaunchCertificationFixture
  assert(fixture.schemaVersion === 1, "schemaVersion must be 1")
  requireString(fixture.release?.expectedShaEnv, "release.expectedShaEnv")
  requireString(fixture.release?.probe?.path, "release.probe.path")
  assert(fixture.release.probe.path.startsWith("/"), "release.probe.path must be relative")
  assert(
    Number.isInteger(fixture.release.probe.expectedStatus) &&
      fixture.release.probe.expectedStatus >= 100 &&
      fixture.release.probe.expectedStatus <= 599,
    "release.probe.expectedStatus must be an HTTP status",
  )
  assert(
    Boolean(fixture.release.probe.shaHeader) !== Boolean(fixture.release.probe.shaJsonPath),
    "release.probe must define exactly one of shaHeader or shaJsonPath",
  )
  if (fixture.release.probe.shaHeader)
    requireString(fixture.release.probe.shaHeader, "release.probe.shaHeader")
  if (fixture.release.probe.shaJsonPath)
    requireString(fixture.release.probe.shaJsonPath, "release.probe.shaJsonPath")
  requireString(fixture.supabase?.urlEnv, "supabase.urlEnv")
  requireString(fixture.supabase?.anonKeyEnv, "supabase.anonKeyEnv")
  assert(fixture.actors && typeof fixture.actors === "object", "actors is required")
  assert(Array.isArray(fixture.browserJourneys), "browserJourneys must be an array")
  assert(Array.isArray(fixture.apiScenarios), "apiScenarios must be an array")

  for (const [name, actor] of Object.entries(fixture.actors)) {
    requireString(name, "actors key")
    requireString(actor.emailEnv, `actors.${name}.emailEnv`)
    requireString(actor.passwordEnv, `actors.${name}.passwordEnv`)
  }

  for (const [index, journey] of fixture.browserJourneys.entries()) {
    const path = `browserJourneys[${index}]`
    requireString(journey.name, `${path}.name`)
    requireString(journey.path, `${path}.path`)
    assert(journey.path.startsWith("/"), `${path}.path must be relative`)
    assert(CERTIFICATION_AREAS.includes(journey.area), `${path}.area is not supported`)
    if (journey.actor) assert(Boolean(fixture.actors[journey.actor]), `${path}.actor is not declared`)
    if (journey.performanceBudgetMs !== undefined)
      assert(journey.performanceBudgetMs > 0, `${path}.performanceBudgetMs must be positive`)
  }

  for (const [index, scenario] of fixture.apiScenarios.entries()) {
    const path = `apiScenarios[${index}]`
    requireString(scenario.name, `${path}.name`)
    assert(CERTIFICATION_AREAS.includes(scenario.area), `${path}.area is not supported`)
    if (scenario.actor) assert(Boolean(fixture.actors[scenario.actor]), `${path}.actor is not declared`)
    if (scenario.mode === "sequence") {
      assert(scenario.steps.length > 0, `${path}.steps must not be empty`)
      scenario.steps.forEach((step, stepIndex) => validateStep(step, `${path}.steps[${stepIndex}]`))
    } else if (scenario.mode === "replay") {
      validateStep(scenario.request, `${path}.request`)
      assert(scenario.repetitions >= 2, `${path}.repetitions must be at least 2`)
    } else if (scenario.mode === "concurrency") {
      validateStep(scenario.request, `${path}.request`)
      assert(scenario.attempts >= 2, `${path}.attempts must be at least 2`)
      for (const [status, count] of Object.entries(scenario.expectedStatusCounts)) {
        assert(/^\d{3}$/.test(status) && Number(status) >= 100 && Number(status) <= 599, `${path}.expectedStatusCounts has an invalid status`)
        assert(Number.isInteger(count) && count > 0, `${path}.expectedStatusCounts values must be positive integers`)
      }
      const expectedTotal = Object.values(scenario.expectedStatusCounts).reduce((sum, count) => sum + count, 0)
      assert(expectedTotal === scenario.attempts, `${path}.expectedStatusCounts must total attempts`)
      for (const jsonPath of scenario.stableJsonPaths ?? [])
        requireString(jsonPath, `${path}.stableJsonPaths entry`)
    } else {
      throw new Error(`Launch certification fixture invalid: ${path}.mode is not supported`)
    }
  }

  const coveredAreas = new Set<CertificationArea>([
    ...fixture.browserJourneys.map((journey) => journey.area),
    ...fixture.apiScenarios.map((scenario) => scenario.area),
  ])
  for (const area of CERTIFICATION_AREAS)
    assert(coveredAreas.has(area), `missing required ${area} coverage`)

  assert(
    fixture.browserJourneys.some((journey) => journey.accessibility),
    "at least one browser journey must enable accessibility",
  )
  assert(
    fixture.browserJourneys.some((journey) => journey.responsive),
    "at least one browser journey must enable responsive coverage",
  )
  assert(
    fixture.browserJourneys.some((journey) => journey.performanceBudgetMs),
    "at least one browser journey must define a performance budget",
  )
  return fixture
}

export function assertCertificationFixtureReady(fixture: LaunchCertificationFixture) {
  const serialized = JSON.stringify(fixture)
  assert(!/replace with|placeholder|todo\b|example\.invalid/i.test(serialized), "fixture contains placeholder content")

  const usedActors = new Set([
    ...fixture.browserJourneys.map((journey) => journey.actor).filter(Boolean),
    ...fixture.apiScenarios.map((scenario) => scenario.actor).filter(Boolean),
  ])
  for (const actor of Object.keys(fixture.actors))
    assert(usedActors.has(actor), `actor ${actor} is declared but has no certification coverage`)

  const replay = fixture.apiScenarios.find((scenario) => scenario.area === "replay")
  assert(replay?.mode === "replay", "replay coverage must use replay mode")
  assert(Boolean(replay.request.stripeSigningSecretEnv), "replay coverage must sign its webhook request")
  assert(Boolean(replay.request.rawBody), "replay coverage must send a stable raw webhook body")
  assert((replay.finalAssertions ?? []).length > 0, "replay coverage must assert the persisted duplicate result")

  const concurrency = fixture.apiScenarios.find((scenario) => scenario.area === "concurrency")
  assert(concurrency?.mode === "concurrency", "concurrency coverage must use concurrency mode")
  assert(
    Object.keys(concurrency.expectedStatusCounts).length >= 2,
    "concurrency coverage must distinguish the winning and losing outcomes",
  )

  const negativeAuthorization = fixture.apiScenarios.find(
    (scenario) => scenario.area === "negative-authorization",
  )
  assert(negativeAuthorization?.actor, "negative authorization coverage must use an authenticated actor")
  return fixture
}

let cachedFixture: LaunchCertificationFixture | undefined

export function loadLaunchCertificationFixture() {
  if (cachedFixture) return cachedFixture
  const configuredPath = process.env.QA_CERT_FIXTURE_PATH
  assert(configuredPath, "QA_CERT_FIXTURE_PATH is required")
  const fixturePath = resolve(process.cwd(), configuredPath)
  assert(existsSync(fixturePath), `fixture does not exist: ${fixturePath}`)
  cachedFixture = validateLaunchCertificationFixture(JSON.parse(readFileSync(fixturePath, "utf8")))
  return cachedFixture
}

export function requiredEnvironment(fixture: LaunchCertificationFixture) {
  const names = new Set<string>([
    fixture.release.expectedShaEnv,
    fixture.supabase.urlEnv,
    fixture.supabase.anonKeyEnv,
  ])
  for (const actor of Object.values(fixture.actors)) {
    names.add(actor.emailEnv)
    names.add(actor.passwordEnv)
  }
  const serialized = JSON.stringify(fixture)
  for (const match of serialized.matchAll(TEMPLATE)) if (match[1] === "env") names.add(match[2])
  for (const scenario of fixture.apiScenarios) {
    const steps = scenario.mode === "sequence" ? scenario.steps : [scenario.request]
    for (const step of steps) if (step.stripeSigningSecretEnv) names.add(step.stripeSigningSecretEnv)
  }
  return [...names].sort()
}

export function expandTemplates<T>(value: T, captures: Record<string, unknown>): T {
  if (typeof value === "string") {
    return value.replace(TEMPLATE, (_token, source: "env" | "capture", key: string) => {
      const resolved = source === "env" ? process.env[key] : readJsonPath(captures, key)
      assert(resolved !== undefined && resolved !== null, `template ${source}.${key} is unresolved`)
      return String(resolved)
    }) as T
  }
  if (Array.isArray(value)) return value.map((item) => expandTemplates(item, captures)) as T
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, expandTemplates(item, captures)]),
    ) as T
  }
  return value
}

export function readJsonPath(value: unknown, path: string): unknown {
  if (!path) return value
  return path.split(".").reduce<unknown>((current, part) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)]
    return (current as Record<string, unknown>)[part]
  }, value)
}
