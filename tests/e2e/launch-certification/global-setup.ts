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
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedBase.hostname)
  if (isLocal && process.env.QA_CERT_ALLOW_LOCAL !== "1")
    throw new Error("Launch certification refuses localhost unless QA_CERT_ALLOW_LOCAL=1")
  if (!isLocal && parsedBase.protocol !== "https:")
    throw new Error("Launch certification requires HTTPS for a non-local target")

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
  } finally {
    await api.dispose()
  }
}
