/**
 * REP-203 — Protected aggregate policy for reporting / command-center metrics.
 *
 * Finance, personnel, ticket, customer, and incident aggregates require capability.
 * Unauthorized callers get null values (never fake zero) and suppressed
 * dimensions/drilldowns so counts cannot be inferred from empty breakdowns.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import type {
  CommandCenterDomainKey,
  CommandCenterDomainMetric,
  CommandCenterSummaryContract,
} from "@/lib/admin/command-center-summary-contract"
import { canViewFinanceProtectedFields } from "@/lib/admin/finance-field-projection"
import { projectFinanceTransactionRows } from "@/lib/admin/finance-field-projection"
import { projectWorkforceRecords } from "@/lib/admin/workforce-field-projections"

export type ProtectedAggregateClass =
  | "finance"
  | "personnel"
  | "ticket"
  | "customer"
  | "incident"

export type ProtectedAggregateAccess =
  | "denied"
  | "aggregate_only"
  | "dimensions"
  | "full"

export interface ProtectedAggregateClassPolicy {
  class: ProtectedAggregateClass
  description: string
  /** Minimum capability to see the aggregate value (not dimensions). */
  viewAnyOf: readonly AdminCapability[]
  /** Capability required for person/customer/money dimensions and drilldowns. */
  dimensionAnyOf: readonly AdminCapability[]
  /** Dimension keys that leak protected identity if returned when unauthorized. */
  sensitiveDimensions: readonly string[]
}

export const PROTECTED_AGGREGATE_POLICIES: readonly ProtectedAggregateClassPolicy[] = [
  {
    class: "finance",
    description: "Budget, settlement, and transaction aggregates",
    viewAnyOf: ["finance.view", "finance.manage", "finance.approve", "finance.pay"],
    dimensionAnyOf: ["finance.manage", "finance.approve", "finance.pay"],
    sensitiveDimensions: [
      "vendor_name",
      "payment_reference",
      "payment_method",
      "customer_id",
      "payer_id",
      "amount_by_person",
    ],
  },
  {
    class: "personnel",
    description: "Staffing headcount and assignment aggregates",
    viewAnyOf: ["workforce.view", "workforce.manage", "hiring.manage"],
    dimensionAnyOf: ["workforce.manage", "hiring.manage"],
    sensitiveDimensions: [
      "member_email",
      "user_id",
      "staff_member_id",
      "emergency_contact",
      "rate",
      "wage",
    ],
  },
  {
    class: "ticket",
    description: "Inventory, sales, scan, and refund aggregates",
    viewAnyOf: ["ticketing.view", "ticketing.manage", "ticketing.scan", "ticketing.refund"],
    dimensionAnyOf: ["ticketing.manage", "ticketing.refund"],
    sensitiveDimensions: [
      "credential_token",
      "buyer_email",
      "customer_id",
      "order_id",
      "scan_code",
    ],
  },
  {
    class: "customer",
    description: "Buyer/attendee identity aggregates",
    viewAnyOf: ["ticketing.manage", "finance.manage", "audit.view"],
    dimensionAnyOf: ["ticketing.manage", "finance.manage", "audit.view"],
    sensitiveDimensions: [
      "customer_id",
      "buyer_email",
      "attendee_name",
      "phone",
      "email",
    ],
  },
  {
    class: "incident",
    description: "Incident volume and severity aggregates",
    viewAnyOf: ["event.live_ops", "audit.view"],
    dimensionAnyOf: ["event.live_ops", "audit.view"],
    sensitiveDimensions: [
      "reporter_id",
      "involved_parties",
      "incident_narrative",
      "severity_notes",
    ],
  },
] as const

export interface ProtectedAggregateMetric {
  metricId: string
  aggregateClass: ProtectedAggregateClass
  value: number | null
  unit: string
  dimensions: Record<string, unknown>
  drilldownUrl: string | null
  drilldownToken: string | null
  state: "ok" | "denied" | "dimensions_redacted"
  suppressedDimensions: string[]
}

/** Map command-center domain keys onto protected aggregate classes when applicable. */
export function resolveAggregateClassForDomain(
  domain: CommandCenterDomainKey,
): ProtectedAggregateClass | null {
  switch (domain) {
    case "finance":
      return "finance"
    case "people":
      return "personnel"
    default:
      return null
  }
}

export function getProtectedAggregatePolicy(
  aggregateClass: ProtectedAggregateClass,
): ProtectedAggregateClassPolicy {
  const policy = PROTECTED_AGGREGATE_POLICIES.find((row) => row.class === aggregateClass)
  if (!policy) throw new Error(`Unknown protected aggregate class: ${aggregateClass}`)
  return policy
}

export function resolveProtectedAggregateAccess(args: {
  aggregateClass: ProtectedAggregateClass
  capabilities: readonly AdminCapability[]
}): ProtectedAggregateAccess {
  const policy = getProtectedAggregatePolicy(args.aggregateClass)
  const canView = policy.viewAnyOf.some((cap) => hasAdminCapability(args.capabilities, cap))
  if (!canView) return "denied"

  // Finance: FIN-102 — view sees aggregates; manage/pay/approve see money dimensions.
  if (args.aggregateClass === "finance") {
    if (canViewFinanceProtectedFields(args.capabilities)) return "full"
    return "aggregate_only"
  }

  const canDimensions = policy.dimensionAnyOf.some((cap) =>
    hasAdminCapability(args.capabilities, cap),
  )
  if (canDimensions) return "full"
  return "aggregate_only"
}

export function projectProtectedAggregate(args: {
  metricId: string
  aggregateClass: ProtectedAggregateClass
  value: number | null
  unit?: string
  dimensions?: Record<string, unknown>
  drilldownUrl?: string | null
  drilldownToken?: string | null
  capabilities: readonly AdminCapability[]
}): ProtectedAggregateMetric {
  const access = resolveProtectedAggregateAccess({
    aggregateClass: args.aggregateClass,
    capabilities: args.capabilities,
  })
  const policy = getProtectedAggregatePolicy(args.aggregateClass)
  const unit = args.unit || "count"

  if (access === "denied") {
    return {
      metricId: args.metricId,
      aggregateClass: args.aggregateClass,
      value: null,
      unit,
      dimensions: {},
      drilldownUrl: null,
      drilldownToken: null,
      state: "denied",
      suppressedDimensions: [...policy.sensitiveDimensions],
    }
  }

  if (access === "aggregate_only") {
    const suppressed = Object.keys(args.dimensions || {}).filter((key) =>
      policy.sensitiveDimensions.includes(key)
      || /email|phone|user_id|customer|token|narrative|payment/i.test(key),
    )
    const safeDimensions: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(args.dimensions || {})) {
      if (!suppressed.includes(key)) safeDimensions[key] = value
    }
    return {
      metricId: args.metricId,
      aggregateClass: args.aggregateClass,
      value: args.value,
      unit,
      dimensions: safeDimensions,
      // Drilldowns can leak existence of protected rows — suppress without elevated access.
      drilldownUrl: null,
      drilldownToken: null,
      state: suppressed.length > 0 || args.drilldownUrl || args.drilldownToken
        ? "dimensions_redacted"
        : "ok",
      suppressedDimensions: [
        ...suppressed,
        ...(args.drilldownUrl ? ["drilldownUrl"] : []),
        ...(args.drilldownToken ? ["drilldownToken"] : []),
      ],
    }
  }

  return {
    metricId: args.metricId,
    aggregateClass: args.aggregateClass,
    value: args.value,
    unit,
    dimensions: { ...(args.dimensions || {}) },
    drilldownUrl: args.drilldownUrl ?? null,
    drilldownToken: args.drilldownToken ?? null,
    state: "ok",
    suppressedDimensions: [],
  }
}

/**
 * Apply REP-203 policy to command-center domain metrics.
 * Unauthorized protected domains → count null + denied (no zero inference).
 */
export function projectCommandCenterDomainMetrics(args: {
  metrics: CommandCenterDomainMetric[]
  capabilities: readonly AdminCapability[]
  tourId: string
}): CommandCenterDomainMetric[] {
  return args.metrics.map((metric) => {
    const aggregateClass = resolveAggregateClassForDomain(metric.domain)
    if (!aggregateClass) return metric

    // Honor prior denied/unavailable from access/load gates.
    if (metric.state === "denied" || metric.state === "unavailable") return metric

    const projected = projectProtectedAggregate({
      metricId: metric.kpiId || `domain.${metric.domain}`,
      aggregateClass,
      value: metric.count,
      dimensions: metric.detail ? { detail: metric.detail } : {},
      drilldownUrl: metric.remediationUrl,
      capabilities: args.capabilities,
    })

    if (projected.state === "denied") {
      return {
        ...metric,
        count: null,
        state: "denied",
        remediationUrl: null,
        detail: "Capability denied — aggregate suppressed",
        kpiId: metric.kpiId,
      }
    }

    if (projected.state === "dimensions_redacted") {
      return {
        ...metric,
        count: projected.value,
        // Keep operational remediation to the domain tab (not a row-level drilldown).
        remediationUrl: metric.remediationUrl,
        detail:
          typeof projected.dimensions.detail === "string"
            ? projected.dimensions.detail
            : metric.detail,
      }
    }

    return metric
  })
}

export function projectCommandCenterSummaryContract(args: {
  contract: CommandCenterSummaryContract
  capabilities: readonly AdminCapability[]
}): CommandCenterSummaryContract {
  return {
    ...args.contract,
    domainMetrics: projectCommandCenterDomainMetrics({
      metrics: args.contract.domainMetrics,
      capabilities: args.capabilities,
      tourId: args.contract.identity.id,
    }),
  }
}

/** Hydration slices: redact protected row fields without changing aggregate shape. */
export function projectCommandCenterHydrationSlices(args: {
  teamMembers: Record<string, unknown>[]
  financeTransactions: Record<string, unknown>[]
  vendors: Record<string, unknown>[]
  capabilities: readonly AdminCapability[]
}): {
  teamMembers: Record<string, unknown>[]
  financeTransactions: Record<string, unknown>[]
  vendors: Record<string, unknown>[]
} {
  return {
    teamMembers: projectWorkforceRecords(args.teamMembers, {
      capabilities: args.capabilities,
    }) as Record<string, unknown>[],
    financeTransactions: projectFinanceTransactionRows({
      rows: args.financeTransactions,
      capabilities: args.capabilities,
    }),
    vendors: args.vendors.map((row) => {
      if (hasAdminCapability(args.capabilities, "vendor.sensitive")) return row
      const next = { ...row }
      for (const key of ["tax_id_last4", "payment_account_last4", "primary_contact_email"] as const) {
        if (key in next && next[key] != null) next[key] = null
      }
      return next
    }),
  }
}

/**
 * True when a response would leak inference: denied aggregate presented as zero
 * or drilldown present without dimension access.
 */
export function hasProtectedAggregateInferenceLeak(args: {
  metric: ProtectedAggregateMetric
}): boolean {
  if (args.metric.state === "denied" && args.metric.value === 0) return true
  if (args.metric.state === "denied" && args.metric.drilldownUrl) return true
  if (args.metric.state === "denied" && Object.keys(args.metric.dimensions).length > 0)
    return true
  if (
    args.metric.state === "dimensions_redacted"
    && (args.metric.drilldownUrl || args.metric.drilldownToken)
  ) {
    return true
  }
  return false
}
