# Integrations state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-11
- Active tasks: INTG-003 (local MFA persistence contract complete; hosted validation pending) and INTG-006 (route-local webhook consistency)
- Confidence: baseline reconciled against current code and refreshed generated maps; 23 open gaps and 15 owner questions documented

## Durable facts

- Mission: Own external providers, webhooks, credential boundaries, workers, and integration resilience.
- Default working set is recorded in `WORKING_SET.json`.
- Provider surfaces include Supabase, Stripe, Resend, Twilio, Upstash, Sentry, OpenAI, AWS/Supabase storage, Vercel, Expo, Audius, BandsInTown, Ticketmaster, Shopify, Printful, and five social providers; the generated integration map records 9 env-backed provider categories while adapter coverage is broader.
- All eight `/api/cron/*` routes fail closed through `CRON_SECRET`; route-level coverage verifies unsigned requests receive 401. Seven are scheduled in `vercel.json`; `event-reminders` is explicitly deferred in `scripts/ci/cron-route-inventory.json`.
- Stripe webhook routes use endpoint-specific secrets only: subscriptions, ticketing, photos, marketplace, and music royalties no longer accept `STRIPE_WEBHOOK_SECRET` as a fallback.
- The photos purchase webhook has Supabase-backed claim-before-process idempotency with local duplicate-replay and interrupted-claim proofs.
- Marketplace provider and music partner webhook routes verify with their provider-specific primitives, atomically claim durable receipts before side effects, acknowledge unique duplicates, and fail closed on handler/completion persistence errors. Shopify requires the provider webhook ID; Printful requires a payload event ID.
- Supabase notification webhooks compare secrets in constant time and suppress already-delivered notification IDs through `notification_delivery_log`.
- Provider catalog covers only 5 social providers; no unified integration framework exists.
- MFA backup codes are now stored and verified with bcryptjs hashes at cost factor 12; existing legacy numeric hashes are not compatible and need an explicit regeneration/backfill decision.
- MFA verification codes use a server-only Supabase repository backed by the additive `mfa_verification_codes` migration. Codes are bcrypt-hashed before persistence; database functions serialize issue limits and attempt/consume transitions. The public table is RLS-enabled with no client policies or grants, and only `service_role` receives table/RPC privileges.
- Two email abstractions exist: `EmailDeliveryService` and `notification-channels.ts`.
- Token vault supports encrypted dual-read/write for venue social integrations.
- The reconciled audit has 23 open gaps: 11 missing, 9 incomplete, and 3 improve. No unresolved P0 remains; 9 open items are P1 and the remainder P2. Four initial findings are retained as resolved evidence.

## Current focus

- INTG-001 is complete; baseline, current gaps, and owner questions are reconciled in `BASELINE.md`, `GAPS.md`, and `QUESTIONS.md`.
- Awaiting product owner answers on 15 current questions before creating follow-up tasks.
- INTG-002, INTG-004, and INTG-005 completed for the local-readiness blocker lane; Release must provision the named secrets before live local forwarding.

## INTG-006 verification checkpoint — 2026-09-11

- Feature-tier route contract verification passed: 1 file, 8 tests.
- Focused ESLint passed for all eight changed webhook/processor implementation paths plus the INTG-006 contract test.
- Narrow scoped TypeScript verification passed with zero diagnostics across the eight changed implementation files; the temporary scoped config was removed after the run.
- Changed-path `git diff --check` passed. No production code or database migrations changed in this verification-only slice.
- INTG-006 remains active pending hosted-schema evidence: Database must reconcile the archived marketplace provider/music partner ledger DDL and manually apply reviewed migrations under CP-051 before live webhook enablement. Live Supabase schema/RLS evidence is not available in this environment.

## Known risks

- The repository was already heavily modified at bootstrap.
- Generated maps describe topology, not behavioral correctness.
- 27 vitest failures remain (some may be in integration code paths).
- INTG-003 local code and migration are complete, but production-readiness remains blocked until DB-008 applies the migration to isolated staging, runs the security/lifecycle fixtures and advisors, regenerates canonical types, and USER-005 supplies the staged account-lifecycle evidence.
- Integration coverage now includes security, MFA backup-code, photo webhook replay, cron authorization, and Stripe secret-boundary suites; broad provider-flow and live resilience evidence remain open.
- Worker scripts (21) have no monitoring — silent failures possible.
- Marketplace provider and music partner webhook ledger DDL remains in the pre-reconciliation migration archive; Database must reconcile and manually apply it before live webhook enablement.

Update this file only when a task establishes a durable fact future work needs.

## Owner direction — 2026-09-10

MFA DB persistence is deferred pending an authoritative schema and server-only
boundary. Webhook hardening proceeds with shared signature/idempotency primitives
and route-local handlers. Worker operations use the approved hybrid runtime, with
Release owning external observability provisioning.

## Production launch graph — 2026-09-16

- INTG-003 and INTG-006 are P0. MFA requires persistent server-only storage and deterministic replay/rate-limit behavior; enabled launch webhooks require deployed signature, idempotency, retry, and redaction evidence.
- INTG-007 is P1 and owns removal of plaintext social OAuth credentials, migration or revocation, encrypted lifecycle verification, and fail-closed provider gating.
- Advanced provider webhooks and social OAuth remain disabled through RELEASE-008 until their own acceptance evidence passes.

## INTG-003 checkpoint — 2026-09-17

- Replaced the MFA service's process-local verification-code `Map` with an explicit `MfaVerificationCodeStore` contract. The production default now fails closed until Database/Auth provide the approved server-only durable repository; the in-memory implementation is test-only.
- Added deterministic contract coverage for user scoping, bcrypt-backed code storage, expiry, three-attempt lockout, replay prevention, resend cooldown, and per-user issue-window limits. SMS code generation and challenge IDs now use Web Crypto, and verification codes are never logged.
- Focused Vitest and ESLint pass. Full repository typecheck was started but did not finish within the bounded run; hosted schema, generated types, server-only repository wiring, and staging lifecycle evidence remain blocked on Database/Auth/Release.

## INTG-003 database handoff checkpoint — 2026-09-18

- Added the authoritative forward-only `mfa_verification_codes` migration through `supabase migration new`, including bcrypt-only storage constraints, user scoping, expiry, three-attempt lockout, replay state, resend/issue-window rate limits, retention-aware cleanup, RLS/default-deny table ACLs, and service-role-only atomic RPCs.
- Wired the MFA singleton to a `server-only` Supabase repository that hashes before persistence and never sends plaintext codes to Postgres. The test-only in-memory implementation remains available only through the explicit testing factory.
- Focused Vitest passed 2 files / 11 tests; focused ESLint, migration manifest validation, active-chain validation, hosted-ledger consistency, and changed-path diff checks passed. The narrow TypeScript slice exhausted the default 2 GB heap, so no typecheck pass is claimed.
- INTG-003 stays active. DB-008 owns one-at-a-time isolated-staging apply, `supabase/tests/intg003_mfa_verification_code_security.sql`, lifecycle/concurrency fixtures, advisors, ledger evidence, and canonical type regeneration. USER-005/QA-003 own the deployed account-lifecycle acceptance evidence.

## INTG-006 verification checkpoint — 2026-09-17

- Added the explicit `FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED` server gate to music marketplace, institutional, licensing, rights-admin, and music royalty webhook routes. These routes now fail closed before provider-secret or payload processing unless separately approved.
- Marketplace Stripe webhook failures now return a generic retryable error and persist only `internal_error`; provider/database messages are not returned or persisted in the event ledger.
- Focused Vitest contract/config tests passed (16 tests) and focused ESLint passed for all changed implementation and test files.
- No hosted systems or Supabase migrations were changed. Database must still reconcile receipt-ledger schemas and prove notification delivery claims on staging/production.
