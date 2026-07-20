import { canTransitionOffering, assertFanUtilityNotSecurities } from "../marketplace-domain"
import { generatePlanningCandidates, canLaunchOfferingFromPathway } from "../offering-pathway"
import {
  resolveTransferEligibility,
  defaultDenyTransferSnapshot,
} from "../transfer-eligibility"
import { canTransitionOrder, canTransitionSubscription } from "../order-state-machine"
import { reconcileSettlement, positionQuantityBreak } from "../settlement-reconciliation"
import { computeDisclosureManifestHash, projectMarketingFields } from "../disclosure-versions"
import { evaluateIssuerDeficiencies } from "../issuer-eligibility"
import {
  buildPartnerEventReceipt,
  hashPayload,
  verifyPartnerWebhookSignature,
} from "../partner-adapters"
import { DISABLED_MUSIC_MARKETPLACE_FLAGS } from "../music-marketplace-flags"

describe("Phase 4 marketplace core", () => {
  it("defaults transfer eligibility to deny", () => {
    const result = resolveTransferEligibility(defaultDenyTransferSnapshot())
    expect(result.eligible).toBe(false)
    expect(result.reasonCodes.length).toBeGreaterThan(0)
  })

  it("allows transfer only when all gates pass", () => {
    const result = resolveTransferEligibility({
      officialPositionMatched: true,
      partnerAccountApproved: true,
      transfereeApproved: true,
      sanctionsClear: true,
      legalHold: false,
      instrumentSuspended: false,
      holdingPeriodSatisfied: true,
      jurisdictionAllowed: true,
      transferAgentApprovalRequired: true,
      transferAgentApproved: true,
    })
    expect(result.eligible).toBe(true)
    expect(result.reasonCodes).toEqual([])
  })

  it("generates pathway candidates requiring counsel approval", () => {
    const candidates = generatePlanningCandidates({
      targetRaiseMinor: "10000000",
      publicMarketingRequired: false,
      includeNonAccreditedInvestors: true,
      auditedFinancialsReady: false,
      desiredSecondaryLiquidity: true,
    })
    expect(candidates.every((c) => c.requiresCounselApproval)).toBe(true)
    expect(candidates.some((c) => c.candidate === "reg_cf")).toBe(true)
  })

  it("blocks offering launch without pathway approvals", () => {
    expect(
      canLaunchOfferingFromPathway({
        counselApproved: false,
        partnerApproved: true,
        approvedPartnerId: "partner-a",
        status: "approved",
      }).allowed,
    ).toBe(false)
    expect(
      canLaunchOfferingFromPathway({
        counselApproved: true,
        partnerApproved: true,
        approvedPartnerId: "partner-a",
        status: "approved",
      }).allowed,
    ).toBe(true)
  })

  it("enforces offering and order state machines", () => {
    expect(canTransitionOffering("draft", "preflight")).toBe(true)
    expect(canTransitionOffering("draft", "live")).toBe(false)
    expect(canTransitionOrder("draft_local", "submitted_to_partner")).toBe(true)
    expect(canTransitionOrder("filled", "open")).toBe(false)
    expect(canTransitionSubscription("escrowed", "accepted")).toBe(true)
  })

  it("reconciles settlement legs with integer money", () => {
    expect(
      reconcileSettlement([
        { currencyOrAsset: "USD", expectedMinor: "100", actualMinor: "100" },
      ]).matched,
    ).toBe(true)
    expect(
      reconcileSettlement([
        { currencyOrAsset: "USD", expectedMinor: "100", actualMinor: "99" },
      ]).breaks,
    ).toHaveLength(1)
    expect(positionQuantityBreak("10", "11")).toBe(true)
  })

  it("hashes immutable disclosures and labels marketing", () => {
    const hash = computeDisclosureManifestHash({
      offeringId: "off-1",
      version: 1,
      instrumentTerms: { type: "royalty_participation" },
      riskFactors: ["illiquidity"],
      conflicts: [],
      documentHashes: ["abc"],
    })
    expect(hash).toHaveLength(64)
    const marketing = projectMarketingFields({
      status: "published",
      marketingProjection: { title: "Test" },
    })
    expect(String(marketing.liquidityDisclaimer)).toMatch(/No liquidity/)
  })

  it("scores issuer deficiencies and blocks fan utility investment claims", () => {
    const evalResult = evaluateIssuerDeficiencies({
      authorityAttested: false,
      hasBeneficialOwners: false,
      hasEligibleCatalogLink: false,
      hasPassportSnapshot: false,
      hasRoyaltySnapshot: false,
      hasValuationSnapshot: false,
      openDisputeHold: false,
      openLienHold: false,
      badActorFlag: false,
    })
    expect(evalResult.eligible).toBe(false)
    expect(evalResult.readinessScore).toBeLessThan(100)
    expect(() => assertFanUtilityNotSecurities(true)).toThrow()
  })

  it("verifies partner webhook receipts", () => {
    const crypto = require("crypto") as typeof import("crypto")
    const rawBody = JSON.stringify({ ok: true })
    const secret = "test-secret"
    const signature = crypto.createHash("sha256").update(`${secret}:${rawBody}`).digest("hex")
    expect(verifyPartnerWebhookSignature({ rawBody, signature, secret })).toBe(true)
    expect(verifyPartnerWebhookSignature({ rawBody, signature: "bad", secret })).toBe(false)
    const receipt = buildPartnerEventReceipt(
      {
        partnerId: "sandbox",
        providerEventId: "evt-1",
        eventType: "subscription.accepted",
        payload: { ok: true },
      },
      true,
    )
    expect(receipt.payloadHash).toHaveLength(64)
    expect(hashPayload({ ok: true })).toHaveLength(64)
  })

  it("keeps marketplace flags disabled by default", () => {
    expect(Object.values(DISABLED_MUSIC_MARKETPLACE_FLAGS).every((v) => v === false)).toBe(true)
  })
})
