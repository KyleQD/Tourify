# Integrations gaps

_Reconciled: 2026-09-10 · Source SHA: `7cf660ad` · Generated maps refreshed 2026-09-10._

## Triage key

- **MISSING**: capability does not exist.
- **INCOMPLETE**: capability exists only partially or is not production-ready.
- **IMPROVE**: behavior works but needs hardening, consolidation, or better evidence.

## Resolved since the first audit snapshot

- **G-001 (P0)** — Photo webhook idempotency: resolved by `INTG-002`. `app/api/photos/purchase/webhook/route.ts` claims `platform_webhook_events` before processing, resumes interrupted claims, and guards purchase transitions; replay coverage is in `app/api/photos/purchase/webhook/__tests__/route.test.ts`.
- **G-011 (P1)** — Stripe webhook secret environment split: resolved by `INTG-005`. The five Stripe handlers use endpoint-specific secrets, covered by `app/api/webhooks/__tests__/webhook-secret-boundaries.test.ts`.
- **G-014 (P1)** — Cron route authentication: resolved by `INTG-004`. All eight `app/api/cron/**/route.ts` entrypoints use `isAuthorizedCronRequest`; `app/api/cron/__tests__/cron-auth.test.ts` covers unsigned requests.
- **G-009a (P1)** — MFA backup-code hashing: resolved by `INTG-003`. `lib/services/mfa.service.ts` stores bcrypt hashes at cost 12 and `__tests__/integrations/mfa.service.test.ts` verifies one-time redemption.

## Current gaps

### A. Webhook infrastructure

### G-002 — Inconsistent webhook idempotency patterns (IMPROVE)

- **Location**: `app/api/subscriptions/webhook/route.ts`, `app/api/ticketing/webhook/route.ts`, `app/api/marketplace/webhook/route.ts`, `app/api/photos/purchase/webhook/route.ts`, `app/api/webhooks/music-marketplace/[partner]/route.ts`
- **Evidence**: The routes use a platform ledger, `claimWebhookEvent`, marketplace-specific processing, and partner receipt storage respectively. The mechanisms are individually guarded but not one shared contract.
- **Severity**: P1 — maintenance and correctness consistency.

### G-003 — No shared webhook framework (MISSING)

- **Location**: webhook route files under `app/api/**/webhook*` and `app/api/webhooks/**`
- **Evidence**: Signature verification, body parsing, failure responses, and receipt handling remain route-local; no shared webhook middleware/service is present in `lib/integrations/`.
- **Severity**: P2 — developer experience and consistency.

### G-004 — No webhook retry/health dashboard (MISSING)

- **Location**: no current cross-provider dashboard; related table `integration_audit_log` is documented in `docs/engineering/generated/database-objects.md`
- **Evidence**: The repository has receipt/ledger tables and an admin marketplace webhook-events route, but no cross-provider failure, retry, or latency dashboard.
- **Severity**: P2 — operability.

### B. Provider infrastructure

### G-005 — Provider catalog covers only five social providers (INCOMPLETE)

- **Location**: `lib/integrations/provider-catalog.ts`
- **Evidence**: The catalog defines Instagram, Facebook, YouTube, TikTok, and Twitter. Other source adapters and provider clients are in `lib/marketplace/`, `lib/music/providers/`, `lib/events/providers/`, and `lib/admin/content-hub/` but are not represented in the catalog.
- **Severity**: P2 — incomplete readiness visibility.

### G-006 — No unified provider abstraction (MISSING)

- **Location**: no shared provider contract spanning `lib/integrations/`, `lib/marketplace/`, `lib/music/providers/`, and `lib/events/providers/`
- **Evidence**: Audius, Ticketmaster, BandsInTown, Shopify, Printful, and social providers expose different configuration, error, and lifecycle patterns; there is no common initialization, health, retry, or circuit-breaker boundary.
- **Severity**: P2 — maintainability.

### G-007 — Provider health checks are not surfaced consistently (INCOMPLETE)

- **Location**: `lib/music/providers/audius/audius-health.ts`, `app/api/health/route.ts`, provider adapters under `lib/events/providers/` and `lib/marketplace/`
- **Evidence**: Audius has a provider-specific health helper and `/api/health` is an application health surface, but no cross-provider probes or readiness dashboard covers Stripe, Resend, Twilio, Upstash, Shopify, Printful, or event providers.
- **Severity**: P1 — launch operability.

### G-008 — No unified retry/backoff strategy (MISSING)

- **Location**: provider clients under `lib/music/providers/audius/`, `lib/events/providers/`, `lib/marketplace/`, and delivery services under `lib/services/`
- **Evidence**: Audius has local retry/timeout behavior, while other providers use route/service-local error handling; no shared exponential backoff, jitter, or circuit-breaker policy exists.
- **Severity**: P2 — resilience.

### C. Credential management

### G-009 — MFA verification codes remain process-local (INCOMPLETE)

- **Location**: `lib/services/mfa.service.ts`
- **Evidence**: `verificationCodes` is a `Map` cleaned by an interval, so codes disappear on deploy/restart and cannot be shared across instances. `docs/work-packets/INTG-003.md` records the missing authoritative `mfa_verification_codes` schema and server-only access boundary.
- **Severity**: P1 — authentication reliability and scale.

### G-010 — No credential rotation or expiry framework (MISSING)

- **Location**: `lib/integrations/token-vault.ts`, `lib/marketplace/integration-credentials.ts`, social and marketplace OAuth routes
- **Evidence**: The vault encrypts and reads/writes secrets, but no shared token expiry, refresh scheduling, rotation, or revocation workflow exists for social, Shopify, Printful, or other provider credentials.
- **Severity**: P2 — security hygiene.

### D. Workers and scheduled jobs

### G-012 — Music outbox workers have no monitoring or health checks (INCOMPLETE)

- **Location**: 21 `scripts/music-*-worker.ts` files; `vercel.json`
- **Evidence**: The worker scripts exist but are not represented in `vercel.json` schedules and have no shared health endpoint, structured execution telemetry, retry policy, or dead-letter path. This remains open in WS-1.5 of `docs/DEVELOPMENT_BACKLOG.md`.
- **Severity**: P1 — launch gate G5.

### G-013 — Event reminders cron is a stub and intentionally unscheduled (INCOMPLETE)

- **Location**: `app/api/cron/event-reminders/route.ts`, `scripts/ci/cron-route-inventory.json`
- **Evidence**: The route enumerates legacy and canonical events but contains no reminder delivery or replay protection. The inventory explicitly defers scheduling until that contract exists.
- **Severity**: P1 — feature completeness.

### E. Rate limiting

### G-015 — Rate-limiting coverage is partial (INCOMPLETE)

- **Location**: `lib/utils/rate-limit.ts`, route call sites, `scripts/ci/smoke-rate-limit.mjs`
- **Evidence**: Search, uploads, error reports, and ticket check-in have coverage; authentication built-ins, messaging fan-out, and other high-traffic surfaces do not have first-party coverage. The smoke path requires a real Upstash target and is not a default local proof.
- **Severity**: P1 — abuse resistance.

### G-016 — No rate-limit observability (MISSING)

- **Location**: `lib/utils/rate-limit.ts`
- **Evidence**: The limiter returns allow/deny decisions but no metrics, dashboard, or alert path records hits by route/provider.
- **Severity**: P2 — operability.

### F. Email, SMS, and push delivery

### G-017 — Two email service abstractions (IMPROVE)

- **Location**: `lib/services/email-delivery.service.ts`, `lib/services/notification-channels.ts`
- **Evidence**: Both target Resend but expose separate class/function patterns and are used by different callers.
- **Severity**: P2 — duplication and inconsistent failure semantics.

### G-018 — SMS delivery has no retry or queue (MISSING)

- **Location**: `lib/services/sms-delivery.service.ts`, `lib/services/notification-channels.ts`
- **Evidence**: Twilio sends are synchronous service calls without a durable retry queue or dead-letter state.
- **Severity**: P2 — delivery reliability.

### G-019 — Push delivery has no retry or token-failure handling (MISSING)

- **Location**: `lib/services/notification-channels.ts`
- **Evidence**: Expo push calls are made directly; there is no durable retry/failure queue or invalid-token cleanup contract.
- **Severity**: P2 — delivery reliability.

### G. Observability and operations

### G-020 — Integration-specific observability is incomplete (INCOMPLETE)

- **Location**: `lib/observability/sentry.shared.ts`, webhook routes, provider clients, worker scripts
- **Evidence**: Shared Sentry setup exists, but handlers and workers do not consistently emit provider latency, success/failure, retry, or correlation metrics. WS-1.4 remains open in `docs/DEVELOPMENT_BACKLOG.md`.
- **Severity**: P1 — launch gate G4.

### G-021 — No cross-provider integration audit dashboard (MISSING)

- **Location**: `integration_audit_log` in `docs/engineering/generated/database-objects.md`; no corresponding cross-provider UI route
- **Evidence**: The table records audit data, but no admin surface aggregates provider health, credential readiness, webhook processing, or worker state.
- **Severity**: P2 — operability.

### H. Testing

### G-022 — Webhook integration coverage is incomplete (INCOMPLETE)

- **Location**: `app/api/photos/purchase/webhook/__tests__/route.test.ts`, `app/api/webhooks/__tests__/webhook-secret-boundaries.test.ts`, `__tests__/integrations/security.test.ts`
- **Evidence**: Photo replay and endpoint-secret contracts exist, but there is no broad end-to-end matrix covering every provider webhook, persistence failure, retry, and alert path.
- **Severity**: P1 — correctness confidence.

### G-023 — Shopify/Printful full-flow tests are missing (MISSING)

- **Location**: `lib/marketplace/__tests__/`, `app/api/marketplace/integrations/shopify/webhook/route.ts`, `app/api/marketplace/integrations/printful/webhook/route.ts`
- **Evidence**: Unit tests cover signatures and normalization, but no test drives webhook → adapter → database state for either provider.
- **Severity**: P2 — integration confidence.

### G-024 — Rate-limit smoke evidence is environment-dependent (INCOMPLETE)

- **Location**: `scripts/ci/smoke-rate-limit.mjs`, `docs/work-packets/RELEASE-LOCAL-PARITY.md`
- **Evidence**: A smoke script exists, but it requires provisioned Upstash variables and a running app; the release packet records that this evidence is not yet available locally.
- **Severity**: P1 — verification.

### I. Architecture and configuration

### G-025 — Integration code is scattered across domains (IMPROVE)

- **Location**: `lib/integrations/`, `lib/marketplace/`, `lib/music/providers/`, `lib/events/providers/`, `lib/services/`, `lib/admin/content-hub/`
- **Evidence**: Provider ownership is discoverable only by domain-specific paths and maps; there is no single integration ownership index beyond this audit.
- **Severity**: P2 — discoverability.

### G-026 — No integration configuration registry (MISSING)

- **Location**: `lib/integrations/provider-catalog.ts`, `docs/engineering/generated/integrations.md`
- **Evidence**: The catalog is social-only and the generated map is env-name inventory, not an operational registry of enabled state, required credentials, health, owner, and rotation status.
- **Severity**: P2 — operational visibility.

## Current triage counts

| Triage | Count | IDs |
|---|---:|---|
| **MISSING** | 11 | G-003, G-004, G-006, G-008, G-010, G-016, G-018, G-019, G-021, G-023, G-026 |
| **INCOMPLETE** | 9 | G-005, G-007, G-009, G-012, G-013, G-015, G-020, G-022, G-024 |
| **IMPROVE** | 3 | G-002, G-017, G-025 |

The current audit has 23 open gaps. By severity: P1 — G-002, G-007, G-009, G-012, G-013, G-015, G-020, G-022, G-024; P2 — all remaining current gaps. No unresolved P0 gap remains in this snapshot.
