import { evaluateConstitutionalActivation } from "../constitutional-activation-gate"
import { classifyAmendment } from "../amendment-classification"
import { evaluateLocalSovereignty } from "../local-sovereignty-gate"
import { evaluateAssetTransfer } from "../asset-lock-transfer-gate"
import { evaluateFundamentalRights } from "../fundamental-rights-policy"
import {
  HARD_DISABLED_PROTOCOL_CONSTITUTION_FLAGS,
  DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS,
} from "../creator-protocol-constitution-flags"

describe("Phase 13 protocol constitution gates", () => {
  it("does not allow constitutional activation without the full package", () => {
    const result = evaluateConstitutionalActivation({
      entityApproved: true,
      charterRatified: true,
      localOrganizations: 1,
      independentImplementations: 2,
      independentOperators: 2,
      appealsOperational: true,
      successionTested: true,
      tourifyUnavailableTested: true,
      securityApproved: true,
      privacyApproved: true,
      accessibilityApproved: true,
      fundingApproved: true,
      unresolvedCriticalBlockers: 0,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("INSUFFICIENT_LOCAL_ORGANIZATIONS")
  })

  it("classifies fundamental amendments when reserved powers or rights change", () => {
    expect(
      classifyAmendment({
        changesFundamentalRight: true,
        changesReservedPower: false,
        breaksInteroperability: false,
        changesOperatorConfigurationOnly: false,
        isTypographicalOnly: false,
      }),
    ).toBe("fundamental")
  })

  it("default-denies local sovereignty without explicit delegation", () => {
    const result = evaluateLocalSovereignty({
      requestedPower: "local_pricing",
      delegatedPowers: [],
      reservedPowers: ["local_pricing"],
      localDecisionStatus: "absent",
      delegationExpired: false,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toEqual(
      expect.arrayContaining(["POWER_RESERVED_LOCALLY", "POWER_NOT_DELEGATED", "LOCAL_APPROVAL_REQUIRED"]),
    )
  })

  it("blocks inalienable asset transfer", () => {
    const result = evaluateAssetTransfer({
      classification: "inalienable",
      authorityApproved: true,
      publicNoticeComplete: true,
      conflictsCleared: true,
      replacementPlanApproved: true,
      rollbackAvailable: true,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("ASSET_INALIENABLE")
  })

  it("requires fundamental ratification when rights are affected", () => {
    const result = evaluateFundamentalRights({
      action: "amend",
      affectedRights: ["exit"],
      amendmentClass: "operational",
      hasFundamentalRatification: false,
      policy: {
        policyVersion: "1.0.0",
        schemaVersion: "1",
        jurisdiction: "sandbox",
        evaluatedAt: new Date().toISOString(),
      },
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("FUNDAMENTAL_CLASSIFICATION_REQUIRED")
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_PROTOCOL_CONSTITUTION_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_protocol_irreversible_asset_transfer_enabled",
        "creator_protocol_universal_identifier_enabled",
        "creator_protocol_global_mandate_enabled",
        "creator_protocol_collective_action_enabled",
        "creator_protocol_tokenized_governance_enabled",
        "creator_protocol_emergency_override_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS).every((value) => value === false)).toBe(true)
  })
})
