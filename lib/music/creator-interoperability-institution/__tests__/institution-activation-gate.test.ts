import { evaluateInstitutionActivation } from "../institution-activation-gate"
import { evaluateLegalCharacter } from "../legal-character-gate"
import { authorizeParticipantAction } from "../participant-authority"
import { authorizePublicLawService } from "../public-law-service-authorization"
import {
  HARD_DISABLED_INTEROP_INSTITUTION_FLAGS,
  DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS,
} from "../creator-interop-institution-flags"
import type { ParticipantAuthority, PublicLawServiceDefinition } from "../institution-domain"

describe("Phase 16 interop institution gates", () => {
  it("requires two independent operators for activation", () => {
    const result = evaluateInstitutionActivation({
      legalBasisEffective: true,
      participantAuthorityVerified: true,
      organsOperational: true,
      hostReady: true,
      fundingApproved: true,
      oversightOperational: true,
      staffRemedyAvailable: true,
      privacyApproved: true,
      securityApproved: true,
      accessibilityApproved: true,
      competitionApproved: true,
      independentImplementations: 2,
      independentOperators: 1,
      tourifyUnavailableTestPassed: true,
      unresolvedCriticalBlockers: 0,
    })
    expect(result.allowed).toBe(false)
    expect(result.mode).toBe("disabled")
    expect(result.reasons).toContain("independentOperators")
  })

  it("blocks IO/treaty legal character without constitutive basis", () => {
    const result = evaluateLegalCharacter({
      constitutiveInstrumentEffective: false,
      intergovernmentalPartiesVerified: true,
      relationshipAgreementEffective: false,
      requestedClaim: "international_organization",
    })
    expect(result.allowed).toBe(false)
    expect(result.character).toBe("unknown")
  })

  it("default-denies participant actions and public-law services", () => {
    expect(
      authorizeParticipantAction({
        authority: null,
        requiredScope: "accession",
        now: "2026-07-18T00:00:00.000Z",
      }).allowed,
    ).toBe(false)

    const service: PublicLawServiceDefinition = {
      id: "s1",
      code: "registry",
      state: "sandbox",
      policyVersion: "1",
      schemaVersion: "1",
      jurisdiction: "sandbox",
      effectiveAt: null,
      expiresAt: null,
      sourceManifestId: "m1",
      auditEventId: "a1",
      legalBasisId: null,
      allowedParticipantClasses: ["state"],
      allowedJurisdictions: ["sandbox"],
      highImpact: true,
      nonAdjudicative: true,
    }
    const authority: ParticipantAuthority = {
      id: "p1",
      participantId: "x",
      participantClass: "state",
      authorityType: "signature",
      authorizedScopes: ["accession"],
      evidenceIds: [],
      state: "draft",
      policyVersion: "1",
      schemaVersion: "1",
      jurisdiction: "sandbox",
      effectiveAt: null,
      expiresAt: null,
      sourceManifestId: "m1",
      auditEventId: "a1",
    }
    expect(
      authorizePublicLawService({
        service,
        authority,
        jurisdiction: "sandbox",
        localReservedPowerConflict: false,
        sourceCurrent: true,
      }).allowed,
    ).toBe(false)
  })

  it("keeps hard-disabled flags off and defaults all flags false", () => {
    expect(HARD_DISABLED_INTEROP_INSTITUTION_FLAGS).toEqual(
      expect.arrayContaining([
        "creator_interop_institution_formal_depositary_enabled",
        "creator_interop_institution_un_relationship_enabled",
        "creator_interop_institution_production_enabled",
        "creator_interop_institution_collective_action_enabled",
      ]),
    )
    expect(Object.values(DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS).every((value) => value === false)).toBe(true)
  })
})
