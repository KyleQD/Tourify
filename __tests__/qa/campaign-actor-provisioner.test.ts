import { afterEach, describe, expect, it, vi } from "vitest"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { actorEmail, campaignActorConfig, CAMPAIGN_ACTORS, provisionCampaignActors } from "../../scripts/qa/provision-campaign-actors"

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function config() {
  const dir = mkdtempSync(join(tmpdir(), "tourify-campaign-"))
  dirs.push(dir)
  return campaignActorConfig({
    QA_CAMPAIGN_STAGING_URL: "https://staging.tourify.test",
    QA_CAMPAIGN_PRODUCTION_URL: "https://tourify.live",
    QA_CAMPAIGN_STAGING_DEPLOYMENT_ID: "dpl_staging123",
    QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID: "dpl_production456",
    QA_CAMPAIGN_SUPABASE_URL: "https://staging-ref.supabase.co",
    QA_CAMPAIGN_PRODUCTION_SUPABASE_URL: "https://production-ref.supabase.co",
    QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY: "protected-test-value",
    QA_CAMPAIGN_STRIPE_SECRET_KEY: "sk_test_protected-test-value",
    QA_CAMPAIGN_DEPLOYED_SHA: "a".repeat(40),
    QA_CAMPAIGN_EMAIL_DOMAIN: "tourify.test",
    QA_CAMPAIGN_PASSWORD_SEED: "protected-seed-with-at-least-32-characters",
  }, "SIM-20260922-01", join(dir, "manifest.json"))
}

function fakeAdmin(users: User[] = []) {
  const createUser = vi.fn(async (attributes: { email: string; app_metadata: Record<string, string> }) => {
    const user = { id: `user-${users.length + 1}`, email: attributes.email, app_metadata: attributes.app_metadata } as User
    users.push(user)
    return { data: { user }, error: null }
  })
  const listUsers = vi.fn(async () => ({ data: { users }, error: null }))
  const updateUserById = vi.fn()
  const deleteUser = vi.fn()
  return { client: { auth: { admin: { createUser, listUsers, updateUserById, deleteUser } } } as unknown as SupabaseClient, createUser, listUsers, updateUserById, deleteUser }
}

function health(sha = "a".repeat(40)) {
  return vi.fn(async (url: string) => url.startsWith("https://staging.tourify.test")
    ? new Response("ok", { status: 200, headers: {
      "x-tourify-release-sha": sha,
      "x-tourify-deployment-id": "dpl_staging123",
      "x-tourify-supabase-origin": "https://staging-ref.supabase.co",
      "x-tourify-stripe-mode": "test",
    } })
    : new Response("ok", { status: 200, headers: {
      "x-tourify-deployment-id": "dpl_production456",
      "x-tourify-supabase-origin": "https://production-ref.supabase.co",
    } })) as unknown as typeof fetch
}

describe("campaign auth bootstrap", () => {
  it("fails closed on shared infrastructure and live Stripe keys", () => {
    const good = config()
    const env = {
      QA_CAMPAIGN_STAGING_URL: good.stagingUrl, QA_CAMPAIGN_PRODUCTION_URL: good.productionUrl,
      QA_CAMPAIGN_STAGING_DEPLOYMENT_ID: good.stagingDeploymentId, QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID: good.productionDeploymentId,
      QA_CAMPAIGN_SUPABASE_URL: good.supabaseUrl, QA_CAMPAIGN_PRODUCTION_SUPABASE_URL: good.productionSupabaseUrl,
      QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY: good.serviceRoleKey, QA_CAMPAIGN_STRIPE_SECRET_KEY: good.stripeSecretKey,
      QA_CAMPAIGN_DEPLOYED_SHA: good.deployedSha, QA_CAMPAIGN_EMAIL_DOMAIN: good.emailDomain, QA_CAMPAIGN_PASSWORD_SEED: good.passwordSeed,
    }
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_STAGING_DEPLOYMENT_ID: env.QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID }, good.campaignId, good.manifestPath)).toThrow(/must differ/)
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_SUPABASE_URL: env.QA_CAMPAIGN_PRODUCTION_SUPABASE_URL }, good.campaignId, good.manifestPath)).toThrow(/must differ/)
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_STRIPE_SECRET_KEY: "sk_live_secret" }, good.campaignId, good.manifestPath)).toThrow(/test-mode/)
    for (const liveOrigin of ["https://tourify.live", "https://www.tourify.live"]) {
      expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_STAGING_URL: liveOrigin }, good.campaignId, good.manifestPath)).toThrow(/Tourify production origins/)
    }
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_STAGING_URL: "https://demo.tourify.live" }, good.campaignId, good.manifestPath)).not.toThrow()
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_PASSWORD_SEED: undefined }, good.campaignId, good.manifestPath)).toThrow(/Missing QA_CAMPAIGN_PASSWORD_SEED/)
    expect(() => campaignActorConfig({ ...env, QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY: undefined }, good.campaignId, good.manifestPath)).toThrow(/Missing QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY/)
  })

  it("does not access Auth when the exact release SHA is absent", async () => {
    const cfg = config()
    const admin = fakeAdmin()
    await expect(provisionCampaignActors(cfg, admin.client, health("b".repeat(40)))).rejects.toThrow(/release SHA/)
    expect(admin.listUsers).not.toHaveBeenCalled()
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("does not access Auth when staging advertises the production database", async () => {
    const cfg = config()
    const admin = fakeAdmin()
    const fetcher = vi.fn(async (url: string) => url.startsWith(cfg.stagingUrl)
      ? new Response("ok", { status: 200, headers: {
        "x-tourify-release-sha": cfg.deployedSha,
        "x-tourify-deployment-id": cfg.stagingDeploymentId,
        "x-tourify-supabase-origin": cfg.productionSupabaseUrl,
        "x-tourify-stripe-mode": "test",
      } })
      : new Response("ok", { status: 200 })) as unknown as typeof fetch
    await expect(provisionCampaignActors(cfg, admin.client, fetcher)).rejects.toThrow(/database origin/)
    expect(admin.listUsers).not.toHaveBeenCalled()
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("does not access Auth when staging deployment or Stripe mode is wrong", async () => {
    const cfg = config()
    const admin = fakeAdmin()
    for (const headers of [
      { "x-tourify-deployment-id": cfg.productionDeploymentId, "x-tourify-stripe-mode": "test" },
      { "x-tourify-deployment-id": cfg.stagingDeploymentId, "x-tourify-stripe-mode": "live" },
    ]) {
      const fetcher = vi.fn(async () => new Response("ok", { status: 200, headers: {
        "x-tourify-release-sha": cfg.deployedSha,
        "x-tourify-supabase-origin": cfg.supabaseUrl,
        ...headers,
      } })) as unknown as typeof fetch
      await expect(provisionCampaignActors(cfg, admin.client, fetcher)).rejects.toThrow(/deployment identity|Stripe test mode/)
    }
    expect(admin.listUsers).not.toHaveBeenCalled()
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("does not access Auth when production isolation headers are absent", async () => {
    const cfg = config()
    const admin = fakeAdmin()
    const fetcher = vi.fn(async (url: string) => url.startsWith(cfg.stagingUrl)
      ? new Response("ok", { status: 200, headers: {
        "x-tourify-release-sha": cfg.deployedSha,
        "x-tourify-deployment-id": cfg.stagingDeploymentId,
        "x-tourify-supabase-origin": cfg.supabaseUrl,
        "x-tourify-stripe-mode": "test",
      } })
      : new Response("ok", { status: 200 })) as unknown as typeof fetch
    await expect(provisionCampaignActors(cfg, admin.client, fetcher)).rejects.toThrow(/Production deployment identity is absent/)
    expect(admin.listUsers).not.toHaveBeenCalled()
    expect(admin.createUser).not.toHaveBeenCalled()
  })

  it("creates campaign-tagged users and a non-secret manifest without granting admin", async () => {
    const cfg = config()
    const admin = fakeAdmin()
    const manifest = await provisionCampaignActors(cfg, admin.client, health())
    expect(manifest.actors).toHaveLength(CAMPAIGN_ACTORS.length)
    expect(admin.createUser).toHaveBeenCalledTimes(CAMPAIGN_ACTORS.length)
    expect(admin.createUser.mock.calls[0][0].app_metadata).toEqual({ qa_campaign_id: cfg.campaignId, qa_actor_key: "worker-01" })
    expect(manifest.actors.find((actor) => actor.key === "second-venue-manager")?.privilegeStatus).toBe("none")
    const disk = readFileSync(cfg.manifestPath, "utf8")
    expect(disk).not.toContain(cfg.passwordSeed)
    expect(disk).not.toContain(cfg.serviceRoleKey)
    expect(disk).not.toContain(cfg.stripeSecretKey)
    expect(disk).not.toContain("Qa!")
    expect(disk).not.toContain(actorEmail(cfg, "worker-01"))
    expect(manifest.actors.find((actor) => actor.key === "platform-admin-candidate")?.privilegeStatus).toBe("requires-supported-assignment")
    expect(admin.updateUserById).not.toHaveBeenCalled()
    expect(admin.deleteUser).not.toHaveBeenCalled()
    await provisionCampaignActors(cfg, admin.client, health())
    expect(admin.createUser).toHaveBeenCalledTimes(CAMPAIGN_ACTORS.length)
  })

  it("refuses an existing untagged identity without resetting or adopting it", async () => {
    const cfg = config()
    const user = { id: "real-user", email: actorEmail(cfg, "worker-01"), app_metadata: {} } as User
    const admin = fakeAdmin([user])
    await expect(provisionCampaignActors(cfg, admin.client, health())).rejects.toThrow(/Refusing to adopt/)
    expect(admin.createUser).not.toHaveBeenCalled()
    expect(admin.updateUserById).not.toHaveBeenCalled()
    expect(admin.deleteUser).not.toHaveBeenCalled()
  })

  it("preflights a foreign venue collision before creating any actor", async () => {
    const cfg = config()
    const user = { id: "other-venue-user", email: actorEmail(cfg, "second-venue-manager"), app_metadata: {} } as User
    const admin = fakeAdmin([user])
    await expect(provisionCampaignActors(cfg, admin.client, health())).rejects.toThrow(/Refusing to adopt/)
    expect(admin.createUser).not.toHaveBeenCalled()
    expect(admin.updateUserById).not.toHaveBeenCalled()
  })
})
