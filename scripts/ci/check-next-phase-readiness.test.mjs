import test from "node:test"
import assert from "node:assert/strict"
import {
  buildDispatchCommands,
  REQUIRED_ENVIRONMENT_ITEMS,
  REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE,
  requirementsForPhase,
  validateEnvironmentIsolation,
  validateReadinessInput,
} from "./check-next-phase-readiness.mjs"

test("requires the release candidate to be a full SHA on origin/main", () => {
  const failures = validateReadinessInput({
    releaseSha: "abc123",
    headSha: "abc123",
    originMainSha: "def456",
    requiredFiles: [new URL("./check-next-phase-readiness.mjs", import.meta.url).pathname],
  })
  assert.deepEqual(failures, [
    "release_sha must be a full 40-character Git SHA",
    "release SHA must already be origin/main before staging dispatch",
  ])
})

test("accepts a full SHA that matches local HEAD and origin/main", () => {
  const sha = "623b576b7963d4a2eccb2fbf83f24f2011842a83"
  const failures = validateReadinessInput({
    releaseSha: sha,
    headSha: sha,
    originMainSha: sha,
    mainProtected: true,
    requiredFiles: [new URL("./check-next-phase-readiness.mjs", import.meta.url).pathname],
  })
  assert.deepEqual(failures, [])
})

test("requires main branch protection before dispatch", () => {
  const sha = "623b576b7963d4a2eccb2fbf83f24f2011842a83"
  const failures = validateReadinessInput({
    releaseSha: sha,
    headSha: sha,
    originMainSha: sha,
    mainProtected: false,
    requiredFiles: [new URL("./check-next-phase-readiness.mjs", import.meta.url).pathname],
  })
  assert.deepEqual(failures, ["main branch protection must be configured before staging dispatch"])
})


test("blocks staging when non-secret project identifiers match production", () => {
  const failures = validateEnvironmentIsolation({
    staging: {
      VERCEL_STAGING_PROJECT_ID: "prj_prod",
      SUPABASE_STAGING_PROJECT_ID: "prod-ref",
      SUPABASE_STAGING_URL: "https://prod.supabase.co",
      VERCEL_PRODUCTION_PROJECT_ID: "prj_prod",
      SUPABASE_PRODUCTION_PROJECT_ID: "prod-ref",
      SUPABASE_PRODUCTION_URL: "https://prod.supabase.co",
    },
    production: {
      VERCEL_PRODUCTION_PROJECT_ID: "prj_prod",
      SUPABASE_PRODUCTION_PROJECT_ID: "prod-ref",
      SUPABASE_PRODUCTION_URL: "https://prod.supabase.co",
    },
  })
  assert.deepEqual(failures, [
    "staging Vercel project must differ from production",
    "staging Supabase project must differ from production",
    "staging Supabase URL must differ from production",
  ])
})

test("accepts distinct non-secret staging identifiers", () => {
  const failures = validateEnvironmentIsolation({
    staging: {
      VERCEL_STAGING_PROJECT_ID: "prj_staging",
      SUPABASE_STAGING_PROJECT_ID: "staging-ref",
      SUPABASE_STAGING_URL: "https://staging.supabase.co",
    },
    production: {
      VERCEL_PRODUCTION_PROJECT_ID: "prj_prod",
      SUPABASE_PRODUCTION_PROJECT_ID: "prod-ref",
      SUPABASE_PRODUCTION_URL: "https://prod.supabase.co",
    },
  })
  assert.deepEqual(failures, [])
})


test("separates predeploy requirements from certification outputs", () => {
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.predeploy.staging.vars.includes("SUPABASE_STAGING_PROJECT_ID"))
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.predeploy.staging.secrets.includes("VERCEL_STAGING_TOKEN"))
  assert.ok(!REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.predeploy.staging.secrets.includes("QA_CERT_STAGING_DEPLOYMENT_ID"))
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.certification.staging.secrets.includes("QA_CERT_STAGING_DEPLOYMENT_ID"))
})

test("campaign requirements include every readiness phase", () => {
  const campaign = requirementsForPhase("campaign")
  assert.ok(campaign.staging.secrets.includes("VERCEL_STAGING_TOKEN"))
  assert.ok(campaign.staging.secrets.includes("QA_CERT_STAGING_DEPLOYMENT_ID"))
  assert.ok(campaign.production.secrets.includes("VERCEL_PRODUCTION_TOKEN"))
})

test("rejects unknown readiness phases", () => {
  assert.equal(requirementsForPhase("unknown"), null)
})

test("keeps staging and production requirements explicit", () => {
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS.staging.vars.includes("VERCEL_STAGING_PROJECT_ID"))
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS.staging.secrets.includes("QA_CERT_STAGING_DEPLOYMENT_ID"))
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS.production.vars.includes("PRODUCTION_BASE_URL"))
  assert.ok(REQUIRED_ENVIRONMENT_ITEMS.production.secrets.includes("SMOKE_TEST_AUTH_BEARER_TOKEN"))
})

test("prints safe dispatch commands without secret values", () => {
  const sha = "623b576b7963d4a2eccb2fbf83f24f2011842a83"
  const commands = buildDispatchCommands(sha).join("\n")
  assert.match(commands, /deploy-demo\.yml/)
  assert.match(commands, /supabase-migrations-staging\.yml/)
  assert.match(commands, /e2e\.yml/)
  assert.match(commands, /qa:simulation:provision/)
  assert.doesNotMatch(commands, /sk_test|service_role|password/i)
})
