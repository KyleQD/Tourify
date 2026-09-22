# General User baseline

Review basis:

- Base SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (branch `codex/admin-master-remediation`)
- Reviewed: 2026-09-09 (task USER-001, read-only audit — no production code or migration changed)
- Working tree at review time: dirty (386 entries); generated maps under `docs/engineering/generated/` are stamped at SHA `a7193116c5a677b1c2939aa4a66e9415dac6eed1` and were also dirty (399). Treat the maps as topology indexes only; every claim below cites the real path read during this audit, and map-derived counts are marked.
- `npm run agents:validate` result recorded in the task record (USER-001).

Charter (from `CHARTER.md`): the general-user agent owns authentication, onboarding,
user profiles, settings, accounts, and the general dashboard. The default working set is
`docs/engineering/agents/general-user/WORKING_SET.json`.

## 1. What exists today — by surface

### 1.1 Authentication

- `middleware.ts` is the single edge gate: JWT-verified session via
  `lib/supabase/middleware.ts` (`updateSession` → `supabase.auth.getUser()` with an explicit
  comment that unsigned cookie JSON is never trusted). It enforces:
  `authRoutes` (`/login`, `/auth/signin`), a large `protectedRoutes` prefix list
  (`/dashboard`, `/onboarding`, `/profile`, `/settings`, ...), admin-surface access
  (`userHasAdminSurfaceAccess`), artist-surface gating
  (`pathnameRequiresArtistAccount` + `accountTypeMatchesSection`), legacy redirects
  (`/auth/signin`, `/auth/signup`, `/signup` → `/login`), root routing (authed → `/dashboard`,
  anonymous → landing), API CORS (`lib/api/cors`), and production-blocked paths
  (`lib/routing/production-blocked-routes`).
- Web sign-in surface: `app/login/page.tsx` (`TourifyAuthPortal`, ~918-line client component
  `components/auth/tourify-auth-portal.tsx`) with tabs signin/signup, social
  (google/apple/facebook), username generation + availability, password rules (≥6 chars in
  `lib/services/auth.service.ts`), email-confirmation resend with cooldown and a verify-email
  dialog. `app/signup/page.tsx` redirects to `/login?tab=signup`.
- Session state: `contexts/auth-context.tsx` (`useAuth`: signIn/signUp/resendSignupConfirmation/
  signInWithSocial/resetPassword/updateProfile). A second copy exists at
  `app/contexts/auth-context.tsx` — both present in the tree; only `@/contexts/auth-context`
  was confirmed imported (e.g. `app/profile/[username]/page.tsx`).
- Auth pages: `app/auth/{callback,confirm,mobile-callback,signout,verification}` + `layout.tsx`
  (email confirm, recovery, PKCE + legacy hash recovery handling in `app/reset-password/page.tsx`).
- API routes: `app/api/auth/{check-username,signup,session}`. `signup` is a 410 deprecation
  stub pointing to `/login?tab=signup` ("Legacy Prisma/bcrypt signup is removed"). `session`
  is a stub that returns "server-side session verification is disabled" (stale Next.js 15
  rationale — see GAPS.md). `check-username` is a public service-role lookup
  with in-process Map rate limiting (30 req/60 s) and a local `normalizeUsername`.
- Server-side auth helpers (multiple, overlapping — see GAPS.md):
  - `lib/auth/api-auth.ts` — canonical-ish: `authenticateApiRequest(request)` via
    `authenticateRequestWithBearerFallback` + `createServerClient` `getUser()`; `withAuth`,
    `withAdminAuth`, `withAdminCapability`, `withOrgCommand` (SEC-103 wrapper used by Admin APIs).
  - `lib/auth/server.ts` — legacy `authenticateApiRequest()` (no request arg) returning
    `AuthResult | NextResponse` (401/500), `withAuth`, `checkAuth`.
  - `lib/auth/production-auth.ts` — ProductionAuthService used by `/api/accounts/route.ts`.
  - `lib/auth/mobile-request-auth.ts` — bearer-token path
    (`authenticateRequestWithBearerFallback`, `authenticateRequestWithExplicitJwt`).
  - WS-0.1 (kill unsigned-cookie auth) outcome: cookie-JSON fallbacks removed from
    `lib/auth/server.ts` and `lib/auth/production-auth.ts`; `tourify-session-cookie.ts` is now
    consumed only by `mobile-request-auth.ts`. Regression tests exist as untracked worktree
    files (`__tests__/auth/no-unsigned-cookie-fallback.test.ts` — covers the legacy helper only).
- Supabase client: `lib/supabase/client.ts` (chunked SSR browser client with storageKey
  `sb-tourify-auth-token`; legacy non-DOM client falls back to `createLegacyPersistedClient`
  with implicit flow option), `lib/supabase/server.ts`, `lib/supabase/service-role*.ts`,
  `lib/supabase/auth-cookie-options.ts`, `lib/supabase/session-init.ts`,
  `lib/supabase/middleware.ts`, `lib/supabase/tourify-session-cookie.ts`,
  `lib/supabase/auth.ts`, `lib/supabase/optimized-client.ts`.
- Agent service principals (CP-002): `lib/auth/agent-service.ts` +
  `lib/auth/agent-service-core.ts` (`agent_credentials`, `agent_identities`,
  `agent_audit_events` tables); test `__tests__/auth/agent-service.test.ts` (untracked).
- Mobile auth (Expo): `apps/mobile/app/(auth)/{login,signup,forgot-password,reset-password,callback}.tsx`
  with its own `apps/mobile/lib/auth/auth-provider` + `apps/mobile/hooks/use-session`.
  Mobile signup submits only email+password (no username/account-type metadata) — see GAPS.md.
- Tests: `__tests__/auth/{admin-surface-access.test.ts (M), agent-service.test.ts (??),
  no-unsigned-cookie-fallback.test.ts (??), tourify-session-cookie.test.ts}` (vitest).

### 1.2 Onboarding

- Entry router `app/onboarding/page.tsx`: social identity → social-account-setup; invitation
  token → `/onboarding/hire/<token>`; `type=artist|venue|staff` → per-type flows.
- Hire/invitation flows (three surfaces): `app/onboarding/hire/[token]/page.tsx`
  (`TokenOnboardingFlow` from `components/hiring/onboarding-module/token-onboarding-flow`),
  `app/onboarding/[token]/route`-driven pages, and the 859-line client page
  `app/onboarding/enhanced-onboarding-flow/page.tsx` keyed on
  `?token&position&department&venue` query params.
- Component families: `components/onboarding/` — admin, artist, artist-venue, invitation,
  onboarding-wizard, profile, quick-signup, social-account-setup, staff, venue.
  Also `components/hiring/onboarding-module/` and `components/staff/` (worker onboarding).
- API routes: `app/api/onboarding/{unified,submit,create-account,validate-invitation,[token]}`
  with `create-account/__tests__/route.test.ts` (jest). `unified` uses `flow_type` enum
  artist/venue/staff/invitation via `UnifiedOnboardingService`; `[token]` uses
  `buildTokenOnboardingPayload` + `HiringOnboardingService` + attestation step groups from
  `lib/hiring/onboarding-step-groups`.
- Services: `lib/services/unified-onboarding.service.ts`, `token-onboarding-payload.service.ts`,
  `hiring-onboarding.service.ts`, `admin-onboarding*.service.ts`, plus
  `lib/services/auth.service.ts` (`AuthService.signUp/signIn`).
- Tests: `__tests__/onboarding/{persona-onboarding.test.ts, unified-onboarding-api.test.ts}`.
- Invited-worker onboarding DB row: `worker_onboarding_profiles`
  (`supabase/migrations/20260709210901_worker_onboarding_profiles.sql`, owner-only RLS).
- Related packet: `docs/work-packets/TA-PH0.md` (in_progress) targets `/api/accounts`, auth
  portal, and hire onboarding verification.

### 1.3 User profiles

- Public profile: `app/profile/[username]/page.tsx` (325-line client page) renders
  `EnhancedPublicProfileView` / `CustomPublicProfileView`, hydrates portfolio/experiences/
  certifications, listens for `profile-images-updated` window event. `app/profile/page.tsx`
  redirects to `/settings/profile` (or `/create?type=...`).
- Profile API routes (`app/api/profile/`): `route.ts` (PATCH with zod color-scheme schema via
  `authenticateApiRequest`), `update`, `update-optimized`, `update-appearance`, `current`,
  `avatar`, `colors`, `create`, `username-available`, `check-username`, `check-url`,
  `[username]`, `[username]/recognition`. Note the overlap: three update endpoints and three
  availability checkers (plus `app/api/auth/check-username` and `app/api/accounts/check-slug`).
- Settings-driven profile routes (`app/api/settings/`): `route.ts` (GET with account_type
  switch — artist_profiles / venue_profiles / profiles), `profile`, `profile/full`,
  `portfolio`, `experience`, `capabilities`, `certifications` (+ `/upload`),
  `skills/top`.
- Customization: `hooks/use-profile-colors.ts`, `components/profile/profile-color-customizer`,
  `lib/profile/custom-profile-layout`, `components/profile/custom-public-profile-view`,
  `components/profile/comprehensive-artist-profile` (artist surface).
- DB profile objects (map-derived from `docs/engineering/generated/database-objects.md`):
  `profiles` (RLS: insert own/update own/view all policies across many migrations, notably
  `20250211000000_production_schema_optimization.sql`, `20250816131000_profiles_trigger_policies.sql`),
  `artist_profiles`, `venue_profiles`, `organizer_accounts` (owner manage/public select/
  tour collaborator policies), `user_active_profiles` (own-row RLS), `portfolio_items`
  (owned by user, `is_public` default true — see GAPS.md), `cross_account_permissions`,
  `fix_missing_profiles` function in `20250101000000_fix_authentication_system.sql`,
  `guard_profile_privilege_columns` in `20260825122000_phase2_profiles_elevation_guard.sql`.

### 1.4 Settings

- Router: `app/settings/page.tsx` → `EnhancedSettingsRouter`
  (`components/settings/enhanced-settings-router.tsx`). Sub-pages `app/settings/`:
  `profile`, `security` (force-dynamic), `billing` (SettingsLayout + BillingSettings),
  `notifications` (NOT inside SettingsLayout — standalone container), `integrations`
  (SettingsLayout + IntegrationSettings), `profile-colors` (standalone client page that
  bypasses the router and reads `profiles` directly).
- Component families (`components/settings/`): `enhanced-settings-router`,
  `account-management-settings` (28KB), `enhanced-general-settings`, `enhanced-artist-settings`,
  `enhanced-venue-settings`, `general-account-settings`, `artist-account-settings`,
  `admin-account-settings`, `security-settings`, `notification-settings`, `billing-settings`,
  `integration-settings`, `settings-layout`, and ~25 more — legacy vs enhanced variants
  overlap (GAPS.md).
- Settings API routes: `app/api/settings/{route.ts,profile,profile/full,portfolio,experience,
  capabilities,certifications,certifications/upload,skills/top}`.

### 1.5 Accounts

- Domain service: `lib/services/account-management.service.ts` (~1196 lines,
  `AccountManagementService`): `getUserAccounts(userId)` (main `profiles` row + relationship
  detection), `getActiveSession`, organizer account creation, permissions, legacy
  `profile_id` slug preservation. Shared types in `lib/accounts/account-types.ts`
  (`ProfileType`, `normalizeAccountType`, `isOrganizationType`),
  `lib/accounts/generate-unique-slug.ts`, `lib/accounts/account-slug.ts`
  (`validateAccountSlug`).
- Server loader: `lib/accounts/server-load-accounts.ts`
  (`loadUserAccountsForSession` — React `cache()` memoized per request, used by
  `app/dashboard/page.tsx`).
- API routes: `app/api/accounts/route.ts` (dual auth: ProductionAuthService +
  `authenticateRequestWithExplicitJwt`, user-id mismatch check, `OrganizerAccountSchema`),
  `app/api/accounts/check-slug/route.ts` (authenticated; checks `organizer_accounts.url_slug`
  + `organizations.slug` for availability).
- GDPR/account deletion: `app/api/account/delete/route.ts` (AUDIT M18 / WS-2.4):
  verified session + typed confirmation `DELETE MY ACCOUNT`, scrubs `job_applications`
  contact PII, removes storage objects from `avatars`/`profile-images`/`private-docs`
  buckets, writes an audit row, deletes the auth user; documented limitation that
  non-FK tables are not cascade-covered (GAPS.md).
- Active-session table `user_active_profiles` and `cross_account_permissions` govern the
  account-switcher ("ActiveSession" model in `AccountManagementService`).
- `/api/accounts` relates to `organizer_accounts` (public personas migration
  `20260712005429_organization_public_personas.sql`) and `organizations` — shared with the
  organization agent; boundary noted in INTERFACES.md.

### 1.6 General dashboard

- `app/dashboard/page.tsx`: `loadUserAccountsForSession` → redirect `/login` when anonymous;
  `AccountsSeed` + `DashboardPageClient` render the account hub. Also
  `app/dashboard/optimized-dashboard.tsx` (alternative implementation — canonical status
  unclear, GAPS.md), plus `app/dashboard/{bookings,staff-ops,store,error,loading,layout}`.
- Components (`components/dashboard/`): `account-details-modal`, `cross-account-hub`,
  `enhanced-account-cards`, `enhanced-account-status-bar`, `dashboard-page-client`,
  `welcome-onboarding`, `quick-actions-card`, `quick-post-creator`, `metrics`,
  `general-action-center`, `artist-page-client`, `venue-*`, `unified-activity-feed`,
  `timeline`, `local-discovery`, `platform-features-hub`, `sortable-widget-section`,
  ~45 files.
- API routes: `app/api/dashboard/{metrics,action-center}`.
- Related: `app/contexts/events-context.tsx`, `components/dashboard/dashboard-theme-provider.tsx`.

### 1.7 Tests inventory (domain-adjacent)

- `__tests__/auth/`: admin-surface-access, agent-service (untracked),
  no-unsigned-cookie-fallback (untracked), tourify-session-cookie — vitest.
- `__tests__/onboarding/`: persona-onboarding, unified-onboarding-api.
- `app/api/onboarding/create-account/__tests__/route.test.ts` — jest (runner split, GAPS.md).
- No committed tests for `/api/accounts`, `/api/account/delete`, `/api/profile/*`,
  `/api/settings/*`, or the auth portal.

## 2. Intended direction

- `docs/DEVELOPMENT_BACKLOG.md`: WS-0.1 (kill unsigned-cookie auth — committed code clean;
  remaining: regression-test evidence committed, and the new `api-auth.ts` bearer path lacks a
  forged-cookie test); WS-2.4 (GDPR/account deletion — implemented at
  `app/api/account/delete/route.ts`, erasure coverage needs confirmation).
- `docs/engineering/DECISIONS.md` CP-001..CP-004: CP-002 mandates agent service principals
  (no shared human logins) — `lib/auth/agent-service.ts` + `agent_credentials`/
  `agent_identities`/`agent_audit_events` align; identity directory still pending.
- `docs/work-packets/TA-PH0.md` (in_progress): auth setup, `/api/accounts`, hire onboarding
  verification — the concrete near-term build packet for this domain.
- `docs/engineering/agents/general-user/ARCHITECTURE.md` and `INTERFACES.md` are bootstrap-level;
  `CHARTER.md` defines the mission; `VERIFICATION.md` records the runbook; `WORKING_SET.json`
  defines the default working set.
- `.agents/` legacy ledgers: mostly admin/venue-focused
  (admin-dashboard-builder, admin-feature-spec-builder, admin-ui-wiring,
  organization-ticketing, venue-pages-builder, plans/*.md); the only user-domain flow is
  `.agents/flows/west-coast-tour/` (artist band, org hiring, profile fill for 7 accounts)
  with `05-ux-notes.md` as a UX-notes template.

## 3. Dominant patterns & idioms

- JWT-only identity: `auth.getUser()` everywhere; unsigned cookie JSON never trusted
  (WS-0.1 goal; comments enforcing this in `middleware.ts`, `lib/auth/server.ts`,
  `lib/supabase/middleware.ts`).
- Dual/multiple auth helpers coexist (`lib/auth/server.ts` legacy vs `lib/auth/api-auth.ts`
  canonical vs production-auth vs mobile bearer) — routes import different ones.
- Component proliferation: `enhanced-*` variants next to base components across
  settings/onboarding/dashboard; public pages are large client components
  (login 30KB, auth portal 918 lines, enhanced-onboarding-flow 859 lines).
- RLS-backed owner checks at the data boundary with service-role clients on the server
  (e.g. `app/api/account/delete/route.ts`, `app/api/accounts/check-slug`).
- Test runner split: vitest for `__tests__/`, jest for in-route `__tests__` folders.