import { describe, expect, it } from "vitest"
import { verifyFederationCredential } from "../credential-trust-policy"

describe("verifyFederationCredential", () => {
  it("denies a suspended credential", () => {
    const result = verifyFederationCredential({ issuerTrusted: true, schemaApproved: true, proofValid: true, holderBindingValid: true, status: "suspended", jurisdictionAllowed: true, scopeAllowed: true, sourceRecordCurrent: true, highRiskAction: true })
    expect(result.valid).toBe(false)
  })
})
