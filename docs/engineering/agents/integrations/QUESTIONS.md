# Integrations questions for product owner

_Reconciled: 2026-09-10 · Task: INTG-001_

Resolved findings are not repeated as open decisions: photo webhook idempotency is complete in `INTG-002`; cron authentication is complete in `INTG-004`; Stripe secret splitting is complete in `INTG-005`; and MFA backup-code hashing is complete in `INTG-003`. The remaining owner questions are below.

## P1 — launch and reliability decisions

### Q-003 — MFA verification-code store: build now or sequence after the schema contract?

SMS verification codes remain in the process-local `Map` in `lib/services/mfa.service.ts`. Should Integrations, Database, and Auth build the additive `mfa_verification_codes` table plus server-only access boundary now, or explicitly defer it with a documented deploy/restart limitation?

- Related gap: G-009
- Dependency: `docs/work-packets/INTG-003.md`

### Q-005 — Webhook framework: build shared abstraction or keep route-local contracts?

The webhook routes now have endpoint-specific secrets and idempotency protections, but they still reimplement verification, parsing, failure responses, and receipt handling. Should the team build a shared webhook contract, or keep the mechanisms route-local and harden each one independently?

- Related gaps: G-002, G-003

### Q-006 — Music outbox workers: deploy as scheduled jobs or defer?

Twenty-one music worker scripts are not scheduled or monitored. Should they be made durable with a scheduler, retry/DLQ policy, and health evidence before launch, or explicitly moved to post-launch scope?

- Related gap: G-012
- Backlog ref: WS-1.5

### Q-007 — Event reminders: implement or drop?

`app/api/cron/event-reminders/route.ts` currently enumerates events but sends no reminders and is intentionally unscheduled. Should reminder delivery and replay protection be built, or should the feature be removed from launch scope?

- Related gap: G-013
- Backlog ref: WS-1.5

### Q-008 — Provider health checks: build now or defer?

Audius has a provider-specific health helper, but there is no cross-provider readiness view. Should health probes for payment, delivery, marketplace, event, and social providers be a launch requirement, or be deferred?

- Related gap: G-007
- Backlog ref: WS-1.4

### Q-009 — Sentry and provider-call instrumentation: build now or defer?

Shared Sentry setup exists, but webhook handlers and workers do not consistently record provider latency, retries, failures, and correlation IDs. Should Integrations own this instrumentation, or should it be sequenced under Release/Observability?

- Related gap: G-020
- Backlog ref: WS-1.4

### Q-010 — Rate-limit coverage and proof: expand now or incrementally?

Rate limiting covers selected search, upload, error-report, and check-in paths, while authentication built-ins, messaging fan-out, and other high-traffic routes remain outside the first-party limiter. Should coverage expand before launch, and is a provisioned Upstash smoke run required for acceptance?

- Related gaps: G-015, G-024
- Backlog ref: WS-1.3

## P2 — hardening and ownership decisions

### Q-011 — Unified provider abstraction: build or leave ad hoc?

Provider configuration, health, retry, and error handling differ across social, marketplace, music, and event adapters. Should a common provider contract be introduced, or should each domain retain its own adapter pattern?

- Related gaps: G-006, G-008

### Q-012 — Provider catalog expansion: extend or keep social-only?

The provider catalog covers five social providers while the repository also operates Stripe, Resend, Twilio, Upstash, Audius, Ticketmaster, BandsInTown, Shopify, Printful, Expo, and OpenAI integrations. Should readiness metadata cover all of them, or remain a social-only product surface?

- Related gaps: G-005, G-026

### Q-013 — Credential rotation: build a framework or defer to security?

The token vault encrypts social credentials but does not manage expiry, refresh, rotation, or revocation across providers. Should Integrations build a lifecycle framework, or should Security own a later pass?

- Related gap: G-010

### Q-014 — Email service consolidation: merge or keep the dual boundary?

`EmailDeliveryService` and `notification-channels.ts` both use Resend but expose different abstractions. Should they be merged, or should their separate transactional and preference-routed responsibilities be documented and retained?

- Related gap: G-017

### Q-015 — Integration audit dashboard: build or hand off?

`integration_audit_log` exists, but there is no cross-provider admin view for readiness, health, webhook state, credentials, or workers. Should this be built by Integrations, handed to Admin, or deferred?

- Related gaps: G-004, G-021

### Q-016 — Marketplace full-flow tests: build or hand off to QA?

Shopify and Printful have signature/normalization unit tests but no webhook → adapter → database integration tests. Should Integrations add these fixtures and flows, or should QA own them after the provider contracts stabilize?

- Related gaps: G-022, G-023

### Q-017 — Integration code organization: restructure or document?

Provider code is split across `lib/integrations/`, `lib/marketplace/`, `lib/music/providers/`, `lib/events/providers/`, `lib/services/`, and `lib/admin/content-hub/`. Should the team consolidate paths, or document domain ownership and keep the current structure?

- Related gap: G-025

### Q-018 — SMS/push reliability: build a queue or retain fire-and-forget delivery?

Twilio and Expo calls have no durable retry, dead-letter, or invalid-token cleanup flow. Should notification delivery gain a shared queue and retry policy, or is best-effort delivery acceptable?

- Related gaps: G-018, G-019

## Recommended sequencing

1. Confirm Q-003 because the MFA fix depends on a Database/Auth schema and access contract.
2. Decide Q-006, Q-007, Q-008, Q-009, and Q-010 against the launch gates G4–G6.
3. Decide Q-005 before adding more webhook providers or another provider-specific receipt mechanism.
4. Sequence Q-011–Q-018 as explicit follow-up tasks, with Admin/QA/Release ownership recorded where selected.

Each answer should become a bounded task record owned by Integrations or a documented handoff; unanswered questions do not block completion of INTG-001.

## Owner decisions — 2026-09-10

- Q-003: defer the DB-backed MFA code store until Database/Auth publish the
  additive schema, RLS/privilege contract, generated types, and server-only
  repository boundary.
- Q-005: use shared signature/idempotency primitives first while retaining
  route-local webhook handlers; revisit a full framework after route behavior is
  proven consistent.
- Q-006: build the worker framework first and use the approved hybrid runtime
  direction recorded in `docs/engineering/OWNER_DECISIONS_2026-09-10.md`.
- Q-009: observability ownership is Release-led, with Integrations supplying
  provider latency, retry, failure, and correlation instrumentation.
- Q-010: production rate limiting is required once Upstash is provisioned;
  acceptance includes a real 429 smoke.
