import { request as playwrightRequest, type FullConfig } from "@playwright/test"
import {
  assertCertificationFixtureReady,
  loadLaunchCertificationFixture,
  readJsonPath,
  requiredEnvironment,
} from "./fixture"

export default async function globalSetup(config: FullConfig) {
  const fixture = assertCertificationFixtureReady(loadLaunchCertificationFixture())
  const missing = requiredEnvironment(fixture).filter((name) => !process.env[name])
  if (missing.length > 0)
    throw new Error(`Launch certification environment is incomplete: ${missing.join(", ")}`)

  const baseURL = String(config.projects[0]?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || "")
  if (!baseURL) throw new Error("PLAYWRIGHT_BASE_URL is required for launch certification")
  const parsedBase = new URL(baseURL)
  if (parsedBase.username || parsedBase.password || parsedBase.search || parsedBase.hash || parsedBase.pathname !== "/")
    throw new Error("Launch certification requires a clean staging app origin")
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedBase.hostname)
  if (isLocal && process.env.QA_CERT_ALLOW_LOCAL !== "1")
    throw new Error("Launch certification refuses localhost unless QA_CERT_ALLOW_LOCAL=1")
  if (!isLocal && parsedBase.protocol !== "https:")
    throw new Error("Launch certification requires HTTPS for a non-local target")

  const stagingDeploymentId = process.env.QA_CERT_STAGING_DEPLOYMENT_ID!
  const productionDeploymentId = process.env.QA_CERT_PRODUCTION_DEPLOYMENT_ID!
  const productionUrl = new URL(process.env.QA_CERT_PRODUCTION_URL!)
  const stagingSupabaseUrl = new URL(process.env[fixture.supabase.urlEnv]!)
  const productionSupabaseUrl = new URL(process.env.QA_CERT_PRODUCTION_SUPABASE_URL!)
  for (const [name, url] of [["production app", productionUrl], ["staging Supabase", stagingSupabaseUrl], ["production Supabase", productionSupabaseUrl]] as const) {
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
      throw new Error(`Launch certification requires a clean ${name} origin`)
  }
  if (!/^dpl_[A-Za-z0-9]+$/.test(stagingDeploymentId) || !/^dpl_[A-Za-z0-9]+$/.test(productionDeploymentId) || stagingDeploymentId === productionDeploymentId)
    throw new Error("Launch certification requires distinct Vercel-generated staging and production deployment IDs")
  if (parsedBase.origin === productionUrl.origin || stagingSupabaseUrl.origin === productionSupabaseUrl.origin)
    throw new Error("Launch certification requires distinct staging and production app and Supabase origins")
  if (productionUrl.protocol !== "https:" || stagingSupabaseUrl.protocol !== "https:" || productionSupabaseUrl.protocol !== "https:")
    throw new Error("Launch certification requires HTTPS staging and production origins")
  if (!process.env.QA_CERT_STRIPE_SECRET_KEY?.startsWith("sk_test_"))
    throw new Error("Launch certification requires a protected Stripe test-mode key")

  const expectedSha = process.env[fixture.release.expectedShaEnv]!
  if (!/^[0-9a-f]{40}$/i.test(expectedSha))
    throw new Error(`${fixture.release.expectedShaEnv} must be an exact 40-character Git SHA`)

  const api = await playwrightRequest.newContext({ baseURL })
  try {
    const response = await api.get(fixture.release.probe.path)
    if (response.status() !== fixture.release.probe.expectedStatus)
      throw new Error(
        `Release probe returned ${response.status()}, expected ${fixture.release.probe.expectedStatus}`,
      )
    let observedSha: unknown
    if (fixture.release.probe.shaHeader)
      observedSha = response.headers()[fixture.release.probe.shaHeader.toLowerCase()]
    else
      observedSha = readJsonPath(await response.json(), fixture.release.probe.shaJsonPath!)
    if (String(observedSha).toLowerCase() !== expectedSha.toLowerCase())
      throw new Error(`Release SHA mismatch: expected ${expectedSha}, observed ${String(observedSha)}`)
    if (response.headers()["x-tourify-deployment-id"] !== stagingDeploymentId)
      throw new Error("Staging deployment ID is absent or does not match the protected release identity")
    if (response.headers()["x-tourify-supabase-origin"] !== stagingSupabaseUrl.origin)
      throw new Error("Staging Supabase origin is absent or does not match the protected target")
    if (response.headers()["x-tourify-stripe-mode"] !== "test")
      throw new Error("Staging application does not advertise Stripe test mode")
  } finally {
    await api.dispose()
  }
}
