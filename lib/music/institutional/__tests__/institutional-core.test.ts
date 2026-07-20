import { resolveTransactionPath } from "../transaction-classification"
import { evaluateInstitutionalEligibility } from "../institutional-eligibility"
import { canTransitionAuction } from "../auction-state-machine"
import { allocateProRata } from "../fund-waterfall"
import { reconcileNavLines } from "../nav-reconciliation"
import { calculateConcentration } from "../risk-metrics"
import { calculateUnderwritingScore } from "../underwriting-score"
import { assertClassificationAllowsAction } from "../classification-gate"
import { DISABLED_MUSIC_INSTITUTIONAL_FLAGS } from "../music-institutional-flags"
import { hashPayload, verifyPartnerWebhookSignature } from "../partner-adapters"

describe("Phase 5 institutional core", () => {
  it("blocks proceeds without approved classification", () => {
    const result = resolveTransactionPath({
      transfersCopyrightOrContractRights: true,
      grantsLicenseOnly: false,
      transfersEntityInterest: false,
      poolsInvestorCapital: false,
      createsDebtEquityOrRevenueParticipation: false,
      proposesTranchesOrCollateral: false,
    })
    expect(result.allowedToProceed).toBe(false)
    expect(result.path).toBe("blocked")
  })

  it("gates bids on approved direct-sale path only", () => {
    expect(
      assertClassificationAllowsAction({
        classificationStatus: "draft",
        approvedPath: "direct_asset_sale",
        action: "bid",
      }).allowed,
    ).toBe(false)
    expect(
      assertClassificationAllowsAction({
        classificationStatus: "approved",
        approvedPath: "direct_asset_sale",
        action: "bid",
        planningFacts: { transfersCopyrightOrContractRights: true },
      }).allowed,
    ).toBe(true)
    expect(
      assertClassificationAllowsAction({
        classificationStatus: "approved",
        approvedPath: "private_security",
        action: "bid",
      }).reason,
    ).toBe("securities_path_requires_phase4_partner_intermediary")
  })

  it("defaults eligibility to deny without provider assertion", () => {
    const result = evaluateInstitutionalEligibility({
      now: new Date("2026-07-17T00:00:00Z"),
      requiredProductClass: "direct_asset_sale",
      assertions: [],
    })
    expect(result.allowed).toBe(false)
  })

  it("accepts valid provider eligibility assertions", () => {
    const result = evaluateInstitutionalEligibility({
      now: new Date("2026-07-17T00:00:00Z"),
      requiredProductClass: "fund_interest",
      requestedAmountMinor: 1000n,
      assertions: [
        {
          assertionType: "qp",
          providerId: "sandbox",
          verified: true,
          effectiveAt: "2026-01-01T00:00:00Z",
          expiresAt: "2027-01-01T00:00:00Z",
          permittedProductClasses: ["fund_interest"],
          maximumAmountMinor: 5000n,
        },
      ],
    })
    expect(result.allowed).toBe(true)
  })

  it("enforces auction state machine", () => {
    expect(canTransitionAuction("draft", "scheduled")).toBe(true)
    expect(canTransitionAuction("open", "selected")).toBe(false)
  })

  it("allocates waterfall pro-rata with integer money", () => {
    const rows = allocateProRata(100n, [
      { participantId: "a", contributionMinor: 25n },
      { participantId: "b", contributionMinor: 75n },
    ])
    expect(rows.reduce((s, r) => s + r.amountMinor, 0n)).toBe(100n)
  })

  it("reconciles NAV lines without silent estimate replacement", () => {
    const diffs = reconcileNavLines(
      [{ key: "total", amountMinor: 100n }],
      [{ key: "total", amountMinor: 90n }],
    )
    expect(diffs[0].differenceMinor).toBe(-10n)
  })

  it("calculates concentration and underwriting scores", () => {
    const conc = calculateConcentration([
      { key: "a", amountMinor: 80n },
      { key: "b", amountMinor: 20n },
    ])
    expect(conc.largestExposureBasisPoints).toBe(8000)
    const score = calculateUnderwritingScore([
      { key: "rights", scoreBasisPoints: 8000, weightBasisPoints: 5000, confidenceBasisPoints: 9000 },
      { key: "revenue", scoreBasisPoints: 6000, weightBasisPoints: 5000, confidenceBasisPoints: 7000 },
    ])
    expect(score.weightedScoreBasisPoints).toBe(7000)
  })

  it("verifies partner webhooks and keeps flags off by default", () => {
    const crypto = require("crypto") as typeof import("crypto")
    const rawBody = "{}"
    const secret = "s"
    const signature = crypto.createHash("sha256").update(`${secret}:${rawBody}`).digest("hex")
    expect(verifyPartnerWebhookSignature({ rawBody, signature, secret })).toBe(true)
    expect(hashPayload({ a: 1 })).toHaveLength(64)
    expect(Object.values(DISABLED_MUSIC_INSTITUTIONAL_FLAGS).every((v) => v === false)).toBe(true)
  })
})
