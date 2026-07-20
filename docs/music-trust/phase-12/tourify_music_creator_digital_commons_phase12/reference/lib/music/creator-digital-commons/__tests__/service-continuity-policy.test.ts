import { describe, expect, it } from "vitest"
import { evaluateContinuity } from "../service-continuity-policy"

describe("evaluateContinuity", () => {
  it("requires a real Tourify-unavailable drill", () => {
    const result = evaluateContinuity({ tourifyUnavailable: false, independentBuildSucceeded: true, independentOperatorAvailable: true, currentAssetEscrowVerified: true, exportRestoreSucceeded: true, keyAndDomainRecoverySucceeded: true, participantRecordsPreserved: true, rightsSourcesUnchanged: true, policyVersion: "1" })
    expect(result.allowed).toBe(false)
  })
})
