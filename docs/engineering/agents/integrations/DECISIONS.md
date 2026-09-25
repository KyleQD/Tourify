# Integrations decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-021 — One shared constant-time verification primitive; route-local ledgers stay local

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006
- Decision: Inbound webhook verification moves onto a single audited primitive in `lib/integrations/webhook-security.ts` (`safeCompare`, `verifyHmacSignature`, `verifyPrefixedDigestSignature`, `isWithinReplayWindow`, `isUniqueViolation`). Each route keeps its own provider envelope, secret resolution, receipt ledger, and response shape; only the comparison is shared. `safeCompare` hashes both operands to a fixed-width digest before `timingSafeEqual`, so neither the secret nor the signature length is observable, and an empty operand never matches. The partner digest (`sha256("<secret>:<rawBody>")`) is preserved byte-for-byte so existing partners keep working while the comparison becomes constant-time. The non-constant-time `verifyPartnerWebhookSignature` helpers in `lib/music/*/partner-adapters.ts` are left in place (out of lane) but are no longer on any inbound trust boundary.
- Evidence: `__tests__/integrations/webhook-security-primitives.test.ts` (20 tests) proves wire compatibility with the pre-existing partner digest and that a length-mismatched pair is still hashed to a fixed width first. `__tests__/integrations/webhook-route-behavior.test.ts` proves four routes reject an invalid signature with zero recorded database operations.
- Consequences: One place to audit for constant-time behavior. Any future inbound route is expected to use this module rather than a local `===`. A configured secret now means "an absent signature is a rejection", which is a deliberate status change from a misleading 503 to a truthful 400 on the four partner routes.

## DOMAIN-022 — A provider that signs no timestamp needs a durable receipt ledger, not a replay window

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006
- Decision: Replay rejection is split by what the provider actually gives us. Providers that sign a timestamp (Stripe) keep their bounded 300s window and rely on the provider event-id claim for the rest. Providers that sign only a body digest (Supabase Database Webhooks) have no timestamp to bound, so the replay defense is an atomic claim-before-side-effect on a durable receipt ledger with a bounded reclaim. `public.webhook_delivery_receipts` (migration `20260925130000_intg006_webhook_delivery_receipts.sql`, additive, unapplied) is that ledger: primary key `(provider, delivery_id)`, status in `processing|delivered|failed`, and a conditional takeover that only one concurrent request can win, gated on `status = 'failed'` (immediately reclaimable) or `status = 'processing'` older than 300 seconds (interrupted attempt). A fresh `processing` claim is never taken over, so concurrent duplicate delivery is acknowledged with no second send.
- Evidence: `__tests__/integrations/webhook-route-behavior.test.ts` covers fresh claim, replayed delivery, concurrent duplicate, bounded-window reclaim, failed-claim reclaim, lost reclaim race, non-duplicate claim failure, delivery failure release, and completion-write failure.
- Consequences: The Supabase notification route intentionally fails closed with 500 while the table is absent, so the migration MUST be applied before the route is deployed — recorded as a manifest exception and a task blocker. A dedicated receipt table was chosen over a unique index on `notification_delivery_log` because that table is a delivery-metrics table with existing rows; a unique index there could fail to build on historical duplicates and would have required destructive deduplication.

## DOMAIN-023 — Completion is part of the idempotency contract, not best-effort bookkeeping

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006
- Decision: A route that claims a receipt must fail closed when the completion write does not persist, because an unpersisted completion leaves the claim incomplete and turns the provider's retry into a second full processing pass. The photos Stripe webhook previously swallowed the `platform_webhook_events` completion error and returned 200; it now returns 500. This is the same rule the subscription and marketplace Stripe routes already followed.
- Evidence: `app/api/photos/purchase/webhook/__tests__/route.test.ts` — first-delivery completion failure returns 500 `Ledger completion failed`, a resumed-claim completion failure returns 500, and the unprovisioned-ledger (`42P01`) degraded path still returns 200 without attempting a completion write.
- Consequences: Providers see a retry instead of a false acknowledgement. The resume path re-runs the guarded `photo_purchases` transitions, which are already conditional on `payment_status in ('pending','processing')`, so the resume is a no-op re-apply rather than a double fulfillment. The same rule identifies the open ticketing gap in HF-INTG-006-TICKETING, where the ledger stamps `processed_at` at claim time so completion is not observable at all.

## DOMAIN-024 — A deploy-ordering exception is a time-boxed governance record, not a code change

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006 (Wave 33)
- Decision: The Wave 32 manifest for `20260925130000_intg006_webhook_delivery_receipts.sql` was invalid: its `exceptions` array held a bare string instead of the object shape `scripts/ci/check-migration-validation.mjs` requires, and the gate reported seven failures against the integrations file. The entry is now an object with `id`, `type`, `owner`, `rationale`, `issue`, `evidence`, and a 2026-10-09 `expiresOn`. Two constraints are deliberate. First, the entry carries **no** `sourceSha256` and the SQL carries **no** `migration-validation:` marker comment, so the entry cannot suppress a future scanner finding: without either, `hasApprovedException` never resolves it, and the vocabulary the validator forces (`blocking-constraint-reviewed`) is reused as the closest constraint-class label rather than as a live waiver. Second, the deploy-ordering fact is duplicated into `execution.resumeStrategy`, where it is semantically correct, so deleting the exception entry loses no information. The short expiry is honest: the entry is only true until the migration is applied, and an exception that outlives the artifact it describes is the failure mode the validator's expiry check exists to prevent.
- Evidence: `npm run check:migration-validation` — before: 8 `✗` lines, 7 of them on the integrations manifest; after: `✓ scanned supabase/migrations/20260925130000_intg006_webhook_delivery_receipts.sql with planned manifest`, with the only remaining failure on a foreign hiring manifest. `npm run check:migration-validation -- supabase/migrations/20260925130000_intg006_webhook_delivery_receipts.sql` — exit 0.
- Consequences: `check:migration-validation` will redden again on 2026-10-10 if the entry is not removed. That is intended: the entry must be deleted when version 20260925130000 is applied to the target environment and the notification route is confirmed enabled. The same expiry mechanism just reddened a foreign manifest (`job-posting-scope-not-null`, expired 2026-09-21), which is handed off as `HF-INTG-033-MIGRATION-VALIDATION-HIRING-EXPIRY` rather than edited from this lane.

## DOMAIN-025 — A not-exploitable security finding is disposed in the registry, never dismissed and never "fixed"

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006 (Wave 33, HF-RELEASE-SEC-CODEQL triage)
- Decision: For a code-scanning alert in integrations-owned code, the default action is: read the executable source, then either fix a real defect in integrations ownership or register a `security/security-scan-exceptions.json` entry with a real owner, rationale, issue, mitigation, and an `productionExploitability.decision` from the supported set. A false positive is **not** grounds for a code change — inventing a "fix" for a non-defect is a behaviour change without a defect behind it. Integrations does not dismiss alerts on GitHub, does not add `dismissed_reason`, and does not add source-scanning suppression comments to make a check pass. Of the 96 open alerts, exactly 2 fall in integrations-owned files; both are registered as `not_exploitable` with a 2026-11-24 expiry so they must be re-triaged rather than inherited silently.
- Evidence: `gh api repos/KyleQD/Tourify/code-scanning/alerts?pr=14&state=open&per_page=100` (5 pages) — 96 alerts, `dismissed_reason` null x96, `fixed_at` null x96; bucketing every path against the integrations Wave 33 globs yields only #102 and #94. `node scripts/ci/check-security-exceptions.mjs` — exit 0, `2 active exception(s)`. `node --test scripts/ci/check-security-exceptions.test.mjs` — 3/3 pass.
- Consequences: The registry is the audit trail, so it must not be used as a dumping ground: an entry that cannot name a compensating control or a concrete exploitability decision does not belong in it. The 14 inbound webhook routes hardened in Wave 32 produce **zero** security-extended alerts, which is the strongest available signal that the constant-time primitive and receipt-ledger work did not introduce a new finding. Remaining alerts are routed, not dispositioned, by `HF-INTG-033-CODEQL-TRIAGE-RESULT`; the discover-owned critical SSRF was deliberately left untouched and undismissed.
