import { evaluateInteropConventionActivation } from "../interop-activation-gate"
import { evaluateMutualRecognition } from "../mutual-recognition-policy"
import { evaluateApprovalPackage } from "../approval-package-gate"
import {
  HARD_DISABLED_INTEROP_CONVENTION_FLAGS,
  DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS,
} from "../creator-interop-convention-flags"

describe("Phase 14 interop convention gates", () => {
  it("does not allow convention activation without multi-compact evidence and approval package", () => {
    const result = evaluateInteropConventionActivation({
      independentConstitutionalCompacts: 1,
      operationalEvidenceYears: 2,
      phase13ProductionProven: true,
      approvalPackageExecuted: true,
      localSovereigntyPreserved: true,
      voluntaryParticipationOnly: true,
      securityApproved: true,
      privacyApproved: true,
      accessibilityApproved: true,
      jurisdictionApproved: true,
      unresolvedCriticalBlockers: 0,
      policyVersion: "1.0.0",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("INSUFFICIENT_INDEPENDENT_COMPACTS")
  })

  it("forbids treaty status and universal representation in mutual recognition", () => {
    expect(
      evaluateMutualRecognition({
        sourceCompactActive: true,
        targetCompactActive: true,
        purposeApproved: true,
        sourceFresh: true,
        localReservedPowersRespected: true,
        claimsTreatyStatus: true,
        claimsUniversalRepresentation: false,
        containsSensitiveEvidence: false,
      }).reasons,
    ).toContain("TREATY_STATUS_FORBIDDEN")

    expect(
      evaluateMutualRecognition({
        sourceCompactActive: true,
        targetCompactActive: true,
        purposeApproved: true,
        sourceFresh: true,
        localReservedPowersRespected: true,
        claimsTreatyStatus: false,
        claimsUniversalRepresentation: true,
        containsSensitiveEvidence: false,
      }).reasons,
    ).toContain("UNIVERSAL_REPRESENTATION_FORBIDDEN")
  })

  it("requires state/IO package when state participation is requested", () => {
    const result = evaluateApprovalPackage({
      packageStatus: "executed",
      dualControl: true,
      publicNoticeComplete: true,
      independentReviewComplete: true,
      stateOrIoParticipationRequested: true,
      stateOrIoPackageAttached: false,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("STATE_IO_PACKAGE_REQUIRED")
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_INTEROP_CONVENTION_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_interop_treaty_status_enabled",
        "creator_interop_universal_representation_enabled",
        "creator_interop_state_io_participation_enabled",
        "creator_interop_collective_action_enabled",
        "creator_interop_irreversible_asset_transfer_enabled",
        "creator_interop_emergency_override_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS).every((value) => value === false)).toBe(true)
  })
})
