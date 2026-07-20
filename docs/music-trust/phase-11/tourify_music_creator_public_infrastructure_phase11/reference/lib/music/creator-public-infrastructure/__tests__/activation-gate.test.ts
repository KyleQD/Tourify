import { describe, expect, it } from "vitest"
import { evaluateInfrastructureActivation } from "../infrastructure-activation-gate"

describe("evaluateInfrastructureActivation", () => {
  it("requires every approval", () => {
    const result = evaluateInfrastructureActivation({ separateEntityApproved: true, governanceApproved: true, fundingApproved: true, standardsProfilesApproved: true, twoIndependentImplementationsPassed: false, securityApproved: true, privacyApproved: true, accessibilityApproved: true, jurisdictionApproved: true, rollbackProven: true })
    expect(result.allowed).toBe(false)
  })
})
