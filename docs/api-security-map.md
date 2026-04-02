# API Security Map

This document maps the intended access model for API routes and defines guardrails for future routes.

## Access Classes

- `public`: no authentication required; only return public-safe data
- `auth`: authenticated user required; use `withAuth` and user-scoped Supabase client
- `admin`: organizer/admin role required; use `withAdminAuth`
- `internal`: disabled in production unless internal secret header is present
- `cron`: only scheduled jobs; require `isAuthorizedCronRequest`

## Required Guards

- **Public routes**
  - Never use service role keys
  - Use `@/lib/supabase/server` client and RLS-safe reads only
- **Auth routes**
  - Wrap with `withAuth`
  - Scope all writes/reads to `auth.user.id` or entity permissions
- **Admin routes**
  - Wrap with `withAdminAuth`
  - Apply explicit entity permission checks for resource-level actions
- **Internal/Test/Debug routes**
  - Use `isAuthorizedInternalRequest`
  - Keep under debug/test/migrations namespaces only
- **Cron routes**
  - Use `isAuthorizedCronRequest`
  - Avoid side effects without idempotency checks

## Current Route Groups

- `app/api/admin/**`: `admin` (now standardized with `withAdminAuth`)
- `app/api/debug/**`, `app/api/*debug*`, `app/api/*test*`: `internal`
- `app/api/migrations/**`: `internal`
- `app/api/setup-storage`: `internal`
- `app/api/cron/**`: `cron`
- `app/api/payment`: `auth` + booking ownership checks
- `app/api/search`: `public` (RLS-safe client only)
- `app/api/events/[id]/finances|tasks|incidents|vendors|staff|locations|participants|guestlist`: `auth` + explicit event permission checks
- `app/api/assets` and `app/api/agencies/*/[id]/*`: `auth` + explicit entity permission checks for reads and writes
- `app/api/agencies/staffing` and `app/api/agencies/performance`: `admin` (organization management surfaces)
- `app/api/booking-requests`: `auth` (scoped reads/updates, no service-role access)
- `app/api/upload-profile-image` and `app/api/portfolio/upload`: `auth` (uploads only, no runtime schema/bucket provisioning)
- `app/api/forums/**`: mixed `public` reads + `auth` writes with route params from context (no URL-splitting parsing)
- `app/api/tours/**` and `app/api/tours/planner`: `admin` guard via `withAdminAuth` + per-tour ownership checks where applicable

## Environment Variables

- `CRON_SECRET`: required for cron authorization (outside Vercel cron header path)
- `INTERNAL_API_SECRET`: required to access internal routes in production
- `SUPABASE_SERVICE_ROLE_KEY`: allowed only for explicit privileged workflows

## Implementation Rule of Thumb

Default to `withAuth` for new protected routes. Upgrade to `withAdminAuth` for any endpoint under `app/api/admin/**`. Use service-role clients only when an operation cannot be safely performed with RLS and only after a role/secret check has already passed.
