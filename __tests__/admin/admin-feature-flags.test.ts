import { describe, expect, it } from "vitest"

import {
  ADMIN_FEATURE_FLAG_REGISTRY,
  validateAdminFeatureFlagRegistry,
} from "@/lib/admin/feature-flags/registry"
import { resolveAdminFeatureFlag } from "@/lib/admin/feature-flags/resolver"

const definition = {
  key: "admin_ticketing_canonical_v1",
  safe_default: false,
  environments: ["staging", "production"],
  state: "active" as const,
  expires_at: "2027-12-31T23:59:59.000Z",
}

describe("REL-008 governed Admin feature flags", () => {
  it("requires complete, unexpired registry metadata", () => {
    expect(ADMIN_FEATURE_FLAG_REGISTRY.length).toBeGreaterThanOrEqual(2)
    expect(validateAdminFeatureFlagRegistry(new Date("2026-07-21T00:00:00.000Z"))).toEqual([])
  })

  it("fails missing assignments and unsupported environments to the safe default", () => {
    expect(resolveAdminFeatureFlag({
      definition,
      assignment: null,
      orgId: "org-a",
      environment: "production",
    })).toMatchObject({ enabled: false, state: "unavailable", reason: "assignment_missing" })
    expect(resolveAdminFeatureFlag({
      definition,
      assignment: null,
      orgId: "org-a",
      environment: "local",
    })).toMatchObject({ enabled: false, state: "unavailable", reason: "environment_not_allowed" })
  })

  it("fails expired/retired definitions closed and resolves explicit rollout deterministically", () => {
    expect(resolveAdminFeatureFlag({
      definition: { ...definition, state: "retired" },
      assignment: null,
      orgId: "org-a",
      environment: "production",
    }).enabled).toBe(false)
    expect(resolveAdminFeatureFlag({
      definition,
      assignment: { enabled: true, rollout_percentage: 100, environment: "production", assignment_version: 3 },
      orgId: "org-a",
      environment: "production",
      now: new Date("2026-07-21T00:00:00.000Z"),
    })).toMatchObject({ enabled: true, state: "ready", assignmentVersion: 3 })
  })
})
