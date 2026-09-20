#!/usr/bin/env node

const EXPECTED_DOMAINS = {
  staging: ["demo.tourify.live"],
  production: ["tourify.live", "www.tourify.live"],
}

function normalizedDomains(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .sort()
}

export function validateDeploymentTopology(input) {
  const failures = []
  const environment = String(input.environment || "")
  const expectedDomains = EXPECTED_DOMAINS[environment]

  if (!expectedDomains) {
    failures.push(`DEPLOYMENT_ENVIRONMENT must be staging or production; received ${environment || "missing"}`)
  }

  const domains = normalizedDomains(input.domains)
  if (expectedDomains && JSON.stringify(domains) !== JSON.stringify([...expectedDomains].sort())) {
    failures.push(
      `${environment} domains must be exactly ${expectedDomains.join(",")}; received ${domains.join(",") || "missing"}`,
    )
  }

  const projectInputs = [
    ["VERCEL_STAGING_PROJECT_ID", input.vercelStagingProjectId],
    ["VERCEL_PRODUCTION_PROJECT_ID", input.vercelProductionProjectId],
    ["SUPABASE_STAGING_PROJECT_ID", input.supabaseStagingProjectId],
    ["SUPABASE_PRODUCTION_PROJECT_ID", input.supabaseProductionProjectId],
  ]
  for (const [name, value] of projectInputs) {
    if (!String(value || "").trim()) failures.push(`${name} is required`)
  }

  if (
    input.vercelStagingProjectId &&
    input.vercelProductionProjectId &&
    input.vercelStagingProjectId === input.vercelProductionProjectId
  ) {
    failures.push("Staging and production must use different Vercel project IDs")
  }
  if (
    input.supabaseStagingProjectId &&
    input.supabaseProductionProjectId &&
    input.supabaseStagingProjectId === input.supabaseProductionProjectId
  ) {
    failures.push("Staging and production must use different Supabase project IDs")
  }

  const expectedVercelProjectId =
    environment === "staging" ? input.vercelStagingProjectId : input.vercelProductionProjectId
  const expectedSupabaseProjectId =
    environment === "staging" ? input.supabaseStagingProjectId : input.supabaseProductionProjectId
  if (expectedDomains && input.vercelProjectId !== expectedVercelProjectId) {
    failures.push(`VERCEL_PROJECT_ID does not match the registered ${environment} project`)
  }
  if (expectedDomains && input.supabaseProjectId !== expectedSupabaseProjectId) {
    failures.push(`SUPABASE_PROJECT_ID does not match the registered ${environment} project`)
  }

  return failures
}

function main() {
  const failures = validateDeploymentTopology({
    environment: process.env.DEPLOYMENT_ENVIRONMENT,
    domains: process.env.DEPLOYMENT_DOMAINS,
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
    vercelStagingProjectId: process.env.VERCEL_STAGING_PROJECT_ID,
    vercelProductionProjectId: process.env.VERCEL_PRODUCTION_PROJECT_ID,
    supabaseProjectId: process.env.SUPABASE_PROJECT_ID,
    supabaseStagingProjectId: process.env.SUPABASE_STAGING_PROJECT_ID,
    supabaseProductionProjectId: process.env.SUPABASE_PRODUCTION_PROJECT_ID,
  })

  if (failures.length > 0) {
    for (const failure of failures) console.error(`✗ ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(`✓ ${process.env.DEPLOYMENT_ENVIRONMENT} deployment topology is isolated`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
