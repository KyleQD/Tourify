/**
 * ROUTE-305 — Driver/rest policy profiles.
 *
 * Organizations select a named policy template that supplies the thresholds
 * used by the ROUTE-304 constraint engine. Individual fields may be overridden
 * with a reason and a capability gate.
 *
 * Important: the engine reports operational planning ASSUMPTIONS, not legal
 * advice. Every policy evaluation result includes an explicit disclaimer.
 *
 * Pure: no I/O, no `server-only`.
 */

import type { RouteConstraintPolicy } from "@/lib/admin/tour-route-constraints"
import { DEFAULT_ROUTE_CONSTRAINT_POLICY } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Named policy templates
// ---------------------------------------------------------------------------

export type RoutePolicyTemplateName =
  | "eu_working_time"     // EU Working Time Directive (rough operational equivalent)
  | "us_dot_hours"        // US DOT Hours of Service (rough operational equivalent)
  | "international_tour"  // Conservative long-haul touring policy
  | "relaxed"             // Minimal planning thresholds — must be explicitly selected
  | "custom"              // Org-defined fields only

export interface RoutePolicyTemplate {
  name: RoutePolicyTemplateName
  label: string
  description: string
  /** Assumptions the org must acknowledge. Never presented as legal advice. */
  assumptions: string[]
  /** Legal disclaimer affixed to every report using this template. */
  disclaimer: string
  thresholds: RouteConstraintPolicy
}

/**
 * Built-in policy templates.
 * Thresholds are conservative operational planning guides — NOT legal advice.
 */
export const ROUTE_POLICY_TEMPLATES: Readonly<Record<RoutePolicyTemplateName, RoutePolicyTemplate>> = {
  eu_working_time: {
    name: "eu_working_time",
    label: "EU Working Time (operational guide)",
    description:
      "Conservative operational thresholds inspired by EU Working Time Directive concepts. " +
      "Actual legal requirements depend on jurisdiction, role classification, and contract. " +
      "Consult qualified legal counsel.",
    assumptions: [
      "Max 9 hours driving per day (540 min) used as the operational planning limit.",
      "Minimum 11 hours daily rest (660 min) between drive segments.",
      "2-hour border/customs buffer for cross-border legs.",
      "These thresholds are operational assumptions, not legal compliance certification.",
    ],
    disclaimer:
      "This policy template provides operational planning guidance only and does not " +
      "constitute legal advice or compliance with the EU Working Time Directive, " +
      "EU Regulation 561/2006, or any national transport law. " +
      "Engage qualified legal and HR counsel for compliance obligations.",
    thresholds: {
      maxDriveMinutes: 540,         // 9h
      minRestMinutes: 660,          // 11h
      minArrivalBufferMinutes: 60,
      borderFerryBufferMinutes: 120,
    },
  },

  us_dot_hours: {
    name: "us_dot_hours",
    label: "US DOT Hours of Service (operational guide)",
    description:
      "Conservative operational thresholds inspired by US DOT Hours of Service concepts. " +
      "Actual FMCSA requirements depend on vehicle class, cargo, and exemptions. " +
      "Consult qualified legal counsel.",
    assumptions: [
      "Max 11 hours driving (660 min) used as the operational planning limit.",
      "Minimum 10 hours off-duty (600 min) between drive segments.",
      "30-minute break reflected in buffer time.",
      "These thresholds are operational assumptions, not FMCSA compliance certification.",
    ],
    disclaimer:
      "This policy template provides operational planning guidance only and does not " +
      "constitute legal advice or compliance with FMCSA Hours of Service regulations " +
      "(49 CFR Part 395) or any federal, state, or local transport law. " +
      "Engage qualified legal counsel for compliance obligations.",
    thresholds: {
      maxDriveMinutes: 660,         // 11h
      minRestMinutes: 600,          // 10h
      minArrivalBufferMinutes: 60,
      borderFerryBufferMinutes: 120,
    },
  },

  international_tour: {
    name: "international_tour",
    label: "International Tour (conservative)",
    description:
      "Conservative thresholds for international touring with cross-border legs, " +
      "ferry crossings, and multi-jurisdiction travel. Prioritizes buffer time over efficiency.",
    assumptions: [
      "Max 8 hours driving (480 min) per leg.",
      "Minimum 10 hours rest (600 min) between drive segments.",
      "3-hour buffer for border crossings and ferry boarding.",
      "These are operational planning assumptions for multi-jurisdiction touring.",
    ],
    disclaimer:
      "This template provides operational planning guidance. Actual requirements vary by " +
      "country, visa, customs, and crew classification. Consult legal, immigration, and " +
      "transport counsel for each jurisdiction on the tour.",
    thresholds: {
      maxDriveMinutes: 480,         // 8h
      minRestMinutes: 600,          // 10h
      minArrivalBufferMinutes: 90,
      borderFerryBufferMinutes: 180, // 3h
    },
  },

  relaxed: {
    name: "relaxed",
    label: "Relaxed (minimal thresholds)",
    description:
      "Minimal planning thresholds for use when the tour is entirely self-driving " +
      "personal vehicles or the org has specialist transport management. " +
      "Must be explicitly selected by an authorized user.",
    assumptions: [
      "Max 14 hours driving (840 min) — flagged only for extreme cases.",
      "Minimum 7 hours rest (420 min) between drive segments.",
      "This profile suppresses most travel warnings; use with caution.",
    ],
    disclaimer:
      "Relaxed thresholds significantly reduce constraint engine warnings. " +
      "This does not imply compliance with any transport law or safety standard. " +
      "All users and drivers remain responsible for applicable legal obligations.",
    thresholds: {
      maxDriveMinutes: 840,         // 14h
      minRestMinutes: 420,          // 7h
      minArrivalBufferMinutes: 30,
      borderFerryBufferMinutes: 60,
    },
  },

  custom: {
    name: "custom",
    label: "Custom (org-defined)",
    description: "Policy fields set individually by the organization.",
    assumptions: [
      "All thresholds are user-defined; no standard is implied.",
      "Org is responsible for validating thresholds against applicable requirements.",
    ],
    disclaimer:
      "Custom thresholds do not imply compliance with any legal or safety standard. " +
      "Engage qualified counsel to verify planning assumptions.",
    thresholds: DEFAULT_ROUTE_CONSTRAINT_POLICY,
  },
}

// ---------------------------------------------------------------------------
// Org-level policy record
// ---------------------------------------------------------------------------

export type RoutePolicyFieldName = keyof RouteConstraintPolicy

export interface RoutePolicyFieldOverride {
  field: RoutePolicyFieldName
  value: number
  reason: string
  /** The capability required to set this override (e.g. "route.manage.policy"). */
  requiredCapability: string
  setByUserId: string
  setAt: string
}

export interface OrgRoutePolicy {
  orgId: string
  templateName: RoutePolicyTemplateName
  overrides: RoutePolicyFieldOverride[]
  /** Freeform note on why this template was chosen (audit trail). */
  selectionReason?: string | null
  selectedByUserId?: string | null
  selectedAt?: string | null
}

// ---------------------------------------------------------------------------
// Policy resolution
// ---------------------------------------------------------------------------

export interface ResolvedRoutePolicy {
  orgId: string
  templateName: RoutePolicyTemplateName
  /** Effective thresholds after merging template + org overrides. */
  effective: RouteConstraintPolicy
  /** Applied overrides (only fields that differ from template). */
  appliedOverrides: RoutePolicyFieldOverride[]
  /** Template assumptions + override notes. */
  assumptions: string[]
  /** Legal disclaimer — always included. */
  disclaimer: string
}

/**
 * Resolve the effective policy for an org.
 *
 * Resolution order: org field override → template default → system default.
 * Returns a ResolvedRoutePolicy with full assumptions and disclaimer for the
 * constraint engine to embed in its result.
 */
export function resolveOrgRoutePolicy(orgPolicy: OrgRoutePolicy): ResolvedRoutePolicy {
  const template =
    ROUTE_POLICY_TEMPLATES[orgPolicy.templateName] ?? ROUTE_POLICY_TEMPLATES.custom

  const effective: RouteConstraintPolicy = { ...template.thresholds }

  const appliedOverrides: RoutePolicyFieldOverride[] = []
  for (const override of orgPolicy.overrides) {
    if (typeof override.value === "number" && Number.isFinite(override.value) && override.value >= 0) {
      ;(effective as unknown as Record<string, number>)[override.field] = override.value
      appliedOverrides.push(override)
    }
  }

  const overrideAssumptions = appliedOverrides.map(
    (o) => `Override: ${o.field} set to ${o.value} by ${o.setByUserId} — "${o.reason}"`,
  )

  return {
    orgId: orgPolicy.orgId,
    templateName: orgPolicy.templateName,
    effective,
    appliedOverrides,
    assumptions: [...template.assumptions, ...overrideAssumptions],
    disclaimer: template.disclaimer,
  }
}

/**
 * Return the default resolved policy (no org overrides, uses system defaults).
 * Used when no org policy is configured.
 */
export function defaultResolvedRoutePolicy(orgId: string): ResolvedRoutePolicy {
  return resolveOrgRoutePolicy({
    orgId,
    templateName: "custom",
    overrides: [],
  })
}

// ---------------------------------------------------------------------------
// Assumption disclosure helpers
// ---------------------------------------------------------------------------

/**
 * Build the full assumption disclosure string that must be included in any
 * route constraint report presented to users.
 *
 * The engine reports planning ASSUMPTIONS — not legal compliance.
 */
export function buildPolicyAssumptionDisclosure(resolved: ResolvedRoutePolicy): string {
  const lines: string[] = [
    `Policy template: ${ROUTE_POLICY_TEMPLATES[resolved.templateName]?.label ?? resolved.templateName}`,
    "",
    "Planning assumptions:",
    ...resolved.assumptions.map((a) => `  • ${a}`),
    "",
    "DISCLAIMER:",
    resolved.disclaimer,
  ]
  return lines.join("\n")
}

/**
 * Validate that an override is permitted.
 * Returns null when valid, or an error message when rejected.
 */
export function validatePolicyOverride(
  override: Omit<RoutePolicyFieldOverride, "setAt">,
  actorCapabilities: readonly string[],
): string | null {
  if (!override.reason?.trim()) return "Override reason is required."
  if (override.value < 0) return "Policy threshold values must be non-negative."
  if (!actorCapabilities.includes(override.requiredCapability)) {
    return `Missing capability "${override.requiredCapability}" for policy override.`
  }
  return null
}
