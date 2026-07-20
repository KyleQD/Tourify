import { createClient } from "@supabase/supabase-js"
import { config as loadDotenv } from "dotenv"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import type { BrowserContext } from "@playwright/test"

loadDotenv({ path: resolve(process.cwd(), ".env") })
loadDotenv({ path: resolve(process.cwd(), ".env.local"), override: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export interface FlowScenarioJob {
  id: string
  title: string
  templateName: string
  hireToken: string
  hirePath: string
}

export interface FlowScenario {
  tourId: string
  tourName: string
  teamId?: string
  urls: {
    tourBuilder?: string
    tourHub?: string
    hiring?: string
    hirePaths?: string[]
  }
  jobs: FlowScenarioJob[]
  baseUrl?: string
}

export function loadFlowScenario(): FlowScenario | null {
  const path = resolve(process.cwd(), "docs/audits/qa-flow-scenario.json")
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf8")) as FlowScenario
}

export function loadFlowAccounts(): Record<string, unknown> | null {
  const path = resolve(process.cwd(), "docs/audits/qa-flow-accounts.json")
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
}

export function flowCredentials(key: "artist1" | "artist2" | "artist3" | "org" | "worker1" | "worker2" | "worker3") {
  const map = {
    artist1: {
      email: process.env.QA_FLOW_ARTIST_1_EMAIL || "qa-flow-artist1@tourify.test",
      password: process.env.QA_FLOW_ARTIST_1_PASSWORD || "QaFlowPass123!",
    },
    artist2: {
      email: process.env.QA_FLOW_ARTIST_2_EMAIL || "qa-flow-artist2@tourify.test",
      password: process.env.QA_FLOW_ARTIST_2_PASSWORD || "QaFlowPass123!",
    },
    artist3: {
      email: process.env.QA_FLOW_ARTIST_3_EMAIL || "qa-flow-artist3@tourify.test",
      password: process.env.QA_FLOW_ARTIST_3_PASSWORD || "QaFlowPass123!",
    },
    org: {
      email: process.env.QA_FLOW_ORG_EMAIL || "qa-flow-org@tourify.test",
      password: process.env.QA_FLOW_ORG_PASSWORD || "QaFlowPass123!",
    },
    worker1: {
      email: process.env.QA_FLOW_WORKER_1_EMAIL || "qa-flow-worker1@tourify.test",
      password: process.env.QA_FLOW_WORKER_1_PASSWORD || "QaFlowPass123!",
    },
    worker2: {
      email: process.env.QA_FLOW_WORKER_2_EMAIL || "qa-flow-worker2@tourify.test",
      password: process.env.QA_FLOW_WORKER_2_PASSWORD || "QaFlowPass123!",
    },
    worker3: {
      email: process.env.QA_FLOW_WORKER_3_EMAIL || "qa-flow-worker3@tourify.test",
      password: process.env.QA_FLOW_WORKER_3_PASSWORD || "QaFlowPass123!",
    },
  } as const
  return map[key]
}

/** Inject Supabase session cookie for a flow cast member. */
export async function injectFlowSession(
  context: BrowserContext,
  baseURL: string,
  key: Parameters<typeof flowCredentials>[0],
) {
  if (!SUPABASE_URL || !SUPABASE_ANON)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY for flow auth")

  const { email, password } = flowCredentials(key)
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session)
    throw new Error(`Flow cookie login failed for ${email}: ${error?.message || "no session"}`)

  const url = new URL(baseURL)
  await context.clearCookies()
  await context.addCookies([
    {
      name: "sb-tourify-auth-token",
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      }),
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ])
}
