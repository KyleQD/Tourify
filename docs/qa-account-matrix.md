# QA matrix: account types, routes, and integrations

This document supports regression testing across account surfaces. Update the **Last verified** column when you run checks.

## Account types (canonical)

| Type | Source | Notes |
|------|--------|--------|
| `general` | Signup / default | Default profile `account_type`. |
| `artist` | Signup or `artist_profiles` | Artist dashboard requires artist row or `account_type === artist` (middleware). |
| `venue` | Signup or `venue_profiles` | Enforced in [`app/venue/layout.tsx`](../app/venue/layout.tsx). |
| `organization` | Signup (mapped from `industry`) | Aligns with DB `CHECK` on `profiles.account_type`. |
| Admin / organizer | `profiles` flags, `organizer_accounts`, settings | Shared helper [`lib/auth/admin-profile-gates.ts`](../lib/auth/admin-profile-gates.ts). |

Signup UI values `industry` and `tour_manager` are normalized client-side via [`lib/auth/normalize-account-type.ts`](../lib/auth/normalize-account-type.ts) before auth metadata is sent.

## Route × account (expected behavior)

| Route / area | general | artist | venue | admin / organizer |
|--------------|---------|--------|-------|-------------------|
| `/dashboard` | yes | yes | yes | yes |
| `/artist` (app shell) | redirect¹ | yes | redirect¹ | redirect¹ |
| `/artist/{handle}` (public) | yes² | yes² | yes² | yes² |
| `/venue/*` | redirect³ | redirect³ | yes | redirect³ |
| `/admin/*` | redirect⁴ | redirect⁴ | redirect⁴ | yes⁵ |
| `/settings` (integrations) | yes | yes | yes | yes |

¹ Middleware: [`pathnameRequiresArtistAccount`](../lib/artist/protected-routes.ts) — requires `artist_profiles` or `profiles.account_type === artist`; else `/dashboard?error=artist-account-required`.

² Public slug path: not in the protected segment set (e.g. not `dashboard`, `feed`, …).

³ Server layout: [`app/venue/layout.tsx`](../app/venue/layout.tsx) — venue profile or `account_type === venue`.

⁴ Middleware: [`profileIndicatesAdminAccess`](../lib/auth/admin-profile-gates.ts) — else `/dashboard`.

⁵ Includes `organizer_accounts` row or legacy `account_settings` organizer payloads.

## Integration smoke commands

Run from repo root with a populated `.env` (not placeholder demo keys) where noted.

Quick env checklist (non-fatal): `npm run check:integration-env` (loads `.env` then `.env.local` like Next.js)

| Command | Needs | Purpose |
|---------|--------|---------|
| `npm run lint` | — | ESLint |
| `npm test` | — | Jest unit/integration |
| `npx tsx scripts/test-auth-flows.ts` | Supabase URL + anon key | Auth API checks |
| `npx tsx scripts/test-auth-callback-redirects.ts` | site URL | Callback URLs |
| `npx tsx scripts/test-venue-routing.ts` | — | Venue route helpers |
| `npx tsx scripts/test-venue-ops.ts` | Supabase | Venue ops |
| `npx tsx scripts/marketplace-smoke-test.ts` | Supabase + optional Stripe | Marketplace |
| `npx tsx scripts/music-commerce-smoke-test.ts` | Supabase | Music commerce |
| `npx tsx scripts/e2e-social-harness.ts` | Social env | Social OAuth harness |

**Stripe / Printful / webhooks:** exercise via Jest (`lib/marketplace/__tests__/`, subscription routes) and manual checkout in a Stripe test mode project when keys are configured.

## CI note

`npm run verify:ci` runs `lint`, `npm test`, and `next build`. Networked smoke scripts are **not** included by default so CI stays deterministic without secrets.

## `/create` (Creator Studio) and session init

- Initial UI is gated on [`contexts/auth-context.tsx`](../contexts/auth-context.tsx): `getSession` is bounded by [`AUTH_SESSION_INIT_TIMEOUT_MS`](../lib/auth/session-init.ts) (10s). On timeout, `authError` is set and [`app/create/page.tsx`](../app/create/page.tsx) shows **Try again** / **Reload** / **Go to login** instead of hanging forever.
- Slow loads: after 8s while `loading`, the create page shows a **Still connecting…** hint.

### Demo / Vercel (operational)

- In the Vercel project for **demo.tourify.live**, confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match the same Supabase project (no placeholders). Run `npm run check:integration-env` locally with the same values loaded in `.env`.
- In the browser Network tab on `/create`, confirm requests to your Supabase host complete (no stuck `auth/v1` calls).

### Supabase DB checklist for account creation (operational)

- **Auth trigger:** `on_auth_user_created` on `auth.users` runs `handle_new_user` so each user gets a `profiles` row (see [`supabase/migrations/20260412120000_signup_trigger_account_type.sql`](../supabase/migrations/20260412120000_signup_trigger_account_type.sql)).
- **RLS:** `artist_profiles` / `venue_profiles` allow authenticated users to insert their own row (`auth.uid() = user_id`) — baseline in [`supabase/migrations/20240415000000_create_profiles.sql`](../supabase/migrations/20240415000000_create_profiles.sql). Reconcile if later migrations changed policies.
- **Organizer:** `POST /api/accounts` with action `create_organizer` — verify route and service role / RLS on `organizer_accounts` in the deployed project.

### Manual smoke: `/create`

1. Sign in, open `/create`, confirm the creator options render (not infinite loading).
2. Create artist / venue / organizer test rows; confirm inserts in Table Editor and no `42501` in the console.

## Last automation run

Local agent run (repo state at implementation):

- `npm run lint`: **pass**
- `npm test`: **pass** (20 suites), including session-init helper tests.
- `npm run check:integration-env`: Stripe keys missing in dev env (expected unless configured).

## Last verified (platform audit)

**2026-07-18** — Full hybrid platform audit (static + persona agents + anonymous live crawl).

| Check | Result |
|-------|--------|
| Inventory | 338 pages, 680 APIs → `docs/audits/page-inventory.json`, `api-inventory.json` |
| Nav dead links | 61 unique product dead hrefs; 31 live 404s → `docs/audits/nav-dead-links-product.json` |
| Missing client APIs | 7 confirmed 404 (search/unified, business/settings, staff-onboarding, demo-accounts, posts, validate-invitation) |
| Live crawl (`localhost:3000`) | 259 static pages: 35 ok, 217 auth_redirect, 7 redirect, **0 server errors** |
| Demo probe | `/`, `/login`, `/faq`, `/discover`, `/search` 200; `/licensing` `/institutional` `/cooperative` **404** (deploy lag vs local) |
| Report | [`docs/audits/PLATFORM_AUDIT_REPORT.md`](audits/PLATFORM_AUDIT_REPORT.md) · canvas `platform-audit-report.canvas.tsx` |

## Authenticated multi-persona QA (2026-07-18)

Env vars (also in `.env.example`):

```bash
QA_USER_A_EMAIL=qa-multi-a@tourify.test
QA_USER_A_PASSWORD=QaAuditPass123!
QA_USER_B_EMAIL=qa-multi-b@tourify.test
QA_USER_B_PASSWORD=QaAuditPass123!
QA_BASE_URL=http://localhost:3000
```

Commands:

| Command | Purpose |
|---------|---------|
| `npm run qa:seed` | Create/adopt multi-persona QA A/B → `docs/audits/qa-accounts.json` |
| `npm run qa:seed:flow` | Seed 7-account West Coast tour cast → `docs/audits/qa-flow-accounts.json` |
| `npm run qa:seed:flow:scenario` | Bootstrap tour + 3 jobs + hire tokens → `docs/audits/qa-flow-scenario.json` |
| `npm run qa:flow:clickthrough` | Playwright click-through for the West Coast flow cast |
| `npm run qa:audit:interactions` | API: switch, artist/band posts, booking, messages |
| `npm run qa:audit:clickthrough` | Playwright cookie-session click-through |

| Check | Result |
|-------|--------|
| Seed | Adopted existing multi-persona users (create-path blocked by `artist_profiles` trigger `owner_user_id`) |
| API interactions | 17 pass / 1 fail (DM conversation bootstrap) |
| Playwright | **7/7** (dashboard, switcher, artist, bookings, venue, messages, admin) |
| Report | [`docs/audits/AUTHENTICATED_INTERACTION_AUDIT.md`](audits/AUTHENTICATED_INTERACTION_AUDIT.md) |

**Caution:** Seed adopt mode may remap real Demo-project user emails to the QA addresses; previous emails are in `user_metadata.qa_previous_email`.
