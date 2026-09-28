/**
 * REP-201 — Governed command-center summary contract.
 *
 * Typed identity/version/lifecycle/access, domain counts with freshness/degraded
 * states, risks with remediation links. Contract-tested via Zod.
 *
 * Consumed by TOUR-203 BFF (`buildTourCommandCenterSummary`) and future
 * event-driven projections (REP-202).
 */

import { z } from "zod"

import { resolveReadinessRemediationUrl } from "@/lib/admin/readiness-contract"

/** Stable schema version for exports / read-model projections. */
export const COMMAND_CENTER_SUMMARY_CONTRACT_VERSION = 1 as const

export const commandCenterDomainKeySchema = z.enum([
  "shows",
  "people",
  "vendors",
  "finance",
  "logistics",
  "readiness",
  "publications",
])

export type CommandCenterDomainKey = z.infer<typeof commandCenterDomainKeySchema>

/** Distinct from zero: denied/unavailable must not look like empty success. */
export const commandCenterDomainStateSchema = z.enum([
  "ok",
  "partial",
  "stale",
  "unavailable",
  "denied",
])

export type CommandCenterDomainState = z.infer<typeof commandCenterDomainStateSchema>

export const commandCenterAccessClassSchema = z.enum([
  "org_member",
  "tour_collaborator",
  "legacy_owner",
  "capability_projection",
])

export const commandCenterDomainMetricSchema = z.object({
  domain: commandCenterDomainKeySchema,
  /** null when denied/unavailable — never a fake zero for failed loads. */
  count: z.number().int().nonnegative().nullable(),
  unit: z.literal("count"),
  state: commandCenterDomainStateSchema,
  /** Optional KPI catalog id (REP-001). */
  kpiId: z.string().min(1).nullable(),
  remediationUrl: z.string().min(1).nullable(),
  detail: z.string().nullable(),
})

export const commandCenterRiskSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  label: z.string().min(1),
  domain: z.string().min(1),
  remediationUrl: z.string().min(1),
})

export const commandCenterIdentitySchema = z.object({
  id: z.string().min(1),
  orgId: z.string().nullable(),
  name: z.string().nullable(),
  slug: z.string().nullable(),
  mainArtist: z.string().nullable(),
  status: z.string().nullable(),
  lifecycleState: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
})

export const commandCenterLifecycleSchema = z.object({
  state: z.string().nullable(),
  lastCommand: z.string().nullable(),
  lastTransitionAt: z.string().nullable(),
  publishedBy: z.string().nullable(),
})

export const commandCenterVersionsSchema = z.object({
  metadataVersion: z.number().int().positive(),
  planVersion: z.number().int().positive().nullable(),
  publishedVersion: z.number().int().positive().nullable(),
})

export const commandCenterAccessSchema = z.object({
  class: commandCenterAccessClassSchema,
  domains: z.object({
    overview: z.boolean(),
    shows: z.boolean(),
    people: z.boolean(),
    logistics: z.boolean(),
    finance: z.boolean(),
    vendors: z.boolean(),
    ticketing: z.boolean(),
    publications: z.boolean(),
    transitions: z.boolean(),
  }),
})

export const commandCenterFreshnessSchema = z.object({
  generatedAt: z.string().datetime(),
  isStale: z.boolean(),
  staleReasons: z.array(z.string()),
  p95TargetMs: z.number().int().positive(),
  /** True when any domain metric is unavailable/partial (not merely denied). */
  isDegraded: z.boolean(),
})

export const commandCenterSummaryContractSchema = z.object({
  contractVersion: z.literal(COMMAND_CENTER_SUMMARY_CONTRACT_VERSION),
  identity: commandCenterIdentitySchema,
  lifecycle: commandCenterLifecycleSchema,
  versions: commandCenterVersionsSchema,
  access: commandCenterAccessSchema,
  domainMetrics: z.array(commandCenterDomainMetricSchema).min(1),
  risks: z.array(commandCenterRiskSchema),
  freshness: commandCenterFreshnessSchema,
})

export type CommandCenterSummaryContract = z.infer<typeof commandCenterSummaryContractSchema>
export type CommandCenterDomainMetric = z.infer<typeof commandCenterDomainMetricSchema>
export type CommandCenterContractRisk = z.infer<typeof commandCenterRiskSchema>

export function parseCommandCenterSummaryContract(
  value: unknown,
): CommandCenterSummaryContract {
  return commandCenterSummaryContractSchema.parse(value)
}

export function safeParseCommandCenterSummaryContract(value: unknown) {
  return commandCenterSummaryContractSchema.safeParse(value)
}

/** Domain → default remediation deep link on the tour command center. */
export function resolveCommandCenterDomainRemediationUrl(args: {
  domain: CommandCenterDomainKey
  tourId: string
}): string {
  const base = `/admin/dashboard/tours/${args.tourId}`
  switch (args.domain) {
    case "shows":
      return `${base}?tab=shows`
    case "people":
      return `${base}?tab=people`
    case "vendors":
      return `${base}?tab=vendors`
    case "finance":
      return `${base}?tab=finance`
    case "logistics":
      return `${base}?tab=logistics`
    case "publications":
      return `${base}?tab=publications`
    case "readiness":
      return resolveReadinessRemediationUrl("/admin/dashboard/tours/{tourId}", {
        tourId: args.tourId,
      })
  }
}

export function buildCommandCenterDomainMetric(args: {
  domain: CommandCenterDomainKey
  tourId: string
  allowed: boolean
  count: number | null
  loadError: string | null
  kpiId?: string | null
  detail?: string | null
}): CommandCenterDomainMetric {
  if (!args.allowed) {
    return {
      domain: args.domain,
      count: null,
      unit: "count",
      state: "denied",
      kpiId: args.kpiId ?? null,
      remediationUrl: null,
      detail: "Capability denied — count suppressed",
    }
  }
  if (args.loadError) {
    return {
      domain: args.domain,
      count: null,
      unit: "count",
      state: "unavailable",
      kpiId: args.kpiId ?? null,
      remediationUrl: resolveCommandCenterDomainRemediationUrl({
        domain: args.domain,
        tourId: args.tourId,
      }),
      detail: args.loadError,
    }
  }
  return {
    domain: args.domain,
    count: args.count ?? 0,
    unit: "count",
    state: "ok",
    kpiId: args.kpiId ?? null,
    remediationUrl: resolveCommandCenterDomainRemediationUrl({
      domain: args.domain,
      tourId: args.tourId,
    }),
    detail: args.detail ?? null,
  }
}

export function resolveRiskRemediationUrl(args: {
  riskId: string
  domain: string
  tourId: string
}): string {
  if (args.riskId.startsWith("readiness.")) {
    const ruleId = args.riskId.slice("readiness.".length)
    if (ruleId === "overview" || ruleId === "dates" || ruleId === "events") {
      return resolveReadinessRemediationUrl("/admin/dashboard/tours/{tourId}", {
        tourId: args.tourId,
      })
    }
    return resolveReadinessRemediationUrl("/admin/dashboard/tours/{tourId}", {
      tourId: args.tourId,
    })
  }
  if (args.domain === "summary" || args.riskId === "summary.degraded") {
    return `/admin/dashboard/tours/${args.tourId}`
  }
  const asDomain = commandCenterDomainKeySchema.safeParse(args.domain)
  if (asDomain.success) {
    return resolveCommandCenterDomainRemediationUrl({
      domain: asDomain.data,
      tourId: args.tourId,
    })
  }
  return `/admin/dashboard/tours/${args.tourId}`
}
