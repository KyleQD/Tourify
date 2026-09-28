import { evaluatePhase19Activation } from "../phase19-activation-gate"
import { evaluateSensitiveArchiveEthics } from "../sensitive-archive-ethics-gate"
import { evaluateIdentifierResolution } from "../identifier-resolution-gate"
import { evaluateSuccessorCustody } from "../successor-custody-gate"
import { canTransitionLegacy } from "../legacy-cycle-state-machine"
import {
  HARD_DISABLED_TREATY_LEGACY_FLAGS,
  DISABLED_CREATOR_TREATY_LEGACY_FLAGS,
} from "../creator-treaty-legacy-flags"

describe("Phase 19 treaty system legacy gates", () => {
  const now = new Date("2026-07-20T00:00:00.000Z")

  it("requires expiresAt and Phase 18 proofs for activation", () => {
    const result = evaluatePhase19Activation({
      phase18ProofsComplete: true,
      centuryScaleStrategyApproved: true,
      successorCustodyVerified: true,
      culturalGovernanceApproved: true,
      privacyArchivalAnalysisComplete: true,
      openSpecsPublished: true,
      independentArchivesCount: 2,
      sustainableFundingVerified: true,
      disasterRecoveryPassed: true,
      providerIndependenceVerified: true,
      publicLegitimacyApproved: true,
      independentOperators: 2,
      tourifyUnavailablePassed: true,
      unresolvedCriticalBlockers: 0,
      claimsPerpetuity: false,
      blocksLocalExit: false,
      now,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe("activation_denied")
    expect(result.blockers).toContain("expires_at_missing")
  })

  it("denies perpetual claims, blocked exit, and sensitive public dumps", () => {
    expect(
      evaluatePhase19Activation({
        phase18ProofsComplete: true,
        centuryScaleStrategyApproved: true,
        successorCustodyVerified: true,
        culturalGovernanceApproved: true,
        privacyArchivalAnalysisComplete: true,
        openSpecsPublished: true,
        independentArchivesCount: 2,
        sustainableFundingVerified: true,
        disasterRecoveryPassed: true,
        providerIndependenceVerified: true,
        publicLegitimacyApproved: true,
        independentOperators: 2,
        tourifyUnavailablePassed: true,
        unresolvedCriticalBlockers: 0,
        claimsPerpetuity: true,
        blocksLocalExit: true,
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        now,
      }).blockers,
    ).toEqual(expect.arrayContaining(["claims_perpetuity", "blocks_local_exit"]))

    expect(
      evaluateSensitiveArchiveEthics({
        purposeApproved: true,
        ethicsReviewApproved: true,
        sensitiveRevealRequested: false,
        privacyOverrideRequested: false,
        creatorRightsAffected: false,
        publicDumpRequested: true,
      }).allowed,
    ).toBe(false)
  })

  it("blocks universal identity and custody without local exit", () => {
    expect(
      evaluateIdentifierResolution({
        identifierRef: "id-1",
        createsUniversalIdentity: true,
        adjudicatesOwnership: false,
        openSpecCompatible: true,
      }).allowed,
    ).toBe(false)

    expect(
      evaluateSuccessorCustody({
        successorRecognized: true,
        custodyAuthorityVerified: true,
        independentArchive: true,
        localExitPreserved: false,
        claimsPerpetuity: false,
      }).allowed,
    ).toBe(false)
  })

  it("allows only valid legacy transitions and keeps hard-disabled flags off", () => {
    expect(canTransitionLegacy({ from: "draft", to: "proposed" })).toBe(true)
    expect(canTransitionLegacy({ from: "draft", to: "effective" })).toBe(false)
    for (const flag of HARD_DISABLED_TREATY_LEGACY_FLAGS)
      expect(DISABLED_CREATOR_TREATY_LEGACY_FLAGS[flag]).toBe(false)
  })
})
