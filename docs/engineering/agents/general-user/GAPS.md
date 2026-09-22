# General User gaps

Triage legend:

- **Missing** — capability does not exist and nothing substitutes for it.
- **Incomplete** — exists but is partial, uncommitted, or has a known hole.
- **Improve** — exists and works, but costs drift, duplication, risk, or debt.

Evidence is a real path read during the USER-001 audit (SHA `7cf660ad8422dbd3adbdb77369d94638cdc2231b`).

## A. Authentication hardening

1. **Incomplete — forged-cookie regression tests are uncommitted and only cover the legacy helper.**
   `__tests__/auth/no-unsigned-cookie-fallback.test.ts` (AUDIT C1/WS-0.1) is an untracked
   worktree file, and it imports `@/lib/auth/server` only; the canonical
   `authenticateApiRequest(request)` in `lib/auth/api-auth.ts` — which additionally takes the
   bearer path through `lib/auth/mobile-request-auth.ts` — has no forged-cookie test.
   Same status for `__tests__/auth/agent-service.test.ts` next to `lib/auth/agent-service.ts`.
2. **Improve — parallel auth helpers with divergent contracts.**
   `lib/auth/server.ts` returns `AuthResult | NextResponse` and takes no request;
   `lib/auth/api-auth.ts` returns `{user,supabase} | null` and requires a request;
   `lib/auth/production-auth.ts` (ProductionAuthService) and `lib/auth/mobile-request-auth.ts`
   (bearer + explicit JWT) are used selectively (`app/api/accounts/route.ts`). Every route
   re-decides which helper to import; a single canonical contract plus deprecation of the
   others would remove the drift surface.
3. **Improve — `/api/auth/session` is a stub with stale rationale.**
   `app/api/auth/session/route.ts` returns "server-side session verification is disabled" citing
   Next.js 15, while server-side `supabase.auth.getUser()` demonstrably works in
   `middleware.ts`, `lib/accounts/server-load-accounts.ts`, and `app/api/accounts/route.ts`.
   Either implement it or remove it and delete consumers.
4. **Improve — `/api/auth/check-username` duplicates username logic and uses in-process rate limits.**
   `app/api/auth/check-username/route.ts` defines its own `normalizeUsername`, different from
   `lib/auth/tourify-auth-helpers.normalizeUsername` used by the auth portal; its rate-limit
   bucket is a module-level `Map` (resets on redeploy/instance, no cross-instance sharing).
5. **Improve — URL/username uniqueness is split across three checkers and three namespaces.**
   `app/api/auth/check-username` checks `profiles.username` only;
   `app/api/accounts/check-slug` checks `organizer_accounts.url_slug` + `organizations.slug`;
   `app/api/profile/{username-available,check-username,check-url}` exist yet `profiles.custom_url`
   (present in `MAIN_PROFILE_COLUMNS` in `lib/services/account-management.service.ts`) is not
   checked by any availability endpoint — collision risk across namespaces.
6. **Improve — legacy implicit-flow fallback retained in the client.**
   `lib/supabase/client.ts` `createLegacyPersistedClient()` retries `flowType: 'implicit'`
   when PKCE init fails (non-DOM clients); confirm this path is dead for web and mobile is
   PKCE-only, then remove the fallback.

## B. GDPR / account deletion coverage

7. **Incomplete — erasure coverage beyond `job_applications` is unverified.**
   `app/api/account/delete/route.ts` scrubs `job_applications` contact PII, removes storage
   objects (`avatars`, `profile-images`, `private-docs`), writes an audit row, and deletes the
   auth user; its own docs note non-FK tables are not cascade-covered. No evidence that
   `portfolio_items`, `experiences`, `certifications`, `skills`, custom profile layouts,
   messages/notifications, `user_active_profiles`, or `agent_credentials.auth_user_id`
   are removed or scrubbed on deletion. WS-2.4/GDPR completeness needs a definitive answer.

## C. Canonicalization / duplication

8. **Improve — multiple live onboarding entry points.**
   `app/onboarding/page.tsx` router, `app/onboarding/hire/[token]/page.tsx`
   (`TokenOnboardingFlow`), `app/onboarding/[token]`, and the 859-line
   `app/onboarding/enhanced-onboarding-flow/page.tsx` (query-param keyed) all handle
   hire/invitation onboarding; on the API side `unified`, `submit`, `create-account`,
   `[token]`, `validate-invitation` overlap (`app/api/onboarding/`). It is not documented which
   surface is canonical or which entry points still have inbound links.
9. **Improve — overlapping settings component families.**
   `components/settings/` holds both legacy (`general-account-settings`,
   `artist-account-settings`, `admin-account-settings`) and enhanced
   (`enhanced-settings-router`, `enhanced-general-settings`, `enhanced-artist-settings`,
   `enhanced-venue-settings`) implementations plus `account-management-settings` (28KB);
   `app/settings/page.tsx` renders `EnhancedSettingsRouter`, but the other families remain
   referenced or dead without a runtime map to prove it.
10. **Improve — overlapping profile write/fetch endpoints.**
    `app/api/profile/` has `route.ts` (zod PATCH), `update`, `update-optimized`,
    `update-appearance`, `create`, plus `app/api/settings/profile` and `profile/full` — three
    update contracts and two full-profile fetch paths, with different auth styles
    (`authenticateApiRequest` vs raw `createClient` in `app/api/settings/route.ts`).
11. **Improve — dashboard has two implementations.**
    `app/dashboard/page.tsx` (`loadUserAccountsForSession` + `DashboardPageClient`) coexists
    with `app/dashboard/optimized-dashboard.tsx`; canonical surface unproven.
12. **Improve — duplicate auth contexts.**
    `contexts/auth-context.tsx` and `app/contexts/auth-context.tsx` both exist; only
    `@/contexts/auth-context` was confirmed imported (`app/profile/[username]/page.tsx`),
    leaving drift risk for the other copy.

## D. Data-integrity / validation

13. **Improve — `/api/settings/portfolio` has no zod schema and a privacy-hostile default.**
    `app/api/settings/portfolio/route.ts` POST/PUT validate only `type`/`title` presence and
    hardcode `is_public: true` ("Ensure portfolio items are public by default") — user content
    publishes without consent and typeless writes reach the DB.
14. **Incomplete — mobile signup is identity-only.**
    `apps/mobile/app/(auth)/signup.tsx` calls `signUp(email, password)` with no username or
    account-type metadata, while the web portal (`components/auth/tourify-auth-portal.tsx`)
    normalizes username + account type; mobile/web auth state also live in separate providers
    (`apps/mobile/lib/auth/auth-provider` vs `contexts/auth-context.tsx`), so surface behavior
    can drift (e.g. resend-confirmation exists on web only).

## E. Verification / tooling

15. **Improve — test runner split (vitest vs jest).**
    `vitest.config.ts` runs `__tests__/` (auth/onboarding); `jest.config.cjs` runs
    `app/api/onboarding/create-account/__tests__/route.test.ts`. Duplicated environment mocks
    and two harnesses for one domain.
16. **Missing — no committed tests for account/profile/settings APIs.**
    No tests for `/api/accounts`, `/api/account/delete`, `/api/profile/*`, `/api/settings/*`,
    or the auth portal in the committed tree.

## F. UX / shell consistency

17. **Improve — settings shell is inconsistent.**
    `app/settings/notifications/page.tsx` renders outside `SettingsLayout` with its own
    container; `app/settings/profile-colors/page.tsx` is a standalone client page that bypasses
    `EnhancedSettingsRouter`, reads `profiles` via a raw client `supabase` call, and relies on a
    global `profile-images-updated` window event hand-rolled in
    `app/profile/[username]/page.tsx` for avatar/cover re-hydration.
18. **Improve — large monolith client pages.**
    `app/login/page.tsx` (~30KB), `components/auth/tourify-auth-portal.tsx` (918 lines),
    `app/onboarding/enhanced-onboarding-flow/page.tsx` (859 lines),
    `app/profile/[username]/page.tsx` (325 lines) — bundle and testability cost.

## G. Docs / contracts

19. **Improve — interface contracts are bootstrap-level.**
    `docs/engineering/agents/general-user/INTERFACES.md` does not yet document the auth API
    surface (which helper each route uses, bearer vs cookie, canonical onboarding entry point),
    which is why the duplications above accrued.
20. **Incomplete — `.agents/` UX lead for this domain.**
    `.agents/flows/west-coast-tour/05-ux-notes.md` is a template; no committed UX notes from
    the last audits exist for the user surface (unlike admin/venue ledgers).