# Integrations baseline

_Generated: 2026-09-10 · Reconciled against source SHA: 7cf660ad and generated maps refreshed 2026-09-10._

## Summary

The integrations area owns external provider connectivity, webhook processing, credential boundaries, worker scripts, rate limiting, email/SMS/push delivery, and integration resilience. The refreshed map detects 9 env-backed provider categories in `docs/engineering/generated/integrations.md`; source adapters also cover social publishing, BandsInTown, Ticketmaster, Audius, Shopify, and Printful. The area has a partially-built provider catalog and token vault but lacks a unified integration framework.

### Reconciliation since the first audit snapshot

Three follow-up tasks closed findings from the 2026-09-09 snapshot: `INTG-002` added photo webhook claim-before-process idempotency and replay tests; `INTG-004` applied the shared fail-closed `CRON_SECRET` guard to all eight cron routes; and `INTG-005` removed generic Stripe webhook-secret fallback in favor of endpoint-specific secrets. `INTG-003` also completed bcrypt backup-code hashing, while its durable verification-code store remains open. Evidence: `docs/engineering/tasks/completed/INTG-002.json`, `INTG-004.json`, `INTG-005.json`, and `docs/work-packets/INTG-003.md`.

---

## 1. External providers (env-var inventory)

From `docs/engineering/generated/integrations.md`:

| Provider | Package | Env vars | Notes |
|---|---|---|---|
| **Supabase** | `@supabase/ssr@^0.6.1`, `@supabase/supabase-js@^2.39.3` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc. | Core data/identity layer; not an "integration" in the external-provider sense |
| **Stripe** | `stripe@^22.0.1` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`, `STRIPE_WEBHOOK_SECRET_PHOTOS`, `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS`, `STRIPE_WEBHOOK_SECRET_TICKETING` | Payments/subscriptions; endpoint-specific webhook secrets are required |
| **Resend** | `resend@^4.5.1` | `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_FROM_EMAIL`, `RESEND_DELAY_MS` | Email delivery |
| **Twilio** | (platform HTTP) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS delivery + MFA |
| **Upstash** | `@upstash/ratelimit@^2.0.6`, `@upstash/redis@^1.35.3` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| **Sentry** | `@sentry/nextjs@^9.47.1` | `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | Observability |
| **OpenAI** | `@ai-sdk/openai@^3.0.70`, `ai@^6.0.202` | `OPENAI_API_KEY` | AI features |
| **AWS S3** | `@aws-sdk/client-s3@^3.840.0` | (none in env — likely via Supabase Storage) | Storage |
| **Vercel** | (platform HTTP) | `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_REGION` | Deployment/cron |
| **Expo** | (platform HTTP) | Push tokens via `https://exp.host` | Push notifications |
| **Audius** | (direct HTTP) | Discovery provider config in `lib/music/providers/audius/` | Music streaming |
| **BandsInTown** | (direct HTTP) | Feature flag `BANDSINTOWN_MODE` | Event sync |
| **Shopify** | (direct HTTP) | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | Marketplace catalog |
| **Printful** | (direct HTTP) | `PRINTFUL_API_TOKEN` | Marketplace fulfillment |
| **Facebook/Instagram** | (direct HTTP via Graph API) | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Social publishing |
| **YouTube** | (direct HTTP) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Content publishing |
| **TikTok** | (direct HTTP) | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Content publishing |
| **X/Twitter** | (direct HTTP) | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Content publishing |

---

## 2. Webhook endpoints

### Stripe webhooks (4 routes)

| Route | Secret env | Idempotency | Source |
|---|---|---|---|
| `POST /api/subscriptions/webhook` | `STRIPE_WEBHOOK_SECRET` | `platform_webhook_events` ledger (insert-before-process) | `app/api/subscriptions/webhook/route.ts` |
| `POST /api/marketplace/webhook` | `STRIPE_WEBHOOK_SECRET_MARKETPLACE` | `handleMarketplaceStripeEventIdempotent` | `app/api/marketplace/webhook/route.ts` |
| `POST /api/ticketing/webhook` | `STRIPE_WEBHOOK_SECRET` | `claimWebhookEvent` (v2 gated) | `app/api/ticketing/webhook/route.ts` |
| `POST /api/photos/purchase/webhook` | `STRIPE_WEBHOOK_SECRET_PHOTOS` | `platform_webhook_events` claim-before-process plus guarded purchase transitions | `app/api/photos/purchase/webhook/route.ts`, `app/api/photos/purchase/webhook/__tests__/route.test.ts` |

### Music royalty webhook (1 route)

| Route | Verification | Source |
|---|---|---|
| `POST /api/webhooks/music-royalty-payouts` | Local HMAC-SHA256 (no Stripe client needed) | `app/api/webhooks/music-royalty-payouts/route.ts` |

### Music marketplace partner webhooks (1 route)

| Route | Verification | Source |
|---|---|---|
| `POST /api/webhooks/music-marketplace/[partner]` | `verifyPartnerWebhookSignature` + idempotent receipt store | `app/api/webhooks/music-marketplace/[partner]/route.ts` |

### Supabase webhook (1 route)

| Route | Verification | Source |
|---|---|---|
| `POST /api/webhooks/supabase/notifications` | Bearer token from `NOTIFICATION_INSERT_WEBHOOK_SECRET` | `app/api/webhooks/supabase/notifications/route.ts` |

---

## 3. Integration library code

### Core integration services (`lib/integrations/`)

| File | Purpose |
|---|---|
| `lib/integrations/provider-catalog.ts` | Provider capability catalog (5 social providers: Instagram, Facebook, YouTube, TikTok, Twitter). Reports env-readiness without leaking secrets. Stripe deliberately excluded (VEN-273). |
| `lib/integrations/token-vault.ts` | Dual-read/write encrypted token vault for venue social integrations (`venue_social_integration_secrets` table). Legacy plaintext migration window (VEN-266). |

### Marketplace provider adapters (`lib/marketplace/`)

| File | Purpose |
|---|---|
| `lib/marketplace/shopify-adapter.ts` | Shopify OAuth, catalog sync, HMAC verification, webhook signature verification |
| `lib/marketplace/printful-adapter.ts` | Printful catalog sync, fulfillment order submission |
| `lib/marketplace/printful-webhook.ts` | Printful webhook signature verification and payload parsing |
| `lib/marketplace/provider-normalizers.ts` | Normalizes Shopify and Printful product payloads to `ExternalStoreProduct[]` |
| `lib/marketplace/integration-credentials.ts` | Encrypt/decrypt integration secrets (used by token vault) |
| `lib/marketplace/integration-sync.ts` | Integration sync orchestration |
| `lib/marketplace/webhook-processor.ts` | Marketplace Stripe event processing (idempotent) |
| `lib/marketplace/webhook-handler.ts` | Legacy webhook handler (calls Printful fulfillment) |
| `lib/marketplace/external-import.ts` | External URL import with provider guessing (Shopify, Etsy, Printful) |

### Music providers (`lib/music/providers/`)

| File | Purpose |
|---|---|
| `lib/music/providers/contracts.ts` | Provider interface (`MusicProviderId = "tourify" \| "audius"`) |
| `lib/music/providers/registry.ts` | Provider registry pattern |
| `lib/music/providers/native-adapter.ts` | Tourify-native music adapter |
| `lib/music/providers/audius/audius-adapter.ts` | Audius provider adapter (trending, search, track resolution, playback) |
| `lib/music/providers/audius/audius-client.ts` | Audius HTTP client with retry, timeout, error normalization |
| `lib/music/providers/audius/audius-config.ts` | Audius configuration and feature flag |
| `lib/music/providers/audius/audius-errors.ts` | Audius error types (HTTP, network, schema, playback) |
| `lib/music/providers/audius/audius-health.ts` | Audius health check |
| `lib/music/providers/audius/audius-mappers.ts` | Audius track → normalized track mapping |
| `lib/music/providers/audius/audius-schemas.ts` | Audius response Zod schemas |

### Content hub / social integrations (`lib/admin/content-hub/`)

| File | Purpose |
|---|---|
| `lib/admin/content-hub/oauth-state.ts` | Signed OAuth state (HMAC, 10-min TTL, actor-binding) |
| `lib/admin/content-hub/provider-config.ts` | Content hub provider configuration |
| `lib/admin/content-hub/sanitize-integration.ts` | Integration data sanitization |
| `lib/admin/content-hub/build-platform-analytics.ts` | Platform analytics builder |

### BandsInTown integration (`app/api/integrations/bandsintown/`)

| Route | Purpose |
|---|---|
| `POST /api/integrations/bandsintown/connect` | Create pending connection, enqueue verification job |
| `DELETE /api/integrations/bandsintown/disconnect` | Disconnect BandsInTown |
| `GET /api/integrations/bandsintown/status` | Connection status |

---

## 4. Delivery services

### Email

| File | Provider | Notes |
|---|---|---|
| `lib/services/email-delivery.service.ts` | Resend | `EmailDeliveryService` class: `sendNotificationEmail`, `sendBatchEmails`. Graceful no-op when `RESEND_API_KEY` unset. |
| `lib/services/notification-channels.ts` | Resend (email), Twilio (SMS), Expo (push) | Unified channel abstraction for notification delivery. |
| `lib/services/notification-delivery.ts` | (orchestrator) | Reads user preferences, routes to email/push/SMS channels, logs to `notification_delivery_log`. |
| `lib/services/contract-email.service.ts` | Resend | Contract-specific email templates |
| `lib/services/candidate-invite-email.service.ts` | Resend | Candidate invitation emails |

### SMS

| File | Provider | Notes |
|---|---|---|
| `lib/services/sms-delivery.service.ts` | Twilio (HTTP) | `SMSDeliveryService`: sendSMS, sendVerificationCode, sendNotification. Lazy client init, graceful no-op. |

### MFA

| File | Provider | Notes |
|---|---|---|
| `lib/services/mfa.service.ts` | Twilio (SMS), otplib (TOTP), in-memory (codes) | `MFAService` singleton: TOTP setup/verify, SMS verify, backup codes. Backup codes use bcrypt cost 12; SMS verification codes remain in an in-memory `Map` and are lost on restart. |

### Push notifications

| File | Provider | Notes |
|---|---|---|
| `lib/services/notification-channels.ts` | Expo Push API | `sendPushNotification` via `https://exp.host/--/api/v2/push/send` |

---

## 5. Rate limiting

| File | Provider | Notes |
|---|---|---|
| `lib/utils/rate-limit.ts` | Upstash Redis | `createRateLimiter` factory. Sliding window. Explicit degradation when Redis absent. `RATE_LIMIT_ENFORCE=true` flips to deny-all. Covered routes: search (×3), upload signing, avatar upload, error-report POST, ticket check-in. |

---

## 6. Cron / Workers

### Scheduled and deferred crons (8 routes)

| Route | Schedule | Source |
|---|---|---|
| `/api/cron/admin-publication-outbox` | `*/5` | `app/api/cron/admin-publication-outbox/route.ts` |
| `/api/cron/staffing-overview-refresh` | `*/5` | `app/api/cron/staffing-overview-refresh/route.ts` |
| `/api/cron/workflow-automations` | `*/10` | `app/api/cron/workflow-automations/route.ts` |
| `/api/cron/events/sync` | POST | `app/api/cron/events/sync/route.ts` |
| `/api/cron/contract-sign-reminders` | POST | `app/api/cron/contract-sign-reminders/route.ts` |
| `/api/cron/ticket-invite-expiry` | POST | `app/api/cron/ticket-invite-expiry/route.ts` |
| `/api/cron/social-analytics` | POST | `app/api/cron/social-analytics/route.ts` |
| `/api/cron/event-reminders` | POST; explicitly deferred | `app/api/cron/event-reminders/route.ts`, `scripts/ci/cron-route-inventory.json` |

All eight cron route entrypoints reject unsigned requests through `isAuthorizedCronRequest`; seven are scheduled in `vercel.json` and `event-reminders` is explicitly deferred until durable delivery and replay protection exist. Evidence: `app/api/cron/__tests__/cron-auth.test.ts`, `app/api/cron/*/route.ts`, `vercel.json`, and `scripts/ci/check-cron-route-inventory.mjs`.

### Worker scripts (21 scripts in `scripts/`)

All are music-related outbox workers:
- `music-royalties-import-worker.ts`
- `music-preview-worker.ts`, `music-origin-worker.ts`
- 14 creator interoperability / treaty / federation / cooperative outbox workers
- `music-rights-admin-outbox-worker.ts`, `music-rights-anchor-worker.ts`, `music-rights-derivative-worker.ts`, `music-rights-intelligence-outbox-worker.ts`

---

## 7. Database objects used by integrations

| Table | Purpose | Used by |
|---|---|---|
| `platform_webhook_events` | Idempotency ledger for Stripe webhooks | `subscriptions/webhook`, `ticketing/webhook`, `photos/purchase/webhook` |
| `music_royalties_payout_provider_events` | Royalty payout event store | `webhooks/music-royalty-payouts` |
| `music_royalties_payout_instructions` | Payout instruction status | `webhooks/music-royalty-payouts` |
| `music_marketplace_partner_event_receipts` | Partner webhook idempotency | `webhooks/music-marketplace/[partner]` |
| `music_marketplace_subscriptions` | Marketplace subscription state | `webhooks/music-marketplace/[partner]` |
| `music_marketplace_partner_orders` | Marketplace order state | `webhooks/music-marketplace/[partner]` |
| `music_marketplace_outbox_events` | Settlement events | `webhooks/music-marketplace/[partner]` |
| `subscriptions` | User subscription state | `subscriptions/webhook` |
| `ticket_sales` | Ticket purchase state | `ticketing/webhook` |
| `ticket_types` | Ticket inventory | `ticketing/webhook` |
| `photo_purchases` | Photo purchase state | `photos/purchase/webhook` |
| `venue_social_integrations` | Venue social OAuth connections | `token-vault.ts`, `provider-catalog.ts` |
| `venue_social_integration_secrets` | Encrypted token vault | `token-vault.ts` |
| `integration_audit_log` | Integration event audit trail | `token-vault.ts` |
| `event_provider_connections` | External provider connections (BandsInTown) | `integrations/bandsintown/connect` |
| `event_sync_jobs` | Provider sync job queue | `integrations/bandsintown/connect` |
| `notification_preferences` | User notification channel preferences | `notification-delivery.ts` |
| `notification_delivery_log` | Delivery audit trail | `notification-delivery.ts` |
| `user_mfa_methods` | MFA method storage | `mfa.service.ts` |
| `user_mfa_setup_temp` | Temporary MFA setup state | `mfa.service.ts` |
| `user_mfa_backup_codes` | MFA backup codes | `mfa.service.ts` |
| `admin_publication_outbox` | Publication outbox queue | `cron/admin-publication-outbox` |

---

## 8. Tests

| File | Coverage |
|---|---|
| `__tests__/integrations/security.test.ts` | Signed OAuth state (tamper/expiry/actor-binding), provider catalog honesty, Stripe separation. |
| `__tests__/integrations/mfa.service.test.ts` | Bcrypt backup-code storage and one-time redemption. |
| `app/api/photos/purchase/webhook/__tests__/route.test.ts` | Photo webhook claim, duplicate replay, interrupted-claim resume, degraded ledger, and failure retry behavior. |
| `app/api/cron/__tests__/cron-auth.test.ts` | Unsigned-request rejection across all eight cron routes. |
| `app/api/webhooks/__tests__/webhook-secret-boundaries.test.ts` | Endpoint-specific Stripe secret boundaries across five webhook handlers. |
| `lib/marketplace/__tests__/shopify-adapter.test.ts` | Shopify HMAC verification, domain normalization |
| `lib/marketplace/__tests__/printful-webhook.test.ts` | Printful signature verification, payload parsing |
| `lib/marketplace/__tests__/provider-normalizers.test.ts` | Printful and Shopify product normalization |
| `lib/marketplace/__tests__/integration-credentials.test.ts` | Integration credential sanitization |
| `lib/music/providers/audius/__tests__/audius-mappers.test.ts` | Audius track mapping |
| `lib/music/providers/audius/__tests__/audius-errors.test.ts` | Audius error type construction |
| `app/api/cron/__tests__/workflow-automations.test.ts` | Workflow automation cron |

---

## 9. UI surfaces

| Route | Purpose |
|---|---|
| `/settings/integrations` | User-facing integration settings page |
| `/venue/dashboard/integrations` | Venue integration dashboard page |
| `/admin/dashboard/events/providers` | Admin event providers page |
| `/admin/dashboard/events/sync` | Admin event sync page |

---

## 10. Intended direction

From `docs/DEVELOPMENT_BACKLOG.md`:

- **WS-0.5** (P0): Marketplace checkout idempotency key adoption + parallel race tests — marketplace and photo webhook idempotency are covered; remaining checkout race evidence is pending.
- **WS-0.6** (P0): Production env split + PITR + royalty webhook HMAC — HMAC and endpoint-specific webhook boundaries are done; environment split/PITR remain pending.
- **WS-1.4** (P1): Sentry DSNs + uptime monitoring + alert routing — not started.
- **WS-1.5** (P1): Scheduled workers with monitoring — crons scheduled; workers not monitored.
- **WS-1.6** (P1): CI green — 27 vitest failures remain.
- **G5** (Launch gate): All crons/workers scheduled with monitoring.
- **G6** (Launch gate): Rate limiting active in prod.

The integrations-local sequencing is tracked in `docs/engineering/agents/integrations/BACKLOG.md`; the current environment, schema, and MFA durability dependencies are evidenced by `docs/work-packets/INTG-003.md` and `docs/work-packets/RELEASE-LOCAL-PARITY.md`.

---

## 11. Key characteristics

1. **No unified integration framework**: Each provider is wired ad-hoc. No shared retry, circuit-breaker, or health-check abstraction.
2. **Inconsistent webhook patterns**: Stripe routes now all have endpoint-specific secrets, but still use multiple idempotency mechanisms and no shared webhook middleware.
3. **Mixed credential management**: Token vault exists for venue social integrations; no equivalent lifecycle/rotation framework exists for other providers. MFA still uses an in-memory verification-code store.
4. **Worker scripts are unmonitored**: 21 music outbox workers with no health checks or observability.
5. **Provider catalog is social-only**: 5 social providers; does not cover Stripe, Resend, Twilio, Audius, Shopify, Printful, etc.
6. **Graceful degradation pattern**: Multiple services gracefully degrade when provider env is unset (Resend, Twilio, Upstash, Expo, BandsInTown) — but no unified pattern.
