import { allocateMoney, assertBalancedJournal } from "../money"
import { allocateRoyalty } from "../allocation-engine"
import { parseGenericRoyaltyCsv, reconcileSourceTotals } from "../csv-parser"
import { canAutoAcceptMatch, rankRoyaltyMatches } from "../matching"
import { applyFreezeToInterests, buildIssuedPassportSnapshotV1 } from "../passport-snapshot"
import { computePayoutReadiness } from "../payout-provider"
import { calculatePresentValue, buildValuationRange } from "../../valuation/catalog-valuation"
import { canAcceptOfferingOrder, assertNonInvestmentCollectible } from "../../finance/offerings"
import { validateOnchainInstrument } from "../../finance/onchain-instrument"
import { DISABLED_MUSIC_ROYALTIES_FLAGS } from "../music-royalties-flags"

describe("phase 3 royalties core", () => {
  it("allocates money with remainder by sorted id", () => {
    const rows = allocateMoney({
      amount: { currency: "USD", minorUnits: 100n },
      shares: [
        { id: "b", share: { numerator: 1n, denominator: 3n } },
        { id: "a", share: { numerator: 1n, denominator: 3n } },
        { id: "c", share: { numerator: 1n, denominator: 3n } },
      ],
    })
    expect(rows.reduce((sum, row) => sum + row.amount.minorUnits, 0n)).toBe(100n)
  })

  it("rejects unbalanced journals", () => {
    expect(() => assertBalancedJournal([
      { debitMinor: 10n, creditMinor: 0n },
      { debitMinor: 0n, creditMinor: 9n },
    ])).toThrow("journal_unbalanced")
  })

  it("parses csv and reconciles totals", () => {
    const csv = [
      "isrc,net,currency,usage_start,usage_end,territory",
      "USRC17607839,1.50,USD,2026-01-01,2026-01-31,US",
      "USRC17607839,2.50,USD,2026-01-01,2026-01-31,US",
    ].join("\n")
    const parsed = parseGenericRoyaltyCsv({ sourceBatchId: "batch", provider: "generic_csv", csvText: csv })
    expect(parsed.lines).toHaveLength(2)
    expect(parsed.sourceTotalMinor).toBe(400n)
    expect(reconcileSourceTotals({
      sourceTotalMinor: parsed.sourceTotalMinor,
      normalizedTotalMinor: parsed.lines.reduce((sum, line) => sum + line.netRoyaltyMinor, 0n),
    }).ok).toBe(true)
  })

  it("never auto-accepts title-only matches", () => {
    const ranked = rankRoyaltyMatches({
      title: "Midnight",
      tracks: [{ id: "1", title: "Midnight", isrc: null }],
    })
    expect(canAutoAcceptMatch(ranked[0])).toBe(false)
  })

  it("allocates using eligible passport interests only", () => {
    const result = allocateRoyalty({
      journalLineId: "line-1",
      amount: { currency: "USD", minorUnits: 100n },
      usageDate: "2026-01-15",
      territory: "US",
      rightsCategory: "master",
      interests: [{
        interestId: "i1",
        passportVersionId: "pv1",
        subjectType: "sound_recording",
        subjectId: "rec1",
        rightsCategory: "master",
        territoryCodes: ["WORLDWIDE"],
        validFrom: "2020-01-01",
        numerator: "1",
        denominator: "1",
        payeePartyId: "party-1",
        status: "eligible",
      }],
    })
    expect(result[0].amount.minorUnits).toBe(100n)
  })

  it("freezes interests when passport suspended", () => {
    const snapshot = buildIssuedPassportSnapshotV1({
      passportPublicId: "p1",
      passportVersion: 1,
      issuedAt: "2026-01-01T00:00:00.000Z",
      status: "suspended",
      interests: [{
        interestId: "i1",
        passportVersionId: "pv1",
        subjectType: "sound_recording",
        subjectId: "rec1",
        rightsCategory: "master",
        territoryCodes: ["WORLDWIDE"],
        validFrom: "2020-01-01",
        numerator: "1",
        denominator: "1",
        payeePartyId: "party-1",
        status: "eligible",
      }],
    })
    const frozen = applyFreezeToInterests({ interests: snapshot.interests, passportSuspended: true })
    expect(frozen[0].status).toBe("suspended")
  })

  it("computes payout readiness blockers", () => {
    expect(computePayoutReadiness({
      providerStatus: "ready",
      taxStatus: "ready",
      kycStatus: "passed",
      sanctionsStatus: "clear",
    }).payoutReady).toBe(true)
  })

  it("values catalogs as ranges without investment language", () => {
    const range = buildValuationRange({
      currency: "USD",
      downside: [{ period: "2026", netCashMinor: 100n, discountFactorMicros: 900000n }],
      base: [{ period: "2026", netCashMinor: 100n, discountFactorMicros: 1000000n }],
      upside: [{ period: "2026", netCashMinor: 100n, discountFactorMicros: 1100000n }],
    })
    expect(range.base.presentValueMinor).toBe(100n)
    expect(range.disclaimer.toLowerCase()).toContain("not an offer")
    expect(calculatePresentValue({
      currency: "USD",
      name: "base",
      cashFlows: [{ period: "2026", netCashMinor: 50n, discountFactorMicros: 500000n }],
    }).presentValueMinor).toBe(25n)
  })

  it("blocks unapproved offering orders and investment collectibles", () => {
    expect(canAcceptOfferingOrder({
      acceptsOrders: true,
      counselApproved: false,
      partnerApproved: true,
      status: "live",
    }).allowed).toBe(false)
    expect(() => assertNonInvestmentCollectible(true)).toThrow()
    expect(validateOnchainInstrument({
      chain: "sepolia",
      status: "testnet",
      isLegalSourceOfTruth: true,
    })).toContain("onchain_cannot_be_legal_source_of_truth")
  })

  it("keeps all royalties flags off by default", () => {
    expect(Object.values(DISABLED_MUSIC_ROYALTIES_FLAGS).every((value) => value === false)).toBe(true)
  })
})
