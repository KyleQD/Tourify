import { createHmac } from "node:crypto"
import AxeBuilder from "@axe-core/playwright"
import { createClient } from "@supabase/supabase-js"
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test"
import {
  expandTemplates,
  readJsonPath,
  type ActorFixture,
  type JsonAssertion,
  type LaunchCertificationFixture,
  type RequestStep,
} from "./fixture"

export async function actorToken(fixture: LaunchCertificationFixture, actor: ActorFixture) {
  const supabaseUrl = process.env[fixture.supabase.urlEnv]!
  const anonKey = process.env[fixture.supabase.anonKeyEnv]!
  const email = process.env[actor.emailEnv]!
  const password = process.env[actor.passwordEnv]!
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  expect(error, `authentication failed for fixture actor ${actor.emailEnv}`).toBeNull()
  expect(data.session?.access_token, `actor ${actor.emailEnv} returned no access token`).toBeTruthy()
  return data.session!
}

export async function injectActorSession(
  context: BrowserContext,
  baseURL: string,
  fixture: LaunchCertificationFixture,
  actor: ActorFixture,
) {
  const session = await actorToken(fixture, actor)
  const url = new URL(baseURL)
  await context.clearCookies()
  await context.addCookies([
    {
      name: "sb-tourify-auth-token",
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ])
}

function stripeSignature(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000)
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex")
  return `t=${timestamp},v1=${digest}`
}

export function assertJsonAssertions(actual: unknown, assertions: JsonAssertion[] = []) {
  for (const assertion of assertions) {
    const selected = readJsonPath(actual, assertion.path)
    if (assertion.exists !== undefined)
      expect(selected !== undefined, `JSON path ${assertion.path} existence`).toBe(assertion.exists)
    if (Object.prototype.hasOwnProperty.call(assertion, "equals"))
      expect(selected, `JSON path ${assertion.path}`).toEqual(assertion.equals)
    if (assertion.contains !== undefined)
      expect(String(selected), `JSON path ${assertion.path}`).toContain(assertion.contains)
  }
}

export async function executeRequestStep(args: {
  request: APIRequestContext
  step: RequestStep
  token?: string
  captures: Record<string, unknown>
}) {
  const step = expandTemplates(args.step, args.captures)
  const headers: Record<string, string> = { ...step.headers }
  if (args.token) headers.authorization = `Bearer ${args.token}`
  if (step.stripeSigningSecretEnv) {
    const secret = process.env[step.stripeSigningSecretEnv]
    expect(secret, `${step.stripeSigningSecretEnv} is required`).toBeTruthy()
    expect(step.rawBody, `${step.name} requires rawBody for Stripe signing`).toBeDefined()
    headers["stripe-signature"] = stripeSignature(step.rawBody!, secret!)
  }
  const response = await args.request.fetch(step.path, {
    method: step.method,
    headers,
    data: step.rawBody ?? step.body,
  })
  const contentType = response.headers()["content-type"] ?? ""
  const responseBody = await response.text()
  expect(step.expectedStatuses, `${step.name} returned ${response.status()}: ${responseBody}`).toContain(response.status())
  const json = contentType.includes("application/json") && responseBody ? JSON.parse(responseBody) : undefined
  assertJsonAssertions(json, step.assertions)
  for (const [key, path] of Object.entries(step.capture ?? {})) {
    const value = readJsonPath(json, path)
    expect(value, `${step.name} capture ${key} from ${path}`).not.toBeUndefined()
    args.captures[key] = value
  }
  return { status: response.status(), json }
}

export async function assertAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
      .join("\n"),
  ).toEqual([])
}

export async function assertResponsive(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(overflow.content, `horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
    overflow.viewport + 1,
  )
}
