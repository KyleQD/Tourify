# Phase 3 Definition of Done — Evidence Map

Source: `tourify_music_royalty_valuation_phase3/28_DEFINITION_OF_DONE.md`  
Status legend: **Met** (path exists) · **Partial** · **Blocked**

Flags: `music_royalties_*`, `music_payouts_enabled`, `music_valuation_enabled`, `music_finance_*` (see `lib/music/royalties/music-royalties-flags.ts`).

| # | DoD item | Status | Evidence / blocker |
|---|---|---|---|
| 1 | Repository and database audit completed | **Met** | `docs/music-trust/phase-3/CURRENT_STATE_AUDIT_RESULTS.md`; ADRs P3-001–010 |
| 2 | Phase 1/2 regression baseline captured | **Partial** | Audit: jest music-rights + Phase 1 trust **33 passed**; full lint/build deferred (dirty worktree) |
| 3 | Statement sources private, hashed, versioned, idempotent | **Partial** | Schema: `supabase/migrations/20260717240000_music_royalties_ingestion_and_ledger.sql` (`music_royalties_import_batches`); **Blocked:** private bucket wiring + hash/idempotency E2E in staging |
| 4 | Approved pilot formats normalize to one model | **Partial** | `lib/music/royalties/csv-parser.ts` + ADR-P3-002; DDEX full adapter deferred |
| 5 | Source totals reconcile to normalized totals | **Met** | `reconcileSourceTotals` + `lib/music/royalties/__tests__/royalties-core.test.ts` |
| 6 | Matching never relies only on title and artist | **Met** | `lib/music/royalties/matching.ts`; test “never auto-accepts title-only matches” |
| 7 | Posted journals balanced and immutable | **Partial** | `assertBalancedJournal` / money lib + journal comments in migration; **Blocked:** DB immutability trigger/enforcement E2E |
| 8 | Corrections use reversals and replacements | **Partial** | `reversed_by_journal_id` on `music_royalties_journals`; **Blocked:** ops UI/API + exercise evidence |
| 9 | Allocations use issued historical rights snapshot | **Partial** | `lib/music/royalties/passport-snapshot.ts`, `allocation-engine.ts`, `music_royalties_rights_snapshots`; **Blocked:** freeze read-model published to prod paths |
| 10 | Territory, date, category, gross/net, deductions, recoupment enforced | **Partial** | Domain fields + allocation/recoupment tables; **Blocked:** full policy matrix tests beyond core unit coverage |
| 11 | Unknown/disputed → suspense or holds | **Partial** | `music_royalties_holds` (`dispute`, `suspense`, …); **Blocked:** end-to-end hold routing in live jobs |
| 12 | Participants receive reproducible statements | **Partial** | `music_royalties_participant_statements` + flag `music_royalties_statements_enabled`; **Blocked:** statement render API + pilot PDF/hash evidence |
| 13 | Payee onboarding avoids raw bank data in Tourify | **Partial** | ADR-P3-003; `lib/music/royalties/payout-provider.ts` + Connect reuse; **Blocked:** staging Connect royalty account proof |
| 14 | Payout webhooks verified and idempotent | **Blocked** | Provider events table exists; dedicated royalty webhook verify/idempotency path + tests not closed |
| 15 | Real payouts maker-checker + reconciliation | **Blocked** | Schema: payout batches/instructions/reconciliations; `music_payouts_enabled` off; live maker-checker exercise pending |
| 16 | Tax and sanctions responsibilities documented | **Met** | `docs/music-trust/phase-3/runbooks/TAX_AND_SANCTIONS.md` (+ package `08_PAYOUT_READINESS_TAX_KYC_AND_SANCTIONS.md`); counsel memo still required for go-live |
| 17 | Valuations versioned reproducible ranges + confidence/assumptions | **Partial** | `music_valuation_*` tables; `lib/music/valuation/catalog-valuation.ts`; flag `music_valuation_enabled` |
| 18 | Valuation changes do not affect rights or ledger | **Met** | Migration comment + ADR-P3-006; valuation code path separate from journal post |
| 19 | Fan utility makes no profit/appreciation promise | **Partial** | `assertNonInvestmentCollectible` in tests; flag `music_fan_utility_enabled`; **Blocked:** UI copy review |
| 20 | Regulated financing partner-gated; no unapproved orders | **Partial** | `canAcceptOfferingOrder`; `music_finance_offerings_enabled` default off; **Blocked:** partner agreement |
| 21 | No open secondary market exists | **Met** | Scope docs + `PHASE_4_HANDOFF.md`; no secondary market implementation in Phase 3 |
| 22 | Smart contracts: no private source data; reviewed before prod | **Blocked** | Phase 2 passport registry only; royalty instruments not production-reviewed; keep `music_finance_onchain_enabled=false` |
| 23 | RLS/authz tests: artists, participants, teams, ops, compliance, public | **Blocked** | Owner RLS in migrations; multi-role integration test suite not complete |
| 24 | Security, backup, incident, payout-freeze, key-compromise runbooks pass exercises | **Partial** | Runbooks: `runbooks/SECURITY.md`, `PAYOUT_FREEZE.md`, `INCIDENTS.md`, `TAX_AND_SANCTIONS.md`; **Blocked:** tabletop exercise logs + backup restore proof |
| 25 | Pilot calculations reconcile to expected results | **Blocked** | Unit fixtures only; live 10–20 artist pilot cohort not enrolled (`RESIDUAL_RISKS_AND_PILOT.md`) |
| 26 | Existing upload, playback, marketplace, library, feed, EPK, mobile tests pass | **Partial** | Focused Phase 1/2 suite green; full surface regression not re-run post Phase 3 schema |
| 27 | Rollback and feature-disable procedures verified | **Partial** | Flag resolver + kill-switch docs; **Blocked:** staging flag-off drill recorded |
| 28 | Execution-plan tasks complete, blocked with owner, or removed | **Partial** | `docs/music-trust/phase-3/phase-3-execution-plan.json` status `in_progress`; close remaining tasks or mark blockers with owners |

## Cross-cutting blockers (from audit)

- Counsel tax/regulated language  
- Live Stripe royalty payout secrets  
- DDEX full parser fixtures  
- Partner financing agreements  
- Live pilot cohort  

Safe default: all Phase 3 flags **disabled** until the corresponding DoD row is **Met** with recorded exercise evidence.
