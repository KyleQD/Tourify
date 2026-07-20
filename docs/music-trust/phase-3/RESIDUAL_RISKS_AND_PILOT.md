# Phase 3 Residual Risks and Pilot

## Residual risks (accept or mitigate before flag-on)

| Risk | Mitigation / safe state |
|---|---|
| Incorrect allocation vs real contracts | Shadow mode; issued passport snapshots only; dual review before `music_payouts_enabled` |
| Title/artist false matches | Auto-accept forbidden without stronger IDs (`lib/music/royalties/matching.ts`) |
| DDEX incompleteness | Pilot = marketplace/generic CSV (ADR-P3-002); DDEX stub until fixtures |
| Stripe royalty secrets missing | Keep `music_payouts_enabled=false`; sandbox first |
| Tax/sanctions role ambiguity | `TAX_AND_SANCTIONS.md`; counsel memo required for live payouts |
| Valuation treated as appraisal/offer | Ranges + disclaimers; `music_valuation_enabled` gated |
| Fan utility read as investment | `assertNonInvestmentCollectible`; `music_fan_utility_enabled` gated |
| Accidental secondary market | No order book; `music_finance_*` reject unapproved orders; Phase 4 out of scope |
| RLS gaps (participants/teams/ops) | Integration tests before admin flag-on; service role server-only |
| Remote schema drift | Migrations local; no remote apply without ops; never reset DB |

## Pilot posture

**Goal:** 10–20 artists, diverse catalogs, statement upload first, **calculate without moving money**.

### Recommended flag matrix (shadow pilot)

| Flag | Shadow | Limited live payout |
|---|---|---|
| `music_royalties_ingestion_enabled` | on (cohort) | on |
| `music_royalties_matching_enabled` | on (cohort) | on |
| `music_royalties_ledger_enabled` | on (cohort) | on |
| `music_royalties_statements_enabled` | on (cohort) | on |
| `music_payouts_enabled` | **off** | on (sandbox→tiny live) |
| `music_royalties_admin_ops_enabled` | ops only | ops only |
| `music_valuation_enabled` | optional beta | optional |
| `music_fan_utility_enabled` | off unless copy approved | off unless approved |
| `music_finance_offerings_enabled` | **off** | **off** until partner+counsel |
| `music_finance_onchain_enabled` | **off** | **off** |

### Pilot gates

1. Synthetic + cohort fixtures reconcile (source total = normalized total; journals balance).
2. Sample allocations match expected rights snapshot interests.
3. Statements reproducible for the same period/inputs.
4. Signed artist/ops approval before any real payout.
5. Payout freeze + security tabletop exercised (see runbooks).
6. Phase 1/2 regression still green.

### Explicit non-goals for pilot

- Open secondary trading or price charts.
- Broad DDEX production connectors.
- Unapproved regulated offering order acceptance.
- Storing raw bank account numbers in Tourify.

Owners and blockers: `CURRENT_STATE_AUDIT_RESULTS.md`, `phase-3-execution-plan.json`.
