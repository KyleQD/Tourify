import { config } from "dotenv"
import { resolve } from "path"

/** Load .env then .env.local (Next.js order). */
export function loadQaEnv() {
  const root = process.cwd()
  config({ path: resolve(root, ".env") })
  config({ path: resolve(root, ".env.local"), override: true })
}

const DEFAULT_FLOW_PASSWORD = "QaFlowPass123!"

export function getQaCredentials() {
  return {
    userA: {
      email: process.env.QA_USER_A_EMAIL || "qa-multi-a@tourify.test",
      password: process.env.QA_USER_A_PASSWORD || "QaAuditPass123!",
    },
    userB: {
      email: process.env.QA_USER_B_EMAIL || "qa-multi-b@tourify.test",
      password: process.env.QA_USER_B_PASSWORD || "QaAuditPass123!",
    },
    baseUrl: (process.env.QA_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  }
}

export interface FlowCastMember {
  key: string
  role: string
  email: string
  password: string
  fullName: string
  username: string
}

/** Seven-account cast for the West Coast tour / hiring flow campaign. */
export function getFlowCastCredentials(): {
  baseUrl: string
  supabaseUrl: string
  anonKey: string
  serviceRoleKey: string
  members: FlowCastMember[]
  band: { name: string; slug: string }
  org: { name: string; slug: string; type: string }
  tour: { name: string }
} {
  const password = (key: string, fallback: string) => process.env[key] || fallback

  return {
    baseUrl: (process.env.QA_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    band: { name: "Pacific Signal", slug: "pacific-signal" },
    org: { name: "West Coast Touring Co", slug: "west-coast-touring", type: "promoter" },
    tour: { name: "Pacific Signal — West Coast Run" },
    members: [
      {
        key: "artist1",
        role: "artist_band_owner",
        email: process.env.QA_FLOW_ARTIST_1_EMAIL || "qa-flow-artist1@tourify.test",
        password: password("QA_FLOW_ARTIST_1_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "River Quinn",
        username: "qa-flow-artist1",
      },
      {
        key: "artist2",
        role: "artist_member",
        email: process.env.QA_FLOW_ARTIST_2_EMAIL || "qa-flow-artist2@tourify.test",
        password: password("QA_FLOW_ARTIST_2_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Sage Ortega",
        username: "qa-flow-artist2",
      },
      {
        key: "artist3",
        role: "artist_member",
        email: process.env.QA_FLOW_ARTIST_3_EMAIL || "qa-flow-artist3@tourify.test",
        password: password("QA_FLOW_ARTIST_3_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Morgan Hale",
        username: "qa-flow-artist3",
      },
      {
        key: "org",
        role: "org_admin",
        email: process.env.QA_FLOW_ORG_EMAIL || "qa-flow-org@tourify.test",
        password: password("QA_FLOW_ORG_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Alex Touring",
        username: "qa-flow-org",
      },
      {
        key: "worker1",
        role: "worker",
        email: process.env.QA_FLOW_WORKER_1_EMAIL || "qa-flow-worker1@tourify.test",
        password: password("QA_FLOW_WORKER_1_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Casey Stage",
        username: "qa-flow-worker1",
      },
      {
        key: "worker2",
        role: "worker",
        email: process.env.QA_FLOW_WORKER_2_EMAIL || "qa-flow-worker2@tourify.test",
        password: password("QA_FLOW_WORKER_2_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Jamie Security",
        username: "qa-flow-worker2",
      },
      {
        key: "worker3",
        role: "worker",
        email: process.env.QA_FLOW_WORKER_3_EMAIL || "qa-flow-worker3@tourify.test",
        password: password("QA_FLOW_WORKER_3_PASSWORD", DEFAULT_FLOW_PASSWORD),
        fullName: "Taylor Bar",
        username: "qa-flow-worker3",
      },
    ],
  }
}

export function printEnvBlock(creds: ReturnType<typeof getQaCredentials>) {
  console.log("\n# Paste into .env.local if missing:\n")
  console.log(`QA_USER_A_EMAIL=${creds.userA.email}`)
  console.log(`QA_USER_A_PASSWORD=${creds.userA.password}`)
  console.log(`QA_USER_B_EMAIL=${creds.userB.email}`)
  console.log(`QA_USER_B_PASSWORD=${creds.userB.password}`)
  console.log(`QA_BASE_URL=${creds.baseUrl}`)
  console.log("")
}

export function printFlowEnvBlock(cast: ReturnType<typeof getFlowCastCredentials>) {
  console.log("\n# West Coast tour flow cast — paste into .env.local if missing:\n")
  for (const m of cast.members) {
    const prefix =
      m.key === "org"
        ? "QA_FLOW_ORG"
        : m.key.startsWith("artist")
          ? `QA_FLOW_ARTIST_${m.key.slice(-1)}`
          : `QA_FLOW_WORKER_${m.key.slice(-1)}`
    console.log(`${prefix}_EMAIL=${m.email}`)
    console.log(`${prefix}_PASSWORD=${m.password}`)
  }
  console.log(`QA_BASE_URL=${cast.baseUrl}`)
  console.log("")
}

/** Shared 10-city West Coast route for tour bootstrap + agents. */
export const WEST_COAST_ROUTE = [
  { market: "Seattle", venue: "Climate Pledge Arena", date: "2026-09-05", leg: "Pacific NW", capacity: 17000 },
  { market: "Portland", venue: "Moda Center", date: "2026-09-07", leg: "Pacific NW", capacity: 19000 },
  { market: "Sacramento", venue: "Golden 1 Center", date: "2026-09-09", leg: "NorCal", capacity: 17000 },
  { market: "San Francisco", venue: "Chase Center", date: "2026-09-11", leg: "NorCal", capacity: 18000 },
  { market: "Oakland", venue: "Fox Theater", date: "2026-09-12", leg: "NorCal", capacity: 2800 },
  { market: "Santa Barbara", venue: "Santa Barbara Bowl", date: "2026-09-14", leg: "Central", capacity: 4500 },
  { market: "Los Angeles", venue: "Greek Theatre", date: "2026-09-16", leg: "SoCal", capacity: 5900 },
  { market: "Anaheim", venue: "House of Blues Anaheim", date: "2026-09-17", leg: "SoCal", capacity: 2100 },
  { market: "San Diego", venue: "Cal Coast Open Air Theatre", date: "2026-09-19", leg: "SoCal", capacity: 4800 },
  { market: "Las Vegas", venue: "Brooklyn Bowl Las Vegas", date: "2026-09-21", leg: "Desert", capacity: 2400 },
] as const
