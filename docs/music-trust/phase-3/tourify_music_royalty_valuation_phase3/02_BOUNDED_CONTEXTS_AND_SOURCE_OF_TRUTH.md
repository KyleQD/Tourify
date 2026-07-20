# Bounded Contexts and Sources of Truth

## Source-of-truth hierarchy

1. **Legal rights:** signed agreements, applicable law, and issued Rights Passport snapshots.
2. **Catalog identity:** `artist_music` plus linked Phase 2 sound-recording, work, release, and identifier records.
3. **External earnings:** immutable source statement files and provider payloads.
4. **Accounting:** append-only normalized ledger entries derived from accepted source records.
5. **Allocation:** versioned allocation runs using a specific issued rights snapshot and policy version.
6. **Payout:** payment-provider records plus Tourify payout instructions and reconciliations.
7. **Valuation:** versioned analytical outputs built from accepted ledger data.
8. **Token record:** optional representation of a separately executed legal instrument; never the rights source of truth.

## Prohibited coupling

- Do not add wallet addresses to `artist_music` or core rights-party identity.
- Do not store valuation on Rights Passport claims.
- Do not calculate allocations from the current claim rows when an exploitation period requires a historical snapshot.
- Do not let payout failures modify earned amounts.
- Do not let valuation jobs post ledger entries.
- Do not let a token transfer modify composition or master ownership.
- Do not use marketplace listing prices as catalog fair value.

## Stable read models

Publish versioned snapshots:

- `IssuedPassportSnapshotV1`
- `RoyaltyStatementBatchV1`
- `RoyaltyLedgerSnapshotV1`
- `RoyaltyEligibleInterestV1`
- `ParticipantStatementV1`
- `CatalogRiskSnapshotV1`
- `CatalogValuationSnapshotV1`
- `FinancingReadinessSnapshotV1`

Consumers must request a declared version and fail closed on unknown fields that change money or legal meaning.

## Current authoritative references

- DDEX Digital Sales Reporting Message Suite: https://kb.ddex.net/implementing-each-standard/digital-sales-reporting-message-suite-%28dsr%29/
- DDEX DSR Part 6 Royalty Reporting Profile: https://dsr6.ddex.net/digital-sales-report-message-suite%3A-part-6-royalty-reporting-profile/1-introduction/
- DDEX DSR Part 9 Financial Reporting to Record Companies: https://dsr9.ddex.net/digital-sales-report-message-suite%3A-part-9-financial-reporting-to-record-companies-profile/1-introduction/
- The MLC: https://www.themlc.com/
- SoundExchange: https://www.soundexchange.com/
- U.S. Copyright Office music modernization audits: https://www.copyright.gov/music-modernization/audits/
- SEC 2026 crypto-asset interpretation: https://www.sec.gov/rules-regulations/2026/03/s7-2026-09
- SEC statement on tokenized securities: https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC offering pathways: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/offering-pathways
- FinCEN virtual-currency guidance: https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering
- IRS Form 1099-DA instructions: https://www.irs.gov/instructions/i1099da
- IRS Form 1099-MISC: https://www.irs.gov/forms-pubs/about-form-1099-misc
- OFAC digital-currency compliance FAQ: https://ofac.treasury.gov/faqs/560
- IVS effective January 31, 2025, including IVS 210 Intangible Assets: https://ivsc.org/standards/
- Stripe Connect onboarding and payouts: https://docs.stripe.com/connect/onboarding and https://docs.stripe.com/connect/payouts-connected-accounts
