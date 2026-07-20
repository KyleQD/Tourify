import { canTransitionMembership } from "../membership-state-machine"
import { permitsContributionUse } from "../data-contribution-license"
import { resolveResearchAccess } from "../research-access-policy"
import { collectiveEntityMayActivate } from "../collective-entity-activation"
import { standardsProposalCanBeSubmitted } from "../standards-proposal-state-machine"
import { resolveCrossBorderDataUse } from "../cross-border-data-policy"
import { DISABLED_CREATOR_COOPERATIVE_FLAGS } from "../creator-cooperative-flags"
import { canTransitionResearch } from "../research-project-state-machine"

describe("Phase 9 creator-cooperative core", () => {
  it("keeps membership separate from Tourify account via explicit state machine", () => {
    expect(canTransitionMembership({ from: "draft", to: "applied" })).toBe(true)
    expect(canTransitionMembership({ from: "applied", to: "active" })).toBe(false)
    expect(canTransitionMembership({ from: "active", to: "withdrawn" })).toBe(true)
  })

  it("does not permit contribution without an active purpose-specific licence", () => {
    const allowed = permitsContributionUse({
      request: {
        purpose: "internal_aggregate",
        dataCategory: "royalty_history",
        sourceId: "s1",
        recipientId: "coop",
        requestedAt: "2026-07-17T00:00:00.000Z",
        aiTraining: false,
        commercialUse: false,
      },
      licence: {
        status: "revoked",
        permittedPurposes: ["internal_aggregate"],
        dataCategories: ["royalty_history"],
        sourceIds: ["s1"],
        recipientIds: ["coop"],
        aiTrainingAllowed: false,
        commercialResearchAllowed: false,
        startsAt: "2026-01-01T00:00:00.000Z",
      },
      now: "2026-07-17T00:00:00.000Z",
    })
    expect(allowed).toBe(false)
  })

  it("default-denies research access until all gates pass", () => {
    expect(resolveResearchAccess({
      projectApproved: true,
      licenceActive: true,
      ethicsApproved: true,
      privacyApproved: true,
      competitionApproved: true,
      securityApproved: true,
      purposeMatches: true,
      cohortEligible: true,
      outputOnly: false,
    }).allowed).toBe(false)

    expect(resolveResearchAccess({
      projectApproved: true,
      licenceActive: true,
      ethicsApproved: true,
      privacyApproved: true,
      competitionApproved: true,
      securityApproved: true,
      purposeMatches: true,
      cohortEligible: true,
      outputOnly: true,
    }).allowed).toBe(true)
  })

  it("blocks collective activation without full counsel/entity package", () => {
    expect(collectiveEntityMayActivate({
      entityFormed: true,
      governingDocumentsApproved: true,
      counselOpinionApproved: true,
      competitionReviewApproved: true,
      laborReviewApproved: true,
      mandatesActive: true,
      regulatorRequirementsSatisfied: true,
      separateProductionApproval: false,
    })).toBe(false)
  })

  it("blocks standards submission without IPR, board, and representative authorization", () => {
    expect(standardsProposalCanBeSubmitted({
      state: "board_approval",
      iprApproved: true,
      boardApproved: true,
      representativeAuthorized: false,
    })).toBe(false)
  })

  it("default-denies cross-border research without transfer mechanism", () => {
    expect(resolveCrossBorderDataUse({
      sourceJurisdiction: "US",
      destinationJurisdiction: "EU",
      transferMechanismActive: false,
      localizationRequired: false,
      destinationStorageConfirmed: false,
      supplementarySafeguardsApproved: false,
    }).reason).toBe("missing_transfer_mechanism")
  })

  it("enforces research project transitions", () => {
    expect(canTransitionResearch({ from: "concept", to: "application" })).toBe(true)
    expect(canTransitionResearch({ from: "concept", to: "licensed" })).toBe(false)
  })

  it("keeps all cooperative flags disabled by default", () => {
    expect(Object.values(DISABLED_CREATOR_COOPERATIVE_FLAGS).every((value) => value === false)).toBe(true)
    expect(DISABLED_CREATOR_COOPERATIVE_FLAGS.collective_representation_enabled).toBe(false)
    expect(DISABLED_CREATOR_COOPERATIVE_FLAGS.member_benefit_allocation_enabled).toBe(false)
    expect(DISABLED_CREATOR_COOPERATIVE_FLAGS.external_research_licensing_enabled).toBe(false)
  })
})
