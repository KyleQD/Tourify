#!/usr/bin/env npx tsx
/**
 * QA-004 auth bootstrap. Creates only new, campaign-tagged synthetic users.
 * Product personas, privileges, events, and tours must be created through the UI.
 *
 * Required environment is documented in campaignActorConfig(). No .env file is
 * loaded: an operator must supply protected staging secrets explicitly.
 * Run: npx tsx scripts/qa/provision-campaign-actors.ts --campaign-id SIM-YYYYMMDD-01 --manifest /absolute/path/manifest.json
 */
import { createHmac } from "node:crypto"
import { existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { isAbsolute } from "node:path"
import { pathToFileURL } from "node:url"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

export const CAMPAIGN_ACTORS = [
  ["worker-01", "worker"],
  ["worker-02", "worker"],
  ["artist-owner", "artist owner"],
  ["artist-collaborator", "artist collaborator"],
  ["venue-manager", "venue manager"],
  ["second-venue-manager", "second venue manager"],
  ["organization-manager", "organization manager"],
  ["second-tenant-manager", "second tenant manager"],
  ["customer-01", "customer"],
  ["customer-02", "customer"],
  ["door-staff", "door staff"],
  ["platform-admin-candidate", "platform admin candidate"],
] as const

type ActorKey = (typeof CAMPAIGN_ACTORS)[number][0]
type ActorRecord = { key: ActorKey; intendedRole: string; userId: string; mode: "created" | "verified-existing"; privilegeStatus: "none" | "requires-supported-assignment" }
export type CampaignManifest = {
  schemaVersion: 1
  campaignId: string
  stagingUrl: string
  deployedSha: string
  stagingDeploymentId: string
  supabaseUrl: string
  stripeMode: "test"
  fixtureScope: "auth-only"
  actors: ActorRecord[]
}

export type CampaignActorConfig = {
  campaignId: string
  manifestPath: string
  stagingUrl: string
  productionUrl: string
  stagingDeploymentId: string
  productionDeploymentId: string
  supabaseUrl: string
  productionSupabaseUrl: string
  serviceRoleKey: string
  stripeSecretKey: string
  deployedSha: string
  emailDomain: string
  passwordSeed: string
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function httpsUrl(value: string, label: string): URL {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error(`${label} must be a clean HTTPS URL`)
  return url
}

export function campaignActorConfig(env: NodeJS.ProcessEnv, campaignId: string, manifestPath: string): CampaignActorConfig {
  if (!/^SIM-\d{8}-[A-Z0-9]{2,12}$/.test(campaignId)) throw new Error("Invalid campaign ID; use SIM-YYYYMMDD-01 format")
  if (!isAbsolute(manifestPath) || !manifestPath.endsWith(".json")) throw new Error("Manifest path must be an absolute .json path")
  const stagingUrl = required(env, "QA_CAMPAIGN_STAGING_URL")
  const productionUrl = required(env, "QA_CAMPAIGN_PRODUCTION_URL")
  const supabaseUrl = required(env, "QA_CAMPAIGN_SUPABASE_URL")
  const productionSupabaseUrl = required(env, "QA_CAMPAIGN_PRODUCTION_SUPABASE_URL")
  const stagingDeploymentId = required(env, "QA_CAMPAIGN_STAGING_DEPLOYMENT_ID")
  const productionDeploymentId = required(env, "QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID")
  const deployedSha = required(env, "QA_CAMPAIGN_DEPLOYED_SHA")
  const stripeSecretKey = required(env, "QA_CAMPAIGN_STRIPE_SECRET_KEY")
  const passwordSeed = required(env, "QA_CAMPAIGN_PASSWORD_SEED")
  const emailDomain = required(env, "QA_CAMPAIGN_EMAIL_DOMAIN").toLowerCase()
  const app = httpsUrl(stagingUrl, "Staging URL")
  const prodApp = httpsUrl(productionUrl, "Production URL")
  const db = httpsUrl(supabaseUrl, "Staging Supabase URL")
  const prodDb = httpsUrl(productionSupabaseUrl, "Production Supabase URL")
  if (["tourify.live", "www.tourify.live"].includes(app.hostname))
    throw new Error("Tourify production origins cannot be used for campaign staging")
  if (app.origin === prodApp.origin || db.origin === prodDb.origin || stagingDeploymentId === productionDeploymentId)
    throw new Error("Staging and production deployment, app, and Supabase identities must differ")
  if (!/^dpl_[A-Za-z0-9]+$/.test(stagingDeploymentId) || !/^dpl_[A-Za-z0-9]+$/.test(productionDeploymentId))
    throw new Error("Staging and production deployment IDs must be Vercel-generated dpl_ identifiers")
  if (!/^https:\/\/[^/]+$/.test(db.origin) || !/^https:\/\/[^/]+$/.test(prodDb.origin)) throw new Error("Invalid Supabase origin")
  if (!/^[a-f0-9]{40}$/i.test(deployedSha)) throw new Error("QA_CAMPAIGN_DEPLOYED_SHA must be a full commit SHA")
  if (!stripeSecretKey.startsWith("sk_test_")) throw new Error("Stripe test-mode secret key is required")
  if (passwordSeed.length < 32) throw new Error("QA_CAMPAIGN_PASSWORD_SEED must contain at least 32 characters")
  if (!/^[a-z0-9-]+\.test$/.test(emailDomain)) throw new Error("QA_CAMPAIGN_EMAIL_DOMAIN must be a synthetic .test domain")
  const serviceRoleKey = required(env, "QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY")
  return { campaignId, manifestPath, stagingUrl: app.origin, productionUrl: prodApp.origin, stagingDeploymentId, productionDeploymentId, supabaseUrl: db.origin, productionSupabaseUrl: prodDb.origin, serviceRoleKey, stripeSecretKey, deployedSha: deployedSha.toLowerCase(), emailDomain, passwordSeed }
}

export function actorEmail(config: CampaignActorConfig, key: ActorKey): string {
  return `qa+${config.campaignId.toLowerCase()}-${key}@${config.emailDomain}`
}

export function actorPassword(config: CampaignActorConfig, key: ActorKey): string {
  return `Qa!${createHmac("sha256", config.passwordSeed).update(`${config.campaignId}:${key}`).digest("hex")}`
}

export async function verifyRelease(config: CampaignActorConfig, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`${config.stagingUrl}/api/health`, { method: "GET", redirect: "error", cache: "no-store" })
  if (!response.ok || response.url && new URL(response.url).origin !== config.stagingUrl)
    throw new Error("Staging health endpoint did not return from the expected origin")
  if (response.headers.get("x-tourify-release-sha")?.toLowerCase() !== config.deployedSha)
    throw new Error("Staging release SHA is absent or does not match QA_CAMPAIGN_DEPLOYED_SHA")
  if (response.headers.get("x-tourify-deployment-id") !== config.stagingDeploymentId)
    throw new Error("Staging deployment identity is absent or does not match QA_CAMPAIGN_STAGING_DEPLOYMENT_ID")
  if (response.headers.get("x-tourify-supabase-origin") !== config.supabaseUrl)
    throw new Error("Staging database origin is absent or does not match QA_CAMPAIGN_SUPABASE_URL")
  if (response.headers.get("x-tourify-stripe-mode") !== "test")
    throw new Error("Staging app must advertise Stripe test mode")

  const production = await fetcher(`${config.productionUrl}/api/health`, { method: "GET", redirect: "error", cache: "no-store" })
  if (!production.ok || production.url && new URL(production.url).origin !== config.productionUrl)
    throw new Error("Production comparison health endpoint did not return from the expected origin")
  const productionDeploymentId = production.headers.get("x-tourify-deployment-id")
  const productionSupabaseOrigin = production.headers.get("x-tourify-supabase-origin")
  if (productionDeploymentId !== config.productionDeploymentId)
    throw new Error("Production deployment identity is absent or does not match QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID")
  if (productionSupabaseOrigin !== config.productionSupabaseUrl)
    throw new Error("Production database origin is absent or does not match QA_CAMPAIGN_PRODUCTION_SUPABASE_URL")
}

export async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
    if (page > 1000) throw new Error("Auth user pagination exceeded safe limit")
  }
}

function readManifest(config: CampaignActorConfig): CampaignManifest {
  if (!existsSync(config.manifestPath)) return {
    schemaVersion: 1, campaignId: config.campaignId, stagingUrl: config.stagingUrl,
    deployedSha: config.deployedSha, stagingDeploymentId: config.stagingDeploymentId,
    supabaseUrl: config.supabaseUrl, stripeMode: "test", fixtureScope: "auth-only", actors: [],
  }
  const manifestStat = lstatSync(config.manifestPath)
  if (!manifestStat.isFile() || (manifestStat.mode & 0o077) !== 0)
    throw new Error("Manifest must be a regular file readable only by its owner")
  const manifest = JSON.parse(readFileSync(config.manifestPath, "utf8")) as CampaignManifest
  if (manifest.campaignId !== config.campaignId || manifest.supabaseUrl !== config.supabaseUrl || manifest.stagingDeploymentId !== config.stagingDeploymentId || manifest.deployedSha !== config.deployedSha || manifest.fixtureScope !== "auth-only")
    throw new Error("Existing manifest does not match this campaign and staging release")
  return manifest
}

function saveManifest(config: CampaignActorConfig, manifest: CampaignManifest): void {
  const tempPath = `${config.manifestPath}.${process.pid}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 })
  renameSync(tempPath, config.manifestPath)
}

export async function provisionCampaignActors(config: CampaignActorConfig, admin: SupabaseClient, fetcher: typeof fetch = fetch): Promise<CampaignManifest> {
  // No privileged write is attempted before the environment and exact release pass.
  await verifyRelease(config, fetcher)
  const manifest = readManifest(config)
  const existingUsers = new Map<ActorKey, User | null>()
  // Scan the entire intended cast before writing, so an untagged collision or
  // stale manifest cannot leave a newly created partial cast behind.
  for (const [key] of CAMPAIGN_ACTORS) {
    const email = actorEmail(config, key)
    const existing = await findUserByEmail(admin, email)
    if (existing && (existing.app_metadata?.qa_campaign_id !== config.campaignId || existing.app_metadata?.qa_actor_key !== key))
      throw new Error(`Refusing to adopt untagged or differently tagged user for ${key}`)
    const recorded = manifest.actors.find((actor) => actor.key === key)
    if (recorded && (!existing || recorded.userId !== existing.id))
      throw new Error(`Manifest identity mismatch for ${key}`)
    existingUsers.set(key, existing)
  }
  for (const [key, intendedRole] of CAMPAIGN_ACTORS) {
    const email = actorEmail(config, key)
    const existing = existingUsers.get(key) ?? null
    const recorded = manifest.actors.find((actor) => actor.key === key)
    let user = existing
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password: actorPassword(config, key), email_confirm: true,
        app_metadata: { qa_campaign_id: config.campaignId, qa_actor_key: key },
        user_metadata: { full_name: `QA ${intendedRole}`, qa_campaign_label: config.campaignId },
      })
      if (error || !data.user) throw error || new Error(`Auth creation returned no user for ${key}`)
      user = data.user
    }
    if (!recorded) {
      manifest.actors.push({ key, intendedRole, userId: user.id, mode: existing ? "verified-existing" : "created", privilegeStatus: key === "platform-admin-candidate" ? "requires-supported-assignment" : "none" })
      saveManifest(config, manifest)
    }
  }
  return manifest
}

function cliArg(name: string): string {
  const index = process.argv.indexOf(name)
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`)
  return process.argv[index + 1]
}

async function main(): Promise<void> {
  const config = campaignActorConfig(process.env, cliArg("--campaign-id"), cliArg("--manifest"))
  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const manifest = await provisionCampaignActors(config, admin)
  console.log(`Campaign ${manifest.campaignId}: ${manifest.actors.length} tagged auth identities recorded at ${config.manifestPath}`)
  console.log("Platform admin candidate has no privilege; assign through the supported, separately verified admin workflow.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: Error) => { console.error(error.message); process.exitCode = 1 })
}
