#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

const FULL_SHA = /^[0-9a-f]{40}$/i

const EMPTY_REQUIREMENTS = Object.freeze({ vars: [], secrets: [] })

function mergeRequirementSets(...sets) {
  const merged = {
    staging: { vars: new Set(), secrets: new Set() },
    production: { vars: new Set(), secrets: new Set() },
  }

  for (const set of sets) {
    for (const environment of Object.keys(merged)) {
      for (const kind of ["vars", "secrets"]) {
        for (const name of set[environment]?.[kind] || []) merged[environment][kind].add(name)
      }
    }
  }

  return Object.fromEntries(
    Object.entries(merged).map(([environment, requirements]) => [
      environment,
      {
        vars: [...requirements.vars],
        secrets: [...requirements.secrets],
      },
    ]),
  )
}

export const REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE = {
  predeploy: {
    staging: {
      vars: [
        "VERCEL_STAGING_ORG_ID",
        "VERCEL_STAGING_PROJECT_ID",
        "VERCEL_PRODUCTION_PROJECT_ID",
        "SUPABASE_STAGING_PROJECT_ID",
        "SUPABASE_PRODUCTION_PROJECT_ID",
        "SUPABASE_STAGING_URL",
        "SUPABASE_PRODUCTION_URL",
      ],
      secrets: [
        "VERCEL_STAGING_TOKEN",
        "SUPABASE_STAGING_ACCESS_TOKEN",
        "SUPABASE_STAGING_DB_PASSWORD",
        "SUPABASE_STAGING_PROJECT_ID",
        "EXPECTED_SUPABASE_STAGING_PROJECT_ID",
      ],
    },
    production: {
      vars: [
        "VERCEL_PRODUCTION_ORG_ID",
        "VERCEL_PRODUCTION_PROJECT_ID",
        "VERCEL_STAGING_PROJECT_ID",
        "SUPABASE_PRODUCTION_PROJECT_ID",
        "SUPABASE_STAGING_PROJECT_ID",
        "SUPABASE_STAGING_URL",
        "SUPABASE_PRODUCTION_URL",
        "PRODUCTION_BASE_URL",
      ],
      secrets: [],
    },
  },
  certification: {
    staging: {
      vars: ["QA_CERT_PRODUCTION_URL", "QA_CERT_PRODUCTION_SUPABASE_URL"],
      secrets: [
        "QA_CERT_STAGING_URL",
        "QA_CERT_SUPABASE_URL",
        "QA_CERT_SUPABASE_ANON_KEY",
        "QA_CERT_STAGING_DEPLOYMENT_ID",
        "QA_CERT_PRODUCTION_DEPLOYMENT_ID",
        "QA_CERT_STRIPE_SECRET_KEY",
        "QA_CERT_MEMBER_EMAIL",
        "QA_CERT_MEMBER_PASSWORD",
        "QA_CERT_OPERATOR_EMAIL",
        "QA_CERT_OPERATOR_PASSWORD",
        "QA_CERT_FOREIGN_ORG_PROFILE_ID",
        "QA_CERT_STRIPE_WEBHOOK_SECRET_MARKETPLACE",
        "QA_CERT_MARKETPLACE_LISTING_ID",
      ],
    },
    production: EMPTY_REQUIREMENTS,
  },
  production: {
    staging: EMPTY_REQUIREMENTS,
    production: {
      vars: [
        "VERCEL_PRODUCTION_ORG_ID",
        "VERCEL_PRODUCTION_PROJECT_ID",
        "VERCEL_STAGING_PROJECT_ID",
        "SUPABASE_PRODUCTION_PROJECT_ID",
        "SUPABASE_STAGING_PROJECT_ID",
        "SUPABASE_STAGING_URL",
        "SUPABASE_PRODUCTION_URL",
        "PRODUCTION_BASE_URL",
      ],
      secrets: [
        "VERCEL_PRODUCTION_TOKEN",
        "SUPABASE_ACCESS_TOKEN",
        "SUPABASE_DB_PASSWORD",
        "SUPABASE_PROJECT_ID",
        "EXPECTED_SUPABASE_PROJECT_ID",
        "SMOKE_TEST_AUTH_BEARER_TOKEN",
      ],
    },
  },
}

export const REQUIRED_ENVIRONMENT_ITEMS = mergeRequirementSets(
  REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.predeploy,
  REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.certification,
  REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE.production,
)

export function requirementsForPhase(phase) {
  if (phase === "campaign") return REQUIRED_ENVIRONMENT_ITEMS
  return REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE[phase] || null
}

export function validateReadinessInput(input) {
  const failures = []
  if (!FULL_SHA.test(input.releaseSha || "")) {
    failures.push("release_sha must be a full 40-character Git SHA")
  }
  if (input.headSha && input.releaseSha && input.headSha !== input.releaseSha) {
    failures.push("local HEAD must match the requested release SHA")
  }
  if (input.originMainSha && input.releaseSha && input.originMainSha !== input.releaseSha) {
    failures.push("release SHA must already be origin/main before staging dispatch")
  }
  if (!input.requiredFiles.every((file) => existsSync(file))) {
    failures.push("one or more release gate files are missing")
  }
  if (input.mainProtected === false) {
    failures.push("main branch protection must be configured before staging dispatch")
  }
  if (input.githubEnvironmentValues) {
    failures.push(...validateEnvironmentIsolation(input.githubEnvironmentValues))
  }
  return failures
}

export function validateEnvironmentIsolation(values) {
  const failures = []
  const staging = values.staging || {}
  const production = values.production || {}

  const comparisons = [
    [
      staging.VERCEL_STAGING_PROJECT_ID,
      production.VERCEL_PRODUCTION_PROJECT_ID || staging.VERCEL_PRODUCTION_PROJECT_ID,
      "staging Vercel project must differ from production",
    ],
    [
      staging.SUPABASE_STAGING_PROJECT_ID,
      production.SUPABASE_PRODUCTION_PROJECT_ID || staging.SUPABASE_PRODUCTION_PROJECT_ID,
      "staging Supabase project must differ from production",
    ],
    [
      staging.SUPABASE_STAGING_URL,
      production.SUPABASE_PRODUCTION_URL || staging.SUPABASE_PRODUCTION_URL,
      "staging Supabase URL must differ from production",
    ],
  ]

  for (const [stagingValue, productionValue, message] of comparisons) {
    if (stagingValue && productionValue && stagingValue === productionValue) failures.push(message)
  }

  return failures
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

function githubRecords(kind, environment) {
  const fields = kind === "variable" ? "name,value" : "name"
  const output = run("gh", [kind, "list", "--env", environment, "--json", fields])
  if (!output) return []
  try {
    return JSON.parse(output)
  } catch {
    return []
  }
}

function githubNames(kind, environment) {
  return new Set(githubRecords(kind, environment).map((record) => record.name).filter(Boolean))
}

function githubValues(environment) {
  return Object.fromEntries(githubRecords("variable", environment).map((record) => [record.name, record.value]))
}

function githubRepo() {
  return run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])
}

function mainBranchProtected(repo) {
  if (!repo) return false
  return Boolean(run("gh", ["api", `repos/${repo}/branches/main/protection`, "--jq", ".url"]))
}

function missingItems(expected, actual) {
  return expected.filter((name) => !actual.has(name))
}

function formatList(items) {
  return items.length ? items.map((item) => `  - ${item}`).join("\n") : "  none"
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

export function buildDispatchCommands(releaseSha) {
  const sha = FULL_SHA.test(releaseSha || "") ? releaseSha : "<FULL_MAIN_SHA_AFTER_MERGE>"
  return [
    `gh workflow run supabase-migrations-staging.yml --ref main -f release_evidence=${shellQuote("DB-010+DB-002+DB-008 staging apply packet")} -f validated_base_sha=${shellQuote(sha)} -f target_confirmation=${shellQuote("<SUPABASE_STAGING_PROJECT_REF>")}`,
    `gh workflow run deploy-demo.yml --ref main -f release_sha=${shellQuote(sha)} -f migration_evidence=${shellQuote("<STAGING_MIGRATION_EVIDENCE_ID>")} -f approval_reference=${shellQuote("<RELEASE_APPROVAL_REFERENCE>")}`,
    `gh workflow run e2e.yml --ref main -f release_sha=${shellQuote(sha)}`,
    `npm run qa:simulation:provision -- --campaign-id SIM-$(date +%Y%m%d)-01 --manifest /absolute/protected/path/SIM-$(date +%Y%m%d)-01.json`,
  ]
}

function selectedPhase() {
  const explicit = process.argv.find((arg) => arg.startsWith("--phase="))?.slice("--phase=".length)
  return explicit || process.env.NEXT_PHASE_READINESS_PHASE || "campaign"
}

function main() {
  const phase = selectedPhase()
  const requirements = requirementsForPhase(phase)
  if (!requirements) {
    console.error(`Unknown readiness phase: ${phase}`)
    console.error(`Supported phases: ${Object.keys(REQUIRED_ENVIRONMENT_ITEMS_BY_PHASE).join(", ")}, campaign`)
    process.exitCode = 1
    return
  }

  const headSha = run("git", ["rev-parse", "HEAD"])
  const originMainSha = run("git", ["rev-parse", "origin/main"])
  const repo = githubRepo()
  const mainProtected = mainBranchProtected(repo)
  const releaseSha = process.env.RELEASE_SHA || headSha
  const requiredFiles = [
    ".github/workflows/deploy-demo.yml",
    ".github/workflows/e2e.yml",
    ".github/workflows/supabase-migrations-staging.yml",
    "scripts/ci/verify-deployed-release.mjs",
    "scripts/qa/provision-campaign-actors.ts",
    "supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql",
    "supabase/tests/db010_worker_actions_scope_contract.sql",
  ]
  const environmentValues = {}
  for (const environment of Object.keys(REQUIRED_ENVIRONMENT_ITEMS)) {
    environmentValues[environment] = githubValues(environment)
  }
  const failures = validateReadinessInput({
    releaseSha,
    headSha,
    originMainSha,
    requiredFiles,
    mainProtected,
    githubEnvironmentValues: environmentValues,
  })

  console.log(`Readiness phase: ${phase}`)
  console.log(`Release candidate: ${releaseSha || "unknown"}`)
  console.log(`origin/main: ${originMainSha || "unknown"}`)
  console.log(`GitHub repository: ${repo || "unknown"}`)
  console.log(`main branch protection: ${mainProtected ? "configured" : "missing"}`)
  console.log("")

  for (const [environment, expected] of Object.entries(requirements)) {
    const vars = new Set(Object.keys(environmentValues[environment] || {}))
    const secrets = githubNames("secret", environment)
    const missingVars = missingItems(expected.vars, vars)
    const missingSecrets = missingItems(expected.secrets, secrets)
    if (missingVars.length || missingSecrets.length) failures.push(`${environment} GitHub environment is missing required vars/secrets`)
    console.log(`${environment} missing vars:`)
    console.log(formatList(missingVars))
    console.log(`${environment} missing secrets:`)
    console.log(formatList(missingSecrets))
    console.log("")
  }

  console.log("Next dispatch commands after the missing environment items for this phase are set:")
  for (const command of buildDispatchCommands(releaseSha)) console.log(`  ${command}`)
  console.log("")

  if (failures.length) {
    console.error("Next phase is blocked:")
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
    return
  }
  console.log("Next phase is dispatch-ready.")
}

if (import.meta.url === `file://${process.argv[1]}`) main()
