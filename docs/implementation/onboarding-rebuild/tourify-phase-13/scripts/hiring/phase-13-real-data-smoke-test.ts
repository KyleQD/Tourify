#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js"
import { getPhase13EnvironmentConfig } from "@/lib/testing/hiring-real-data-test-config"
import { buildEmployerQueryParams, fail, fetchJson, pass, skip, summarizeResults, warn } from "@/lib/testing/hiring-real-data-test-helpers"
import type { Phase13CheckResult, Phase13ScenarioConfig, Phase13SmokeTestReport } from "@/types/hiring-real-data-test"

async function checkTableExists(args: {
  supabase: ReturnType<typeof createClient>
  table: string
}): Promise<Phase13CheckResult> {
  const { error } = await args.supabase.from(args.table).select("id").limit(1)

  if (error) {
    return fail({
      scenarioKey: "global",
      name: `Table exists: ${args.table}`,
      message: error.message,
      metadata: { table: args.table },
    })
  }

  return pass({
    scenarioKey: "global",
    name: `Table exists: ${args.table}`,
    message: `${args.table} can be queried.`,
  })
}

async function checkEmployerDashboard(args: {
  appUrl: string
  scenario: Phase13ScenarioConfig
}): Promise<Phase13CheckResult> {
  const query = buildEmployerQueryParams(args.scenario)
  const result = await fetchJson({ url: `${args.appUrl}/api/hiring/dashboard?${query}` })

  if (!result.ok) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Dashboard API returns real data",
      message: `Expected 2xx from dashboard API, received ${result.status}.`,
      metadata: { response: result.data ?? result.text },
    })
  }

  return pass({
    scenarioKey: args.scenario.key,
    name: "Dashboard API returns real data",
    message: "Dashboard API returned a successful response for this employer scope.",
  })
}

async function checkApplicationsApi(args: {
  appUrl: string
  scenario: Phase13ScenarioConfig
}): Promise<Phase13CheckResult> {
  const query = buildEmployerQueryParams(args.scenario)
  const result = await fetchJson({ url: `${args.appUrl}/api/hiring/applications?${query}` })

  if (!result.ok) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Applications API returns real data",
      message: `Expected 2xx from applications API, received ${result.status}.`,
      metadata: { response: result.data ?? result.text },
    })
  }

  return pass({
    scenarioKey: args.scenario.key,
    name: "Applications API returns real data",
    message: "Applications API returned a successful response for this employer scope.",
  })
}

async function checkRosterApi(args: {
  appUrl: string
  scenario: Phase13ScenarioConfig
}): Promise<Phase13CheckResult> {
  const query = buildEmployerQueryParams(args.scenario)
  const result = await fetchJson({ url: `${args.appUrl}/api/hiring/roster?${query}` })

  if (!result.ok) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Roster API returns real data",
      message: `Expected 2xx from roster API, received ${result.status}.`,
      metadata: { response: result.data ?? result.text },
    })
  }

  return pass({
    scenarioKey: args.scenario.key,
    name: "Roster API returns real data",
    message: "Roster API returned a successful response for this employer scope.",
  })
}

async function checkTokenOnboarding(args: {
  appUrl: string
  scenario: Phase13ScenarioConfig
}): Promise<Phase13CheckResult> {
  if (!args.scenario.invitationToken) {
    return skip({
      scenarioKey: args.scenario.key,
      name: "Token onboarding payload resolves",
      message: "No invitation token configured for this scenario.",
    })
  }

  const result = await fetchJson({ url: `${args.appUrl}/api/onboarding/${args.scenario.invitationToken}` })

  if (!result.ok) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Token onboarding payload resolves",
      message: `Expected 2xx from token onboarding API, received ${result.status}.`,
      metadata: { response: result.data ?? result.text },
    })
  }

  return pass({
    scenarioKey: args.scenario.key,
    name: "Token onboarding payload resolves",
    message: "Token onboarding API returned a valid response.",
  })
}

async function checkBackfilledEmployerScope(args: {
  supabase: ReturnType<typeof createClient>
  scenario: Phase13ScenarioConfig
}): Promise<Phase13CheckResult> {
  if (!args.scenario.jobPostingId) {
    return skip({
      scenarioKey: args.scenario.key,
      name: "Job posting has employer scope",
      message: "No job posting id configured for this scenario.",
    })
  }

  const { data, error } = await args.supabase
    .from("job_posting_templates")
    .select("id, employer_entity_type, employer_entity_id, venue_id")
    .eq("id", args.scenario.jobPostingId)
    .maybeSingle()

  if (error) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Job posting has employer scope",
      message: error.message,
    })
  }

  if (!data) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Job posting has employer scope",
      message: "No job_posting_templates row found for the configured id.",
    })
  }

  if (data.employer_entity_type !== args.scenario.employer.entityType || data.employer_entity_id !== args.scenario.employer.entityId) {
    return fail({
      scenarioKey: args.scenario.key,
      name: "Job posting has employer scope",
      message: "Job posting employer scope does not match the configured scenario employer.",
      metadata: { expected: args.scenario.employer, actual: data },
    })
  }

  return pass({
    scenarioKey: args.scenario.key,
    name: "Job posting has employer scope",
    message: "Job posting has correct employer_entity_type and employer_entity_id.",
  })
}

async function run() {
  const startedAt = new Date().toISOString()
  const config = getPhase13EnvironmentConfig()
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const results: Phase13CheckResult[] = []

  for (const table of [
    "job_posting_templates",
    "job_applications",
    "staff_onboarding_candidates",
    "staff_invitations",
    "staff_onboarding_templates",
    "onboarding_responses",
    "staff_documents",
    "staff_members",
    "employment_assignments",
    "hiring_audit_events",
  ]) {
    results.push(await checkTableExists({ supabase, table }))
  }

  if (config.scenarios.length === 0) {
    results.push(warn({
      scenarioKey: "global",
      name: "Scenario env vars configured",
      message: "No PHASE13_* scenario env vars were configured. Only global table checks were run.",
    }))
  }

  for (const scenario of config.scenarios) {
    results.push(await checkEmployerDashboard({ appUrl: config.appUrl, scenario }))
    results.push(await checkApplicationsApi({ appUrl: config.appUrl, scenario }))
    results.push(await checkRosterApi({ appUrl: config.appUrl, scenario }))
    results.push(await checkTokenOnboarding({ appUrl: config.appUrl, scenario }))
    results.push(await checkBackfilledEmployerScope({ supabase, scenario }))
  }

  const summary = summarizeResults(results)
  const report: Phase13SmokeTestReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    ...summary,
    results,
  }

  console.log(JSON.stringify(report, null, 2))

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
