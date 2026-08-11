/**
 * ROUTE-305 — Driver/rest policy profiles tests.
 *
 * Acceptance criteria:
 *   - All four named templates have non-zero thresholds and a disclaimer.
 *   - resolveOrgRoutePolicy applies template defaults when no overrides.
 *   - Org overrides supersede template defaults for the overridden field.
 *   - Invalid overrides (negative value, missing reason, missing capability) are rejected.
 *   - Assumptions list always includes template assumptions + any applied overrides.
 *   - Disclaimer is always present in the resolved policy.
 *   - buildPolicyAssumptionDisclosure includes "DISCLAIMER:" and lists assumptions.
 *   - defaultResolvedRoutePolicy returns a valid resolved policy with custom template defaults.
 *   - Engine reports assumptions, not legal advice — disclaimer never omitted.
 */

import { describe, expect, it } from "vitest"

import {
  buildPolicyAssumptionDisclosure,
  defaultResolvedRoutePolicy,
  ROUTE_POLICY_TEMPLATES,
  resolveOrgRoutePolicy,
  validatePolicyOverride,
  type OrgRoutePolicy,
  type RoutePolicyTemplateName,
} from "@/lib/admin/tour-route-policy"
import { DEFAULT_ROUTE_CONSTRAINT_POLICY } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Template catalogue
// ---------------------------------------------------------------------------

const TEMPLATE_NAMES: RoutePolicyTemplateName[] = [
  "eu_working_time",
  "us_dot_hours",
  "international_tour",
  "relaxed",
  "custom",
]

describe("ROUTE-305 ROUTE_POLICY_TEMPLATES catalogue", () => {
  it("all five templates are defined", () => {
    for (const name of TEMPLATE_NAMES) {
      expect(ROUTE_POLICY_TEMPLATES[name], `Template ${name} must exist`).toBeDefined()
    }
  })

  it("every template has non-zero thresholds", () => {
    for (const name of TEMPLATE_NAMES) {
      const t = ROUTE_POLICY_TEMPLATES[name]
      expect(t.thresholds.maxDriveMinutes, `${name}.maxDriveMinutes`).toBeGreaterThan(0)
      expect(t.thresholds.minRestMinutes, `${name}.minRestMinutes`).toBeGreaterThan(0)
      expect(t.thresholds.minArrivalBufferMinutes, `${name}.minArrivalBufferMinutes`).toBeGreaterThanOrEqual(0)
      expect(t.thresholds.borderFerryBufferMinutes, `${name}.borderFerryBufferMinutes`).toBeGreaterThanOrEqual(0)
    }
  })

  it("every template has a non-empty disclaimer", () => {
    for (const name of TEMPLATE_NAMES) {
      expect(ROUTE_POLICY_TEMPLATES[name].disclaimer.length, `${name} disclaimer`).toBeGreaterThan(20)
    }
  })

  it("every template has at least one assumption", () => {
    for (const name of TEMPLATE_NAMES) {
      expect(ROUTE_POLICY_TEMPLATES[name].assumptions.length, `${name} assumptions`).toBeGreaterThan(0)
    }
  })

  it("eu_working_time thresholds are stricter than us_dot_hours", () => {
    expect(ROUTE_POLICY_TEMPLATES.eu_working_time.thresholds.maxDriveMinutes)
      .toBeLessThan(ROUTE_POLICY_TEMPLATES.us_dot_hours.thresholds.maxDriveMinutes)
  })

  it("international_tour has the largest border buffer", () => {
    const buffers = TEMPLATE_NAMES.map((n) => ROUTE_POLICY_TEMPLATES[n].thresholds.borderFerryBufferMinutes)
    const intlBuffer = ROUTE_POLICY_TEMPLATES.international_tour.thresholds.borderFerryBufferMinutes
    expect(intlBuffer).toBe(Math.max(...buffers))
  })

  it("relaxed template has the highest maxDriveMinutes", () => {
    const maxes = TEMPLATE_NAMES.map((n) => ROUTE_POLICY_TEMPLATES[n].thresholds.maxDriveMinutes)
    expect(ROUTE_POLICY_TEMPLATES.relaxed.thresholds.maxDriveMinutes).toBe(Math.max(...maxes))
  })
})

// ---------------------------------------------------------------------------
// resolveOrgRoutePolicy
// ---------------------------------------------------------------------------

describe("ROUTE-305 resolveOrgRoutePolicy", () => {
  const basePolicy: OrgRoutePolicy = {
    orgId: "org-1",
    templateName: "eu_working_time",
    overrides: [],
  }

  it("returns template thresholds when no overrides", () => {
    const resolved = resolveOrgRoutePolicy(basePolicy)
    expect(resolved.effective.maxDriveMinutes).toBe(
      ROUTE_POLICY_TEMPLATES.eu_working_time.thresholds.maxDriveMinutes,
    )
    expect(resolved.appliedOverrides).toHaveLength(0)
  })

  it("applies a single valid override", () => {
    const policy: OrgRoutePolicy = {
      ...basePolicy,
      overrides: [
        {
          field: "maxDriveMinutes",
          value: 480,
          reason: "Our driver contract limits to 8h",
          requiredCapability: "route.manage.policy",
          setByUserId: "user-admin",
          setAt: "2026-07-20T10:00:00Z",
        },
      ],
    }
    const resolved = resolveOrgRoutePolicy(policy)
    expect(resolved.effective.maxDriveMinutes).toBe(480)
    expect(resolved.appliedOverrides).toHaveLength(1)
  })

  it("override supersedes template value for the overridden field only", () => {
    const templateThreshold = ROUTE_POLICY_TEMPLATES.eu_working_time.thresholds.minRestMinutes
    const policy: OrgRoutePolicy = {
      ...basePolicy,
      overrides: [
        {
          field: "maxDriveMinutes",
          value: 300,
          reason: "Short legs only",
          requiredCapability: "route.manage.policy",
          setByUserId: "user-admin",
          setAt: "2026-07-20T10:00:00Z",
        },
      ],
    }
    const resolved = resolveOrgRoutePolicy(policy)
    expect(resolved.effective.maxDriveMinutes).toBe(300)
    // Non-overridden fields stay at template value
    expect(resolved.effective.minRestMinutes).toBe(templateThreshold)
  })

  it("multiple overrides are all applied", () => {
    const policy: OrgRoutePolicy = {
      ...basePolicy,
      overrides: [
        { field: "maxDriveMinutes", value: 400, reason: "r1", requiredCapability: "cap", setByUserId: "u1", setAt: "t1" },
        { field: "minRestMinutes", value: 700, reason: "r2", requiredCapability: "cap", setByUserId: "u1", setAt: "t1" },
      ],
    }
    const resolved = resolveOrgRoutePolicy(policy)
    expect(resolved.effective.maxDriveMinutes).toBe(400)
    expect(resolved.effective.minRestMinutes).toBe(700)
    expect(resolved.appliedOverrides).toHaveLength(2)
  })

  it("assumptions include template assumptions AND override notes", () => {
    const policy: OrgRoutePolicy = {
      ...basePolicy,
      overrides: [
        { field: "maxDriveMinutes", value: 400, reason: "Custom limit", requiredCapability: "cap", setByUserId: "u1", setAt: "t1" },
      ],
    }
    const resolved = resolveOrgRoutePolicy(policy)
    expect(resolved.assumptions.some((a) => a.includes("Override"))).toBe(true)
    expect(resolved.assumptions.some((a) => a.includes("Custom limit"))).toBe(true)
    // Template assumptions are also present
    expect(resolved.assumptions.length).toBeGreaterThan(1)
  })

  it("disclaimer is always included and non-empty", () => {
    const resolved = resolveOrgRoutePolicy(basePolicy)
    expect(resolved.disclaimer.length).toBeGreaterThan(20)
  })

  it("ignores overrides with negative values", () => {
    const policy: OrgRoutePolicy = {
      ...basePolicy,
      overrides: [
        { field: "maxDriveMinutes", value: -100, reason: "bad", requiredCapability: "cap", setByUserId: "u1", setAt: "t1" },
      ],
    }
    const resolved = resolveOrgRoutePolicy(policy)
    // Negative override silently ignored — template value retained
    expect(resolved.effective.maxDriveMinutes).toBe(
      ROUTE_POLICY_TEMPLATES.eu_working_time.thresholds.maxDriveMinutes,
    )
    expect(resolved.appliedOverrides).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// defaultResolvedRoutePolicy
// ---------------------------------------------------------------------------

describe("ROUTE-305 defaultResolvedRoutePolicy", () => {
  it("returns a valid resolved policy with custom template", () => {
    const resolved = defaultResolvedRoutePolicy("org-1")
    expect(resolved.orgId).toBe("org-1")
    expect(resolved.templateName).toBe("custom")
    expect(resolved.effective).toMatchObject(DEFAULT_ROUTE_CONSTRAINT_POLICY)
    expect(resolved.appliedOverrides).toHaveLength(0)
  })

  it("disclaimer is always present", () => {
    expect(defaultResolvedRoutePolicy("org-x").disclaimer.length).toBeGreaterThan(20)
  })
})

// ---------------------------------------------------------------------------
// validatePolicyOverride
// ---------------------------------------------------------------------------

describe("ROUTE-305 validatePolicyOverride", () => {
  const validOverride = {
    field: "maxDriveMinutes" as const,
    value: 480,
    reason: "Our contract limit",
    requiredCapability: "route.manage.policy",
    setByUserId: "u1",
  }

  it("returns null for a valid override with required capability", () => {
    expect(validatePolicyOverride(validOverride, ["route.manage.policy"])).toBeNull()
  })

  it("rejects when reason is missing", () => {
    const result = validatePolicyOverride({ ...validOverride, reason: "" }, ["route.manage.policy"])
    expect(result).toMatch(/reason/)
  })

  it("rejects negative value", () => {
    const result = validatePolicyOverride({ ...validOverride, value: -1 }, ["route.manage.policy"])
    expect(result).toMatch(/non-negative/)
  })

  it("rejects when actor lacks required capability", () => {
    const result = validatePolicyOverride(validOverride, ["other.cap"])
    expect(result).toMatch(/capability/)
  })

  it("rejects when capabilities list is empty", () => {
    const result = validatePolicyOverride(validOverride, [])
    expect(result).toMatch(/capability/)
  })
})

// ---------------------------------------------------------------------------
// buildPolicyAssumptionDisclosure
// ---------------------------------------------------------------------------

describe("ROUTE-305 buildPolicyAssumptionDisclosure", () => {
  it("includes DISCLAIMER header", () => {
    const resolved = resolveOrgRoutePolicy({ orgId: "org-1", templateName: "eu_working_time", overrides: [] })
    const text = buildPolicyAssumptionDisclosure(resolved)
    expect(text).toContain("DISCLAIMER:")
  })

  it("includes all template assumptions in the output", () => {
    const resolved = resolveOrgRoutePolicy({ orgId: "org-1", templateName: "us_dot_hours", overrides: [] })
    const text = buildPolicyAssumptionDisclosure(resolved)
    for (const assumption of resolved.assumptions) {
      expect(text).toContain(assumption)
    }
  })

  it("includes template label in the output", () => {
    const resolved = resolveOrgRoutePolicy({ orgId: "org-1", templateName: "international_tour", overrides: [] })
    const text = buildPolicyAssumptionDisclosure(resolved)
    expect(text).toContain(ROUTE_POLICY_TEMPLATES.international_tour.label)
  })

  it("override notes appear in disclosure", () => {
    const resolved = resolveOrgRoutePolicy({
      orgId: "org-1",
      templateName: "eu_working_time",
      overrides: [
        { field: "maxDriveMinutes", value: 400, reason: "Short legs only", requiredCapability: "cap", setByUserId: "u1", setAt: "t1" },
      ],
    })
    const text = buildPolicyAssumptionDisclosure(resolved)
    expect(text).toContain("Short legs only")
  })
})

// ---------------------------------------------------------------------------
// Integration: resolvedPolicy.effective feeds RouteConstraintPolicy
// ---------------------------------------------------------------------------

describe("ROUTE-305 integration — resolved policy feeds constraint engine policy", () => {
  it("eu_working_time effective thresholds can be passed directly to evaluateRouteConstraints", async () => {
    const { evaluateRouteConstraints } = await import("@/lib/admin/tour-route-constraints")
    const resolved = resolveOrgRoutePolicy({ orgId: "org-1", templateName: "eu_working_time", overrides: [] })
    // Passing empty route — just verifies the types are compatible
    const result = evaluateRouteConstraints({ stops: [], legs: [], policy: resolved.effective })
    expect(result.violations).toHaveLength(0)
  })
})
