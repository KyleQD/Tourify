# Phase 4 Handoff — Readiness Only

**Phase 3 does not implement a secondary market.** No order books, matching, bids/asks, AMMs, peer settlement, or public liquidity charts.

This document lists readiness interfaces Phase 3 should leave for a future, counsel-approved Phase 4 evaluation.

## Hard boundary (carry forward)

- Flags stay off unless explicitly approved: `music_finance_offerings_enabled`, `music_finance_onchain_enabled`.
- `music_finance_offerings.accepts_orders` remains false without partner + counsel.
- On-chain rows in `music_finance_onchain_instruments` are **never** legal source of truth.
- Tourify is not a broker, exchange, ATS, or money transmitter by default (ADR-P3-010).

## Readiness artifacts Phase 3 should expose (data contracts)

| Artifact | Phase 3 source | Phase 4 use |
|---|---|---|
| Reconciled revenue snapshots | `music_royalties_*` journals + periods | Distribution waterfalls |
| Participant / distribution statements | `music_royalties_participant_statements` | Investor reporting |
| Transfer eligibility read model | Rights freeze + payout/sanctions holds | Partner transfer agent |
| Partner position reconciliation | Offering + partner APIs (stub) | Cap table sync |
| Instrument maturity / termination events | Offering lifecycle fields | Corporate actions |
| Disclosure versions (immutable) | Offering docs refs | Suitability / 1933/4 analysis |
| Tax-lot / cost basis | Partner-supplied; not Tourify invent | 1099-DA if applicable |
| Compliance holds | `music_royalties_holds`, readiness | Block transfers |

## Decisions deferred to Phase 4 (not built here)

- Partner vs Tourify regulatory roles (BD, ATS, funding portal, transfer agent, custodian).
- State securities, investor limits, suitability, market surveillance.
- Best execution, conflicts, digital-asset broker reporting.
- Controlled secondary liquidity design (if any) — requires separate ADR + counsel.

## Flag / surface checklist before any Phase 4 kickoff

1. Phase 3 DoD evidence closed or explicitly waived (`DEFINITION_OF_DONE_EVIDENCE.md`).
2. Pilot payouts reconcile; freeze runbook exercised.
3. Tax/sanctions memo signed for intended products.
4. No UI path that facilitates user-to-user trading of crypto-asset securities.
5. Secondary scope, if ever approved, lands in a **new** execution plan — not a silent flag flip.

## References

- `tourify_music_royalty_valuation_phase3/19_SECONDARY_TRADING_AND_MARKETPLACE_BOUNDARY.md`
- `tourify_music_royalty_valuation_phase3/26_PHASE_4_MARKETPLACE_AND_LIQUIDITY_READINESS.md`
