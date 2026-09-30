import { describe, expect, it } from "vitest"

import {
  LIVE_EVENT_ROLE_CATALOG,
  getLiveEventRoleDefinition,
} from "@/lib/staff/live-event-role-catalog"

describe("live event workforce role catalog", () => {
  it("contains every role from the supplied festival workforce reference", () => {
    expect(LIVE_EVENT_ROLE_CATALOG).toHaveLength(74)
  })

  it("uses unique stable keys", () => {
    const keys = LIVE_EVENT_ROLE_CATALOG.map((role) => role.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("defines job, duties, qualifications, essentials, and management workflow for every role", () => {
    for (const role of LIVE_EVENT_ROLE_CATALOG) {
      expect(role.job_summary.trim().length).toBeGreaterThan(20)
      expect(role.duties.length).toBeGreaterThanOrEqual(2)
      expect(role.qualifications.length).toBeGreaterThanOrEqual(2)
      expect(role.essentials.length).toBeGreaterThanOrEqual(2)
      expect(role.workflow_requirements.management_surfaces).toContain("workforce")
      expect(role.workflow_requirements.management_surfaces).toContain("communications")
      expect(role.workflow_requirements.lifecycle).toContain("onboard")
      expect(role.workflow_requirements.lifecycle).toContain("execute")
    }
  })

  it("carries structured credential requirements for regulated or licensed roles", () => {
    const expected = [
      "bartender",
      "drone-operator",
      "entertainment-lawyer",
      "medic-team",
      "pyro-technician",
      "security-guard",
      "shuttle-driver",
    ]

    for (const key of expected) {
      const role = getLiveEventRoleDefinition(key)
      expect(role).not.toBeNull()
      expect(role?.required_credentials.length).toBeGreaterThan(0)
      expect(role?.required_credentials.some((credential) => credential.isRequired)).toBe(true)
    }
  })

  it("includes core festival production and management roles", () => {
    for (const key of [
      "audio-engineer",
      "production-manager",
      "stage-manager",
      "stagehand",
      "tour-manager",
      "ticketing-manager",
      "weather-monitoring-team",
      "wristband-credential-printing",
    ]) {
      expect(getLiveEventRoleDefinition(key)?.key).toBe(key)
    }
  })
})
