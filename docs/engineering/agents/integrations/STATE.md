# Integrations state

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f`
- Last reviewed at: 2026-09-25
- Active tasks: INTG-003 (local MFA persistence contract complete; hosted validation pending), INTG-006 (route-local webhook consistency; per-route inventory certified, migration manifest conformant, one out-of-lane ticketing gap handed off), and INTG-007 (external credential vault; first bounded slice complete)
- Confidence: every inbound webhook route under `app/api` is enumerated by directory walk (14 routes) and classified in `__tests__/integrations/webhook-route-inventory.test.ts`; a new inbound route now fails that suite until it is classified, and the Wave 32 hardening of those routes produces zero security-extended CodeQL alerts

## Durable facts

- Mission: Own external providers, webhooks, credential boundaries, workers, and integration resilience.
- Default working set is recorded in `WORKING_SET.json`.
- Provider surfaces include Supabase, Stripe, Resend, Twilio, Upstash, Sentry, OpenAI, AWS/Supabase storage, Vercel, Expo, Audius, BandsInTown, Ticketmaster, Shopify, Printful, and five social providers; the generated integration map records 9 env-backed provider categories while adapter coverage is broader.
- All eight `/api/cron/*` routes fail closed through `CRON_SECRET`; route-level coverage verifies unsigned requests receive 401. Seven are scheduled in `vercel.json`; `event-reminders` is explicitly deferred in `scripts/ci/cron-route-inventory.json`.
- Stripe webhook routes use endpoint-specific secrets only: subscriptions, ticketing, photos, marketplace, and music royalties no longer accept `STRIPE_WEBHOOK_SECRET` as a fallback.
- The photos purchase webhook has Supabase-backed claim-before-process idempotency with local duplicate-replay and interrupted-claim proofs.
- Marketplace provider and music partner webhook routes verify with their provider-specific primitives, atomically claim durable receipts before side effects, acknowledge unique duplicates, and fail closed on handler/completion persistence errors. Shopify requires the provider webhook ID; Printful requires a payload event ID.
- Supabase notification webhooks compare secrets in constant time and suppress already-delivered notification IDs through `notification_delivery_log`.
- Inbound webhook verification lives in `lib/integrations/webhook-security.ts`: `safeCompare` hashes both operands to a fixed width before `timingSafeEqual` (no length leak, empty never matches), plus `verifyHmacSignature`, `verifyPrefixedDigestSignature`, `isWithinReplayWindow`, and `isUniqueViolation`. All 14 inbound routes are classified in an executable inventory; a new inbound route fails that suite until classified.
- Replay defense is provider-shaped: providers that sign a timestamp (Stripe) use a bounded 300s window plus an event-id claim; providers that sign only a body digest (Supabase Database Webhooks) use the atomic `public.webhook_delivery_receipts` claim with a bounded reclaim — a fresh `processing` claim is never taken over, so concurrent duplicate delivery is acknowledged with no second send.
- A claimed receipt must fail closed when its completion write does not persist; the photos Stripe webhook previously acknowledged an unpersisted completion with 200 and now returns 500.
- The ticketing Stripe webhook verifies correctly but its ledger stamps `processed_at` at claim time, so an interrupted claim is acknowledged as a duplicate with no processing (HF-INTG-006-TICKETING, out of the integrations file set).
- Provider catalog covers only 5 social providers; no unified integration framework exists.
- MFA backup codes are now stored and verified with bcryptjs hashes at cost factor 12; existing legacy numeric hashes are not compatible and need an explicit regeneration/backfill decision.
- MFA verification codes use a server-only Supabase repository backed by the additive `mfa_verification_codes` migration. Codes are bcrypt-hashed before persistence; database functions serialize issue limits and attempt/consume transitions. The public table is RLS-enabled with no client policies or grants, and only `service_role` receives table/RPC privileges.
- Two email abstractions exist: `EmailDeliveryService` and `notification-channels.ts`.
- Token vault is an encrypted-only, fail-closed boundary for venue social integrations: writes never populate legacy plaintext columns, reads resolve legacy/undecryptable material to null (never raw text), and audit metadata is redacted before persistence.
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
- A migration-validation manifest `exceptions` array holds **objects**, never prose. A bare string produces seven simultaneous validator failures naming `exception <unknown>`. An entry's `type` must come from the four-value scanner vocabulary, so a deploy-ordering or other non-scanner note must reuse the closest label, carry no `sourceSha256`, and be mirrored into a semantically correct manifest field; otherwise it silently becomes a live scanner waiver.
- `npm run check:migration-validation` failing on a file you do not own is a handoff, not an invitation to edit it. The `expiresOn` check makes this failure mode calendar-driven: an entry that expired in a base snapshot reddened a required gate for every lane.
- Security-alert disposition rule: fix a real defect, or register a time-bounded registry entry with a real `productionExploitability` decision, or route it. Never set `dismissed_reason`, never add a suppression comment, and never change behaviour to satisfy a rule that has no defect behind it.

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

## INTG-007 encrypted credential vault checkpoint — 2026-09-21

- Credential write/read inventory recorded: org OAuth callback (plaintext persistence — now encrypted-only), venue token vault (legacy dual-write — now encrypted-only boundary), venue integrations route (legacy refresh fallback read — outside lane, handoff), admin content-hub routes (legacy plaintext selects — outside lane, handoff), and `supabase/functions/social-oauth`/`social-analytics` (plaintext writes/reads — outside lane, handoff).
- `lib/integrations/token-vault.ts` is now an encrypted-at-rest boundary: writes persist only AES-256-GCM envelope bytes (`key_version` 1) in the server-only vault table; reads fail closed (legacy `key_version` 0 copies, wrong-key, tampered, or malformed values resolve to `null` and are never surfaced); `redactCredentialLog` strips credential keys from audit metadata before persistence.
- `app/api/social/oauth/callback/route.ts` persists organization integrations encrypted-only via `buildOrganizationCredentialPayload` and fails the connect when encryption fails instead of writing plaintext.
- Authored additive forward-only migration `20260921000000_intg007_encrypted_social_credential_vault.sql` (planned manifest) revoking client column SELECT on the org plaintext columns and revoking legacy plaintext copies (org + venue source columns and `key_version` 0 vault bytes). NOT applied — CP-051 manual apply is hosted and out of scope.
- Focused Vitest passed 16/16 (full `__tests__/integrations`: 5 files / 50 tests); focused ESLint, `check:migration-validation`, `check:migration-chain`, `check:production-debug`, `git diff --check`, and the changed-path plaintext-fragment grep all passed; `agents:validate` reported 0 errors.
- INTG-007 stays active: DB must apply the migration to isolated staging per CP-051; ADMIN/VENUE/SOCIAL handoffs (HF-INTG-007-ADMIN, HF-INTG-007-VENUE, HF-INTG-007-SOCIAL) must finish removing legacy plaintext reads; no provider was enabled and social OAuth/analytics stay disabled through RELEASE-008.

## Wave 33 checkpoint — 2026-09-25

- The `check:migration-validation` failure against the integrations lane is **fixed**. The Wave 32 manifest stored a bare string in `exceptions`; the validator requires an object with a unique non-empty `id`, a `type` drawn from `{scoped-insert-select, unscoped-update-reviewed, blocking-constraint-reviewed, not-null-reviewed}`, plus `owner`, `rationale`, `issue`, `evidence`, and a `YYYY-MM-DD` `expiresOn`. `20260925130000_intg006_webhook_delivery_receipts.json` now carries `INTG006-WEBHOOK-RECEIPT-DEPLOY-ORDERING` with `expiresOn 2026-10-09`. The entry deliberately has no `sourceSha256` and the SQL has no `migration-validation:` marker comment, so it cannot suppress a future scanner finding; the deploy-ordering requirement is duplicated into `execution.resumeStrategy` so deleting the entry loses nothing. **The gate will redden again on 2026-10-10 unless the entry is deleted after the migration is applied.**
- The Wave 32 blocker "history-baseline checksum drift on `20260701021033_job_application_profile_snapshot.sql`" is **retired** — the database lane fixed it. `check:migration-validation` now scans 155 migrations clean. The only remaining failure is foreign: `20260821180438_job_posting_scopes_and_organization_seats.json`, exception `job-posting-scope-not-null`, expired 2026-09-21, owner `admin-platform` (handed off as HF-INTG-033-MIGRATION-VALIDATION-HIRING-EXPIRY). Time-based manifest expiries redden required gates on a calendar, not on a code change.
- CodeQL population re-read live from the API: **96 open alerts, 0 dismissed, 0 fixed**, one critical. Exactly **2** are integrations-owned: `#102` `app/api/social/oauth/callback/route.ts:44` (`js/user-controlled-bypass`) and `#94` `__tests__/integrations/security.test.ts:52` (`js/insufficient-password-hash`). **Zero** alerts fall in `app/api/webhooks/**`, any `*webhook*` route, or `lib/integrations/**`, so the Wave 32 hardening introduced no new finding.
- `js/user-controlled-bypass` on a required-parameter presence check is a recurring rule shape in this repository, not a defect class: in `#102`, `#85` (`app/auth/callback/route.ts:37`), `#103` (`app/auth/confirm/route.ts:50`) and `#82/#83/#84` (`app/api/stripe/connect/route.ts`) the "guard" (`if (code)`, `if (action === ...)`) is the very value the sensitive action consumes, so the attacker-controlled input *narrows* the paths reaching the sensitive action instead of skipping it. Confirm the fail-closed check is unconditional on the path before disposing any of these.
- Both owned alerts are registered in `security/security-scan-exceptions.json` as `not_exploitable` with a 2026-11-24 expiry. Nothing was dismissed on GitHub, no suppression comment was added, and no code was changed to satisfy a rule. The adjacent production signer `lib/admin/content-hub/oauth-state.ts:96` (alert `#95`) is raised entirely from `createSignedOAuthState` calls inside the integrations **test** file, so only test-fixture material reaches the sink; it is admin-owned and routed as HF-INTG-033-CODEQL-OAUTH-STATE-HASH.
- Integrations assessment: the Advanced Security `CodeQL` gate is **not actionable as a merge signal while `refs/heads/main` has zero recorded analyses**. With ~900 changed files the platform attributes the whole tree to the PR, which is why 94 of 96 alerts sit in files the PR never touched. That is a release/observability governance decision, not a per-PR code problem (CP-060).
- Wave 32 outcomes re-verified intact and green: `npx vitest run __tests__/integrations` 8 files/173 tests; jest photos + music-royalty + secret-boundaries 3 suites/24; jest checkout-p6 + shopify-adapter 2 suites/14; `npx vitest run __tests__/ticketing __tests__/marketplace` 19 files/148. Focused ESLint over 15 integrations-owned TS files exit 0; `check:migration-chain` exit 0 (301 files); `check:production-debug` exit 0 (40 unsafe routes); `check-security-exceptions.mjs` exit 0 and its unit tests 3/3; `agents:validate` 0 errors; changed-path `git diff --check` clean.
- `check:migration-ledger` (hosted-history-ledger.json snapshot mismatch, `launch.unclassified.count` must be 292) and `check:service-role-allowlist` (two untracked venue-lane files) exit 1 outside the integrations working set. The Wave 32 stale `app/marketplace/order/[token]/page.tsx` allowlist failure is gone.
- No migration was applied and no hosted system was mutated (CP-051). No full-repository typecheck or full test run was performed by design.

## INTG-006 per-route webhook inventory checkpoint — 2026-09-25

- Enumerated every inbound webhook route by walking `app/api` (14 routes: 5 Stripe endpoints, Shopify + Printful provider webhooks, the Shopify OAuth callback, 4 partner-provider webhooks, the music royalty payout webhook, the Supabase notification webhook, and the social OAuth callback). The inventory is asserted in `__tests__/integrations/webhook-route-inventory.test.ts`, so a new inbound route fails the suite until it is classified; no route was invented.
- Hardened: all four partner-provider routes (music marketplace, institutional, licensing, rights-admin) now verify through the shared constant-time primitive and reject an absent signature with 400 when a secret is configured (previously a misleading 503); the Supabase notification webhook gained an atomic claim-before-deliver with bounded reclaim; the photos Stripe webhook now fails closed on an unpersisted completion write; the subscriptions Stripe webhook fails closed with 503 on an unconfigured endpoint, uses the shared unique-violation primitive, and no longer logs raw provider/database error objects.
- Verified and unchanged: marketplace Stripe (processor unchanged), Shopify, Printful, music royalty payouts, the Shopify OAuth callback, and the social OAuth callback (INTG-007).
- Focused verification: `npx vitest run __tests__/integrations` passed 8 files / 173 tests (was 5 files / 50); scoped jest for the photos, music-royalty, and Stripe secret-boundary suites passed 3 suites / 24 tests; `__tests__/ticketing` passed 2 files / 34; `__tests__/marketplace` passed 4 files / 28; marketplace processor + Shopify adapter jest suites passed 14. Focused ESLint exit 0, scoped TypeScript slices exit 0 with zero diagnostics, `check:migration-chain` exit 0 (301 files), `check:production-debug` exit 0, changed-path `git diff --check` clean, `agents:validate` 0 errors.
- Authored additive forward-only migration `20260925130000_intg006_webhook_delivery_receipts.sql` (unapplied, CP-051) with a planned manifest. Apply it BEFORE deploying the notification route change: the route fails closed with 500 while the table is absent.
- Open: the ticketing completion-marker gap is handed off as HF-INTG-006-TICKETING; `check:migration-validation` currently exits 1 on a history-baseline checksum drift caused by a concurrent lane's edit to `20260701021033_job_application_profile_snapshot.sql` (my migration and manifest scan clean when validated directly); `check:migration-ledger` was already stale before this lane (expects 299 active / 290 unclassified against 300 active pre-existing) and additionally needs my migration classified by the database lane.
