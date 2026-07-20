import { evaluateOrganizationActivation } from "../organization-activation-gate"
import { evaluateLegalPersonality } from "../legal-personality-gate"
import { evaluatePrivilege } from "../privileges-immunities-gate"
import { canBindParticipant } from "../participant-authority"
import { canTransitionMembership } from "../membership-state-machine"
import { authorizePublicLawAction } from "../public-law-action-authorization"
import {
  HARD_DISABLED_INTEROP_ORG_FLAGS,
  DISABLED_CREATOR_INTEROP_ORG_FLAGS,
} from "../creator-interop-org-flags"

describe("Phase 15 interop organization gates", () => {
  it("denies organization activation when constitutive instrument is not effective", () => {
    const result = evaluateOrganizationActivation({
      phase14EvidenceApproved: true,
      legalFeasibilityApproved: true,
      constitutiveInstrumentEffective: false,
      participantAuthorityVerified: true,
      governanceOperational: true,
      hostAndHeadquartersReady: true,
      fundingAndBudgetApproved: true,
      oversightAndStaffJusticeReady: true,
      privacySecurityAccessibilityApproved: true,
      independentOperationProven: true,
      criticalBlockers: 0,
    })
    expect(result.allowed).toBe(false)
    expect(result.mode).toBe("disabled")
    expect(result.reasons).toContain("CONSTITUTIVE_INSTRUMENT_NOT_EFFECTIVE")
  })

  it("blocks legal personality without counsel and domestic recognition", () => {
    const result = evaluateLegalPersonality({
      requestedCharacter: "international",
      constitutiveInstrumentEffective: true,
      competentAuthoritiesVerified: true,
      requiredDomesticRecognitionEffective: false,
      counselApprovalId: "counsel-1",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain("LEGAL_PERSONALITY_NOT_PROVEN")
  })

  it("keeps privileges not_applicable without waiver and remedy", () => {
    const result = evaluatePrivilege({
      legalInstrumentEffective: true,
      hostJurisdiction: "sandbox",
      beneficiaryClass: "staff",
      functionalScope: "official_acts",
      waiverAuthorityConfigured: false,
      alternativeRemedyAvailable: true,
    })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe("not_applicable")
  })

  it("default-denies participant binding and public-law actions", () => {
    expect(
      canBindParticipant({
        participantClass: "state",
        authorityInstrumentCurrent: true,
        signatoryAuthorized: true,
        internalApprovalComplete: false,
        effective: true,
        suspended: false,
      }),
    ).toBe(false)

    expect(
      authorizePublicLawAction({
        currentSourceVerified: true,
        actorAuthorityCurrent: true,
        exactScopeDelegated: false,
        jurisdictionApproved: true,
        requiredReviewsComplete: true,
        stopped: false,
      }).allowed,
    ).toBe(false)
  })

  it("allows only valid membership transitions", () => {
    expect(canTransitionMembership("draft", "invited")).toBe(true)
    expect(canTransitionMembership("draft", "effective")).toBe(false)
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_INTEROP_ORG_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_interop_org_treaty_status_enabled",
        "creator_interop_org_privileges_enabled",
        "creator_interop_org_un_relationship_enabled",
        "creator_interop_org_production_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_INTEROP_ORG_FLAGS).every((value) => value === false)).toBe(true)
  })
})
