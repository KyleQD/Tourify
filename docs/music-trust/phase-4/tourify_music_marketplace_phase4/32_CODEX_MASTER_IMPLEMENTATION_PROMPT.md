# Codex Master Implementation Prompt — Tourify Music Marketplace Phase 4

You are implementing Phase 4 inside the existing Tourify repository. Read every file in this package before changing code.

## Mission

Build the partner-led primary-offering, portfolio, transfer, and controlled secondary-liquidity ecosystem described in these documents. Extend the current music, Rights Passport, royalty, payout, valuation, marketplace, payment, and admin systems non-destructively.

## Mandatory first actions

1. Copy this package to `docs/music-trust/phase-4/`.
2. Read the canonical Music Ecosystem Integration Guide and Phase 1–3 documents.
3. Complete `CURRENT_STATE_AUDIT_RESULTS.md` from `CURRENT_STATE_AUDIT_TEMPLATE.md` using actual repository and deployed-schema evidence.
4. Run and record the regression baseline before modifying code.
5. Inspect the current Supabase schema, migrations, RLS, storage policies, capability functions, generated types, payment/webhook infrastructure, marketplace listings, Phase 2 snapshots, and Phase 3 ledger/valuation implementation.
6. Identify all conflicts between templates and the repository. Preserve the repository's canonical music architecture while enforcing this package's legal and security boundaries.
7. Copy `phase-4-execution-plan.template.json` to `phase-4-execution-plan.json`, replace all `AUDIT_REQUIRED` and generic scope text, add repository paths and partner decisions, validate it against the schema, and keep it updated after every task.

## Non-negotiable rules

- Never reset the database.
- `artist_music` remains the canonical catalog row.
- Do not replace private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, JukeboxProvider, mobile music provider, preview jobs, library entitlements, existing music marketplace listings, or current playback surfaces.
- Do not model a music download/listing as a security.
- Do not create a Tourify-operated order-matching engine, ATS, custody system, escrow account, stablecoin, internal wallet balance, or money-transmission workflow.
- No offering may launch without a stored, approved pathway decision, regulated partner identifier, immutable disclosure version, and feature flag.
- The transfer agent or approved partner official ledger—not a Tourify row—is the ownership source of truth.
- A blockchain token is optional and cannot create or transfer legal ownership independently of the approved process.
- Transfer eligibility defaults to deny.
- Do not store private keys, seed phrases, raw identity documents, tax forms, or accreditation documents in ordinary application tables.
- All partner webhooks require signature verification, immutable raw receipt storage, idempotency, monotonic state validation, retries, and reconciliation.
- All monetary and quantity calculations use integer/rational math and explicit currency/precision.
- Posted financial and securityholder events are corrected through compensating records, never destructive edits.
- Every new user-facing capability is independently feature flagged with a tested kill switch.
- No claim of guaranteed liquidity, value, appreciation, royalty income, AI protection, or legal ownership.

## Architecture requirements

- Route handlers under `app/api/**`; use the repository's `requireApiUser` and `jsonError` helpers.
- Colocate Zod schemas in route handlers; shared domain logic belongs under `lib/music/marketplace/` or the repository's audited equivalent.
- Prefer interfaces, named exports, lowercase dash-separated filenames, RORO helper arguments, and no new global music state store.
- Initialize partner and payment SDK clients lazily inside server-only getters.
- Use additive migrations created through the installed Supabase CLI after checking `--help` and the current version.
- Enable RLS and explicit grants as appropriate; use capability-based policies, `USING` plus `WITH CHECK`, and security-invoker views.
- Use private storage and short-lived signed URLs for disclosures, statements, and evidence.
- Use outbox-backed jobs for partner calls and state propagation.
- Keep provider IDs in adapter tables; stable Tourify IDs remain domain keys.

## Required implementation order

1. Audit, legal/partner decisions, ADRs, feature flags, and baseline.
2. Issuer eligibility, offering pathway decision records, and data-room model.
3. Additive schema, RLS, storage, generated types, and domain helpers.
4. Offering lifecycle, immutable disclosure versions, communication controls, and issuer workspace.
5. Partner-linked investor onboarding and eligibility read model.
6. Subscription, escrow-status, allocation, refund, closing, and reconciliation adapters.
7. Official position and transfer-agent synchronization.
8. Transfer restrictions, transfer requests, repurchase workflows, and holds.
9. Partner ATS integration, order receipts, market data, executions, and settlement reconciliation.
10. Distributions, corporate actions, issuer reporting, statements, and tax-document links.
11. Surveillance, complaints, incident response, admin queues, and observability.
12. Optional tokenized representation only after counsel, partner, audit, and feature-gate approval.
13. Pilot, regression, security validation, disaster recovery, and controlled rollout.

## Completion evidence

For every task in `phase-4-execution-plan.json`, record:

- exact files changed;
- migrations and validation queries;
- RLS and permission evidence;
- unit, integration, route, contract, E2E, mobile, and regression tests;
- screenshots or browser verification for UI;
- partner sandbox event IDs or fixtures;
- feature flag and rollback evidence;
- unresolved blockers and owner;
- legal/compliance decision references without exposing privileged advice.

Do not mark a task complete because code exists. It is complete only when its acceptance criteria and tests pass and evidence is recorded.

## Stop conditions

Stop the affected workstream and mark it blocked if:

- the regulated party for an activity is unresolved;
- counsel has not approved the offering pathway or Tourify role;
- Phase 2 ownership or Phase 3 revenue/valuation data is disputed or unreconciled;
- official position source is ambiguous;
- a partner sandbox cannot reconcile subscriptions, positions, executions, settlements, or refunds;
- RLS, secrets, financial controls, or smart-contract audit has a critical issue;
- implementation would require destructive changes to existing music functionality.

Continue independent nonblocked tasks; do not bypass a stop condition.

## Final report

Produce `PHASE_4_IMPLEMENTATION_REPORT.md` containing completed scope, architecture decisions, migrations, API and UI surfaces, partner boundaries, test results, security findings, reconciliation results, pilot results, deferred work, blockers, rollback instructions, and a statement against every item in `31_DEFINITION_OF_DONE.md`.
