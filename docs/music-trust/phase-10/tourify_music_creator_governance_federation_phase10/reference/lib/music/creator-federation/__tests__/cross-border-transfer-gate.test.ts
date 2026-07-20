import { describe, expect, it } from "vitest"
import { authorizeCrossBorderTransfer } from "../cross-border-transfer-gate"

describe("authorizeCrossBorderTransfer", () => {
  it("defaults to deny when transfer mechanism is missing", () => {
    const result = authorizeCrossBorderTransfer({ purposeAuthorized: true, contributionAuthorized: true, transferMechanismApproved: false, localizationSatisfied: true, onwardTransferControlled: true, retentionDefined: true, legalHoldAllowsTransfer: true })
    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain("transfer_mechanism_missing")
  })
})
