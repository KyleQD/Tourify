import assert from "node:assert/strict"
import test from "node:test"

import { validateDeploymentTopology } from "./validate-deployment-topology.mjs"

const valid = {
  environment: "staging",
  domains: "demo.tourify.live",
  vercelProjectId: "vercel-staging",
  vercelStagingProjectId: "vercel-staging",
  vercelProductionProjectId: "vercel-production",
  supabaseProjectId: "supabase-staging",
  supabaseStagingProjectId: "supabase-staging",
  supabaseProductionProjectId: "supabase-production",
  supabaseStagingUrl: "https://staging-ref.supabase.co",
  supabaseProductionUrl: "https://production-ref.supabase.co",
}

test("accepts isolated staging topology", () => {
  assert.deepEqual(validateDeploymentTopology(valid), [])
})

test("rejects a shared Supabase origin despite distinct project labels", () => {
  assert.match(validateDeploymentTopology({ ...valid, supabaseProductionUrl: valid.supabaseStagingUrl }).join("\n"), /different Supabase origins/)
})

test("accepts the exact production domain set", () => {
  assert.deepEqual(
    validateDeploymentTopology({
      ...valid,
      environment: "production",
      domains: "www.tourify.live,tourify.live",
      vercelProjectId: "vercel-production",
      supabaseProjectId: "supabase-production",
    }),
    [],
  )
})

test("rejects shared projects, mismatched targets, and domain crossover", () => {
  const failures = validateDeploymentTopology({
    ...valid,
    domains: "tourify.live",
    vercelProjectId: "other-vercel",
    supabaseProjectId: "other-supabase",
    vercelProductionProjectId: "vercel-staging",
    supabaseProductionProjectId: "supabase-staging",
  })

  assert.deepEqual(failures, [
    "staging domains must be exactly demo.tourify.live; received tourify.live",
    "Staging and production must use different Vercel project IDs",
    "Staging and production must use different Supabase project IDs",
    "VERCEL_PROJECT_ID does not match the registered staging project",
    "SUPABASE_PROJECT_ID does not match the registered staging project",
  ])
})
