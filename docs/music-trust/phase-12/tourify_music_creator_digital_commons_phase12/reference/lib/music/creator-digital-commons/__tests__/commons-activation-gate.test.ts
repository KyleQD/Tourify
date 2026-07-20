import { describe, expect, it } from "vitest"
import { evaluateCommonsActivation } from "../commons-activation-gate"

describe("evaluateCommonsActivation", () => {
  it("requires two independent implementations and operators", () => {
    const result = evaluateCommonsActivation({ separateStewardApproved: true, publicGovernanceApproved: true, localSovereigntyTested: true, criticalAssetCustodyVerified: true, independentImplementations: 1, independentOperators: 1, conformancePassed: true, tourifyExitDrillPassed: true, fundingRunwayMonths: 18, legalPrivacySecurityAccessibilityApproved: true, publicReviewComplete: true, scopeAndJurisdictionsDefined: true, policyVersion: "1" })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("two_implementations_required")
  })
})
