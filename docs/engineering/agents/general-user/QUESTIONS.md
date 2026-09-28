# General User — questions for the owner

Prioritized (P1 first). Each question states the **build / fix / drop** decision and proposed
sequencing. The questions are also surfaced in the final USER-001 checkpoint summary.

## P1 — canonical surfaces (answer these first; they gate cleanup)

1. **Which onboarding surface is canonical?**
   Candidates: `app/onboarding/hire/[token]/page.tsx` → `TokenOnboardingFlow`
   (`components/hiring/onboarding-module/token-onboarding-flow`), `app/onboarding/[token]`,
   `app/onboarding/enhanced-onboarding-flow/page.tsx` (query-param keyed
   `?token&position&department&venue`), and the `app/onboarding/page.tsx` router entry
   (`?type=artist|venue|staff`, social → social-account-setup). **Fix** — declare one
   canonical hire flow, one self-service flow, then delete or redirect the others; verify no
   inbound links to the deprecated ones ship emails/QR tokens (they do — see Q1 in
   `.agents/flows/west-coast-tour/03-org-jobs-hire.md` context and `TA-PH0.md`). Sequence first.
   **Blocks the organization, artist, and venue agents** (their onboarding surfaces land here).

2. **Which settings component family is live?**
   `EnhancedSettingsRouter` (+ `account-management-settings`, `enhanced-general/artist/venue`
   settings) vs legacy `general/artist/admin-account-settings`. **Fix** — keep the router +
   one implementation per section; **drop** the rest; wire the two standalone pages
   (`/settings/notifications`, `/settings/profile-colors`) into the router or explicitly out of
   scope. Confirm by reading which page components import which files (current evidence is
   filesystem-only — `app/settings/page.tsx` uses `EnhancedSettingsRouter`).
   **Blocks the artist and venue agents** (they share these settings sections).

3. **What is the canonical profile update/fetch contract?**
   Candidates: `app/api/profile/route.ts` (zod PATCH via `authenticateApiRequest`),
   `app/api/profile/update`, `update-optimized`, `update-appearance`, `create`, and
   `app/api/settings/profile` + `profile/full`. **Fix** — one typed PATCH + one GET used by the
   settings editor and the public `/profile/[username]` page; **drop** `update-optimized` and
   `update-appearance` unless they prove distinct use cases (they appear to be duplicates).

## P2 — compliance & auth correctness

4. **Confirmed GDPR erasure scope?** `app/api/account/delete/route.ts` scrubs
   `job_applications`, storage objects, audit row, auth user. Which of `portfolio_items`,
   `experiences`, `certifications`, `skills`, custom profile layouts, messages/notifications,
   `user_active_profiles`, `agent_credentials.auth_user_id` are removed on deletion?
   **Fix** — add explicit deletes or document FK cascades per table; add a deletion test.
   **Blocks the artist agent** (portfolio/experience content) and any GDPR/legal reviewer.

5. **Username/URL uniqueness domain?** Should `profiles.username`, `profiles.custom_url`,
   `organizer_accounts.url_slug`, `organizations.slug` be one shared availability check
   (cross-namespace uniqueness) or intentionally separate namespaces? **Fix** — pick one;
   either unify `app/api/auth/check-username` + `app/api/accounts/check-slug` behind one
   service, or document the namespace split and why collisions are acceptable.

6. **Auth helper consolidation?** Keep `lib/auth/server.ts` (legacy, 401-returning) alongside
   `lib/auth/api-auth.ts` (null-returning, bearer), `production-auth.ts`, and
   `mobile-request-auth.ts`? **Fix** — one canonical `authenticateApiRequest`;
   **drop** `server.ts` after migrating its consumers; keep bearer only for mobile
   (`mobile-request-auth.ts`) with a dedicated forged-cookie test. The untracked
   `no-unsigned-cookie-fallback.test.ts` should be committed and extended to the bearer path.

7. **`/api/auth/session` — implement or remove?** The stub's Next.js 15 rationale is stale
   (server-side `getUser()` works throughout the codebase). **Fix** — return the verified user
   or **drop** the route; find and update consumers first (grep for `/api/auth/session`).

8. **Dashboard canonical implementation?** `app/dashboard/page.tsx`
   (`loadUserAccountsForSession`/`DashboardPageClient`) vs
   `app/dashboard/optimized-dashboard.tsx`. **Fix** — keep one, **drop** the other;
   also decide whether `bookings`/`staff-ops`/`store` sub-surfaces belong to this domain or to
   the venue/artist agents (handoff boundary question).

## P3 — quality & parity

9. **Mobile signup parity?** `apps/mobile/app/(auth)/signup.tsx` submits email+password only;
   web portal adds username + account type + resend-confirmation. **Build** — same metadata
   normalization on mobile or route mobile signup through the same service; align
   `apps/mobile/lib/auth/auth-provider` with `contexts/auth-context.tsx` behavior.

10. **Portfolio privacy default?** `app/api/settings/portfolio/route.ts` hardcodes
    `is_public: true`. **Fix** — invert to private-by-default with explicit publish, or confirm
    the product intent is public-by-default and just add zod validation + ownership checks.

11. **Test runner unification?** vitest (`__tests__/`) vs jest (in-route `__tests__`).
    **Fix** — one harness; move `app/api/onboarding/create-account/__tests__/route.test.ts`,
    then add committed tests for `/api/accounts`, `/api/account/delete`, `/api/profile/*`,
    `/api/settings/*` per the verification tiers in `docs/DEVELOPMENT_WORKFLOW.md`.

12. **Legacy client fallback?** `lib/supabase/client.ts` retains an implicit-flow retry for
    non-DOM clients. **Drop** after confirming web is chunked-cookie SSR and mobile is PKCE.

13. **Monolith pages budget?** login (30KB), auth portal (918 lines), enhanced-onboarding-flow
    (859 lines), profile page (325 lines). **Improve** — split after canonicalization so work
    is not duplicated across the two onboarding pages.

## Suggested sequencing

1. Q1 → Q2 → Q3 (canonical surfaces) — enables deletions and de-risks Q9–Q13.
2. Q4 → Q5 → Q6 → Q7 → Q8 (compliance + auth cleanup).
3. Q9 → Q13 → Q10 → Q11 → Q12 (parity, privacy, tooling).

Owner answers become follow-up task records owned by the general-user agent; no answer here is
required to close USER-001.