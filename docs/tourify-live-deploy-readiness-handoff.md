# tourify.live Deploy Readiness Handoff

Status: blocked pending owner-approved production changes.

## Implemented on this branch

- Production debug, test, setup, and migration paths return 404 through middleware.
- Cron routes require `CRON_SECRET` or trusted Vercel cron auth; missing `CRON_SECRET` no longer permits execution.
- Marketplace migration/backfill APIs require the internal route guard in production.
- CI and local verification include `npm run typecheck`.
- `package.json` pins Node to `20.x` to match GitHub Actions.
- `deployment/production.env` is marked sample-only.
- A forward-only storage/security migration was added:
  - make `application-documents` private
  - remove public-read storage policy
  - add owner read policy for authenticated users
  - revoke anon/authenticated access from the two public forum materialized views

## Verified locally

- `npm run lint`
- `npm run typecheck`
- `npm test`
- targeted production-lockdown tests
- `npm run test:mobile-redirect`
- `npm run test:auth-redirects`
- `npm run test:venue-ops`
- `npm run build:vercel` with build-only Supabase env values

## Production blockers

1. Vercel production env is incomplete.
   - `NEXT_PUBLIC_SITE_URL` is currently `https://demo.tourify.live`; it must be `https://tourify.live`.
   - Missing required production values include `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `INTERNAL_API_SECRET`, `ENCRYPTION_KEY`, Sentry, and Upstash/KV values.
   - Several Supabase service-style variables were present in Vercel listing but pulled as empty and must be rechecked by the owner.

2. Supabase production still has exposed storage/materialized-view access.
   - `application-documents.public = true`.
   - `application_documents_public_read` grants public read on `storage.objects`.
   - `forum_threads_hot_mv` and `forum_threads_top_mv` grant access to `anon` and `authenticated`.

3. Migration history needs reconciliation before any migration push.
   - Hosted project `auqddrodjezjlypkzfpi` has 172 applied migrations.
   - This clean branch has 179 local migration files and no duplicate timestamps.
   - Hosted has July 2026 applied migrations that are missing locally.
   - Local has late-April, May, June, and the new July 13 migration that are not recorded as applied in hosted history.
   - `supabase migration list --linked` cannot run in the clean worktree until Supabase project link/auth is repaired.

4. Vercel project settings need owner verification.
   - Vercel project list reports `tourify-beta-k2` on Node `22.x`; this branch pins `20.x`, but the dashboard setting should be aligned.
   - Current production deployment is Ready and aliased to `tourify.live`, `www.tourify.live`, and `demo.tourify.live`, but it is an old deployment from June 10, 2026.

## Approval-gated production sequence

1. Update Vercel production env.
2. Link Supabase CLI to `auqddrodjezjlypkzfpi` and run `supabase migration list --linked`.
3. Build a full migration reconciliation manifest:
   - restore local file
   - repair as already applied
   - apply
   - defer/remove from deploy branch
4. Only after history is clean, apply `20260713134049_harden_application_documents_storage.sql`.
5. Re-run Supabase security checks.
6. Merge/deploy through the existing `Deploy Demo` path.
7. Smoke test:
   - `/healthz` and `/api/health` with GET
   - `www.tourify.live` redirect
   - debug/test/setup/migration paths return 404 or 401/403
   - cron endpoints reject missing/invalid secrets
   - representative public pages and metadata use `https://tourify.live`
