# Integrations map

<!-- generated: do not edit -->

- Source SHA: `b93967752b4262a2d7441755843eb886514fef26`
- Branch: `release/clean-snapshot`
- Working tree: dirty (31 entries)
- Generated at: 2026-09-21T22:12:46.202Z
- Generator: `control-plane.mjs generate`

Only environment-variable names are recorded. Secret values and local env files are never read.

| Provider | Installed packages | Environment names | Sample evidence |
| --- | --- | --- | --- |
| Supabase | `@supabase/ssr@^0.6.1`, `@supabase/supabase-js@^2.39.3` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_FETCH_TIMEOUT_MS`, `SUPABASE_JWT_SECRET`, `SUPABASE_PRODUCTION_PROJECT_ID`, `SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_REF`, `SUPABASE_REALTIME_CHANNEL_SECRET`, `SUPABASE_RLS_TEST_ANON_KEY`, `SUPABASE_RLS_TEST_SERVICE_ROLE_KEY`, `SUPABASE_RLS_TEST_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STAGING_PROJECT_ID`, `SUPABASE_TARGET_CONFIRMATION`, `SUPABASE_URL` | `app/admin/dashboard/components/lib/supabase.ts`<br>`app/admin/dashboard/components/supabase-debug.tsx`<br>`app/admin/dashboard/components/supabase-test.tsx` |
| Stripe | `stripe@^22.0.1` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`, `STRIPE_WEBHOOK_SECRET_PHOTOS`, `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS`, `STRIPE_WEBHOOK_SECRET_TICKETING` | `app/api/marketplace/webhook/route.ts`<br>`app/api/photos/purchase/webhook/__tests__/route.test.ts`<br>`app/api/photos/purchase/webhook/route.ts`<br>`app/api/subscriptions/webhook/route.ts`<br>`app/api/ticketing/webhook/route.ts`<br>`app/api/webhooks/music-royalty-payouts/__tests__/route.test.ts` |
| Resend | `resend@^4.5.1` | `EMAIL_FROM`, `RESEND_API_KEY`, `RESEND_DELAY_MS`, `RESEND_FROM_EMAIL` | `app/api/organization/tour-managers/route.ts`<br>`app/api/ticketing/delivery/route.ts`<br>`app/orgs/_actions/org-actions.ts`<br>`lib/services/candidate-invite-email.service.ts`<br>`lib/services/contract-email.service.ts`<br>`lib/services/email-delivery.service.ts` |
| Sentry | `@sentry/nextjs@^9.47.1` | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | `lib/observability/sentry.shared.ts`<br>`scripts/ci/validate-local-env.ts` |
| Upstash | `@upstash/ratelimit@^2.0.6`, `@upstash/redis@^1.35.3` | `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL` | `app/api/health/readyz/route.ts`<br>`lib/utils/rate-limit.ts` |
| AWS S3 | `@aws-sdk/client-s3@^3.840.0` | none detected |  |
| OpenAI / AI SDK | `@ai-sdk/openai@^3.0.70`, `ai@^6.0.202` | `OPENAI_API_KEY` | `lib/ai/openai.ts` |
| Vercel | platform or HTTP | `VERCEL_ENV`, `VERCEL_PRODUCTION_PROJECT_ID`, `VERCEL_PROJECT_ID`, `VERCEL_REGION`, `VERCEL_STAGING_PROJECT_ID`, `VERCEL_URL` | `app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts`<br>`app/api/admin/onboarding/invite-new-user/route.ts`<br>`app/api/cron/admin-publication-outbox/route.ts`<br>`app/api/cron/events/sync/route.ts`<br>`app/api/events/[id]/staff/invites/route.ts`<br>`app/api/tours/[id]/invites/route.ts` |
| Twilio | platform or HTTP | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `lib/services/mfa.service.ts`<br>`lib/services/notification-channels.ts`<br>`lib/services/sms-delivery.service.ts` |
