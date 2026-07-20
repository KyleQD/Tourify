# Codex Master Implementation Prompt — Tourify Institutional Marketplace Phase 5

You are implementing Phase 5 inside the existing Tourify repository. Read every file in this package before changing code.

## Mission

Build the institutional catalog-capital, direct transaction, diligence, underwriting, fund/SPV synchronization, portfolio analytics, and partner-led institutional liquidity ecosystem described in these documents. Extend Phase 1 safe upload, Phase 2 Rights Passport, Phase 3 royalty/valuation, and Phase 4 regulated marketplace systems non-destructively.

## Mandatory first actions

1. Copy this package to `docs/music-trust/phase-5/`.
2. Read the canonical Music Ecosystem Integration Guide and all Phase 1–4 packages.
3. Complete `CURRENT_STATE_AUDIT_RESULTS.md` from `CURRENT_STATE_AUDIT_TEMPLATE.md` using repository, deployed-schema, and partner evidence.
4. Run and record the full regression baseline before modifying code.
5. Inspect the current Supabase schema, migrations, RLS, storage policies, capability functions, generated types, financial controls, partner adapters, feature flags, and Phase 2–4 data models.
6. Create ADRs for transaction classification, institutional role boundaries, official sources, direct-sale versus securities workflows, fund/admin integration, tokenized records, data rooms, and cross-border restrictions.
7. Copy `phase-5-execution-plan.template.json` to `phase-5-execution-plan.json`, replace all `AUDIT_REQUIRED` placeholders, add exact repository paths and decisions, validate against the schema, and update it after every task.

## Non-negotiable rules

- Never reset the database.
- `artist_music` remains the canonical catalog row.
- Do not replace private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, JukeboxProvider, the mobile player, preview jobs, library entitlements, marketplace downloads, or existing playback surfaces.
- Do not conflate a direct asset sale or license with a securities offering.
- Do not allow bids, subscriptions, closing, or tokenization without an approved transaction-classification record.
- Tourify must not act as investment adviser, broker-dealer, ATS, exchange, transfer agent, custodian, escrow agent, fund administrator, trustee, tax preparer, or bank unless a later approved legal structure explicitly authorizes it.
- Tourify must not hold cash or securities, exercise investment discretion, make personalized recommendations, or operate an unapproved matching engine.
- The designated legal documents and approved official recordkeepers control ownership, custody, NAV, capital accounts, execution, and settlement.
- Provider status must not be replaced silently by an internal estimate during an outage.
- All financial calculations use integer/rational math, explicit currency/precision, deterministic rounding, and reproducible traces.
- Finalized records are corrected by new versions or compensating entries, never destructive edits.
- Do not store private keys, seed phrases, raw identity documents, accreditation/QP/QIB files, tax forms, bank credentials, or privileged legal advice in ordinary tables.
- Transfer and product eligibility default to deny.
- No permissionless tokens, anonymous wallets, bridges, AMMs, leverage, derivatives, lending, rehypothecation, or automated liquidation.
- Every capability is independently feature flagged with a tested kill switch and rollback.
- No guaranteed value, yield, liquidity, protection, ownership, or legal-compliance claim.

## Architecture requirements

- Route handlers under `app/api/**`; use audited repository authentication and error helpers.
- Colocate Zod schemas in routes; shared logic belongs under `lib/music/institutional/` or the audited equivalent.
- Prefer interfaces, named exports, lowercase dash-separated files, and RORO helper parameters.
- Initialize provider SDKs lazily in server-only getters.
- Use additive migrations created through the installed Supabase CLI after checking version and `--help`.
- Enable RLS and explicit grants; use capability/membership/deal predicates, `USING` and `WITH CHECK`, and security-invoker views.
- Use restricted private storage and short-lived signed URLs for institutional documents.
- Use outbox-backed jobs, immutable raw partner receipts, idempotency, retries, dead-letter queues, and reconciliation.
- Keep provider IDs in adapter tables; stable Tourify IDs remain domain keys.

## Required implementation order

1. Audit, ADRs, legal/partner role map, baseline, feature flags, and stop conditions.
2. Institutional organization, membership, authority, eligibility assertion, and permission model.
3. Transaction classification, seller/catalog eligibility, immutable snapshots, and data-room security.
4. Diligence requests/findings, underwriting, valuation governance, and investment-committee workflow.
5. Deal rooms, IOIs, direct-sale bids/auctions, negotiation versions, and communication controls.
6. Direct catalog sale/license closing, revenue cutover, notices, and post-close reconciliation.
7. Fund/SPV, commitment, subscription, capital-call, and administrator synchronization.
8. NAV, holdings, waterfall, distribution, servicing, statement, and audit reconciliation.
9. Institutional portfolio risk, benchmarks, reporting, and data exports.
10. Institutional secondaries, tenders, transfer restrictions, and partner execution-quality data.
11. Custody, transfer-agent, bank, fund-admin, depository, and optional tokenized-record adapters.
12. Admin operations, security, MNPI, model risk, incidents, resilience, and disaster recovery.
13. Pilot, regression, independent review, controlled rollout, and Phase 6 handoff.

## Completion evidence

For every task in `phase-5-execution-plan.json`, record:

- exact files changed;
- migrations and validation queries;
- RLS and cross-tenant evidence;
- unit, integration, route, E2E, mobile, security, and regression tests;
- browser screenshots for UI;
- partner sandbox event IDs or fixtures;
- calculation and reconciliation traces;
- feature-flag and rollback evidence;
- unresolved blocker, owner, and stop condition;
- legal/compliance decision references without privileged content.

Do not mark a task complete merely because code exists.

## Stop conditions

Stop the affected workstream and mark it blocked when:

- transaction classification or responsible regulated party is unresolved;
- rights, revenue, valuation, official position, or seller authority is disputed;
- direct asset and securities workflows cannot be separated;
- a provider sandbox cannot reconcile official records;
- fund adviser/admin/custody/accounting responsibilities are ambiguous;
- RLS, data-room security, MNPI, financial controls, or smart-contract audit has a critical issue;
- implementation would destructively alter existing music functionality;
- cross-border, lending, securitization, leverage, or token features lack separate approval.

Continue independent nonblocked tasks without bypassing a stop condition.

## Final report

Produce `PHASE_5_IMPLEMENTATION_REPORT.md` containing architecture decisions, migrations, API/UI surfaces, role boundaries, transaction pathways, partner integrations, test and security results, reconciliation results, pilot outcomes, deferred work, blockers, rollback instructions, and a statement against every item in `34_DEFINITION_OF_DONE.md`.
