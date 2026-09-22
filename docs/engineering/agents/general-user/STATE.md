# General User state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-11 (USER-003 focused settings-router verification, 18:27 UTC)
- Active tasks: USER-003 (unified settings surface), USER-005 (account lifecycle
  launch readiness), and USER-006 (private-docs signed-upload disposition)
- Confidence: working — inventory verified against source reads; several canonical-surface
  decisions still require owner answers (see `QUESTIONS.md`).

## Durable facts

- Mission: Own authentication, onboarding, user profiles, settings, accounts, and the general
  dashboard. Default working set recorded in `WORKING_SET.json`.
- Identity is JWT-verified Supabase only: `auth.getUser()` everywhere; unsigned cookie JSON is
  never trusted (WS-0.1 committed code is clean — `lib/auth/server.ts`,
  `lib/auth/production-auth.ts`; `tourify-session-cookie.ts` is consumed only by
  `lib/auth/mobile-request-auth.ts`).
- Artist public handle contract: the canonical `artist_profiles.url_slug` is set at every
  create boundary via `generateUniqueSlug` from `@/lib/accounts/generate-unique-slug` —
  `lib/services/account-management.service.ts` (`createArtistAccount`),
  `app/api/artists/route.ts` (legacy POST), and now `app/api/onboarding/create-account/route.ts`
  (artist signup; migration `20260711013527_artist_profiles_url_slug.sql` is the DB source of
  truth — none of these overwrite `profiles.username`, which stays personal identity).
- Onboarding `create-account` artist branch is RLS-safe: the `artist_profiles` insert only runs
  when a signup session exists (auto-confirmed signups) after `setSession()`; with email
  confirmation enabled there is no session at signup, so creation is deferred (non-fatal
  warning) to the first authenticated request. Signup response behavior is unchanged and the
  existing jest mock (`{ auth: { signUp } }`) still passes because the branch is session-gated
  and guarded by try/catch.
- Onboarding submissions now use `app/api/onboarding/_lib/contract.ts` as the canonical boundary:
  `target.kind` is `invitation`, `candidate`, or `flow`, with `responses`, `completed`, optional
  `template_id`, and optional `documents`. Legacy `invitation_token`, `candidate_id`, `flow_id`,
  and token-route URL shapes normalize at the boundary for compatibility.
- `/api/onboarding/submit` is the single authenticated submission implementation. Token and flow
  POST handlers remain compatibility adapters and call the shared token/flow submit helpers;
  `/api/onboarding/unified` retains CRUD actions while its complete action uses the shared flow
  handler. No migration or non-onboarding surface was changed for USER-002.
- WS-0.1 regression tests (`__tests__/auth/no-unsigned-cookie-fallback.test.ts`) and
  `agent-service.test.ts` are UNTRACKED worktree files pending commit; the bearer path in
  `lib/auth/api-auth.ts` has no forged-cookie test.
- Account deletion exists at `app/api/account/delete/route.ts` (WS-2.4/AUDIT M18) with typed
  confirmation + audit row; erasure coverage for domain tables
  (`portfolio_items`, `experiences`, `certifications`, skills, layouts) is unverified and
  documented as non-FK tables not cascade-covered.
- Multiple live surfaces share this domain: onboarding (hire/[token], [token],
  enhanced-onboarding-flow, `app/onboarding/page.tsx` router), settings (EnhancedSettingsRouter
  - legacy + enhanced component families), profiles (three update endpoints), dashboard
    (`app/dashboard/page.tsx` vs `optimized-dashboard.tsx`). Canonical selection is open —
    QUESTIONS.md P1.
- Auth helpers are duplicated (`lib/auth/server.ts` legacy vs `lib/auth/api-auth.ts` canonical
  vs production-auth vs mobile bearer); consolidation decision pending (QUESTIONS.md Q6).
- `/api/auth/session` is a stub with stale Next.js 15 rationale; `/api/auth/signup` is a 410
  deprecation stub pointing to `/login?tab=signup` (intentional).
- Agent service principals (CP-002) exist: `lib/auth/agent-service.ts` + cred tables.
- Settings deep links for notifications and profile colors now normalize through
  `EnhancedSettingsRouter`; unsupported `tab` values fall back to `profile`, and the appearance
  color action remains on the unified `/settings` route. Legacy account-scoped settings families
  remain intentionally preserved pending the owner decision in `QUESTIONS.md` Q2.
- Generated maps are topology indexes, not behavioral proof; they were refreshed at reviewed SHA
  `7cf660ad8422dbd3adbdb77369d94638cdc2231b` during USER-003 verification.

## Current focus

- Execute USER-003: the bounded notifications/profile-colors unified surface and focused router
  coverage are implemented; focused tests, lint, map generation, and agent validation pass. The
  shared `verify:fast -- --changed` wrapper is blocked by missing unrelated
  `components/ui/use-mobile.tsx` paths, and full typecheck remains bounded/incomplete with no
  changed-settings diagnostics observed. Next work requires the Q2 canonical settings-family
  owner decision.

## Known risks

- Untracked tests (`no-unsigned-cookie-fallback`, `agent-service`) could be lost if the
  worktree is reset — commit them as part of a WS-0.1 follow-up.
- Multiple onboarding/settings/profile implementations mean any single-source-of-truth change
  must update all entry points or redirects first.
- GDPR erasure completeness is the top compliance risk in this domain.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- USER-005 is P0 and owns the complete account lifecycle, server-boundary persona/tenant denials, redirect/session safety, account deletion, and privacy-retention verification in isolated staging.
- USER-003 remains P2 and is not a launch blocker unless QA-003 demonstrates a direct dependency; persistent MFA storage is coordinated through INTG-003 and DB-008.

## USER-005 execution checkpoint — 2026-09-16

- Implemented same-site configured-origin redirect enforcement, verified `/api/auth/session`, server-side persona/membership checks for account switching, and authenticated account deletion cleanup with corrected erasure-map evidence.
- Focused auth/privacy verification passed across 17 files and 76 tests; isolated staging, cross-tenant deployed denial, and persistent MFA evidence remain open.

## USER-006 ownership boundary — 2026-09-18

- USER-006 now owns `app/api/upload/signed-url/route.ts` and its explicit
  adopt-versus-authorized-retire decision. Read-only research found zero
  product callers; that fact alone does not authorize deletion.
- The existing settings certification upload and account-deletion flows both
  depend on `private-docs` and must remain intact regardless of the generic
  route's disposition.
- Database must review the bucket/RLS boundary, and QA-003 must certify the
  selected upload path plus cross-user denial. USER-006 does not own storage
  migrations or hosted mutation.

## USER-006 retained signer hardening — 2026-09-18

- The refreshed app/components/hooks/lib scan still finds zero product callers
  for `/api/upload/signed-url`; the ownership generator is the sole tooling
  reference. With no adoption or retirement authority, the route is retained
  and decision-blocked rather than deleted or presented as canonical.
- Official Supabase documentation currently defines `createSignedUploadUrl`
  tokens as fixed at two hours and usable without further authentication. The
  route now reports a fixed 7,200-second expiry and rejects conflicting client
  expiry input instead of clamping a value the SDK cannot apply.
- Signing remains request-user scoped and pinned to `private-docs`. Paths must
  begin with the authenticated user's exact first segment and are rejected for
  raw or double-encoded traversal, encoded separators, backslashes, empty/dot
  segments, control characters, padding, or cross-user prefixes. Attacker input
  is never normalized into an accepted path.
- Distributed-limiter errors and production without configured distributed
  limiting return unavailable before signing. Storage signing errors return no
  token, successful responses are private/no-store, and the route contains no
  service-role client or credential.
- The active storage migration still authorizes authenticated INSERT by bucket
  only, not by user prefix. This means the application check is defense in depth
  but not hosted RLS proof; Database owns any policy change.
- The settings certification uploader writes
  `private-docs/staff-credentials/<user-id>/...`, which is intentionally outside
  this signer's `<user-id>/...` contract. USER-005 now covers that certification
  prefix independently during account deletion; it does not imply adoption of
  the generic signer.
- Focused local verification passes 23 tests plus lint, inherited-config scoped
  TypeScript, caller/diff/JSON checks, and agent validation. USER-006 remains
  active for explicit product disposition, database prefix-policy evidence,
  and QA-003 hosted cross-user certification.

## USER-005 private-docs deletion coverage — 2026-09-18

- Account deletion now explicitly discovers objects in both `<user-id>/` and
  `staff-credentials/<user-id>/` within `private-docs`; it also preserves the
  historical `profile-images/staff-credentials/<user-id>/` cleanup path for
  credentials uploaded before the private-bucket move.
- Elevated Storage deletion remains server-only and begins only after verified
  authentication, exact confirmation, and the existing PII scrub. Every prefix
  is constructed from a canonical authenticated UUID, and unexpected nested,
  traversal, control-character, or otherwise unsafe list results fail closed.
- Any Storage list, validation, or remove failure keeps the auth user active and
  records the failing bucket/prefix stage in server logs. Successful removals
  are naturally idempotent, so a later attempt can retry only remaining files.
- Storage deletion re-lists each exact prefix from offset zero in service-sized
  batches until it is empty, avoiding offset skips as earlier batches are
  removed. A repeated removed path or bounded batch ceiling fails closed, and
  any error after a successful batch withholds auth deletion for a safe retry.
- Focused local evidence passes 11 route tests plus lint and formatting for
  direct-user and certification discovery, more than 1,000 objects,
  later-batch failure/retry, no-progress protection, cross-user exclusion, and
  credential-free responses. Scoped TypeScript reaches a pre-existing
  `lib/auth/admin-context.ts` organization-identity mismatch. No hosted Storage
  access or mutation was performed; QA-003 still owns isolated-staging proof.

## USER-005 scoped typecheck unblocked — Wave 31 lane 3, 2026-09-21

- The last local USER-005 blocker is resolved. The scoped TypeScript failure
  was `TS2345` at `lib/auth/admin-context.ts:154`: the local
  `OrganizationProfileRow` interface declared `ops_org_id` optional, which is
  not assignable to the required `ops_org_id: string | null | undefined` of the
  canonical `OrganizerAccountIdentityRow`. The duplicate local interface was
  deleted and the cast now uses the canonical type imported from
  `@/lib/organizations/identity`; runtime behavior, error codes, and messages
  are unchanged.
- `lib/organizations/identity.ts` is organization-domain-owned (ORG-002 /
  CP-052). General-user code must consume it, never duplicate its row shapes:
  `lib/auth/acting-context.ts` calls `organizationIdentityFromOrganizerAccount(data)`
  directly (supabase client is untyped there), and `admin-context.ts` now
  asserts with the canonical `OrganizerAccountIdentityRow`.
- Scoped tsc (`/tmp/tsconfig.user005-storage.json`; admin-context,
  acting-context, organizations/identity and imports) passes with 0 diagnostics.
  Focused vitest: `__tests__/auth` 9 files / 43 tests, account-delete-route 11
  tests, org-identity-model 3 tests; eslint and `git diff --check` clean.
  USER-005 remaining blockers are hosted-only: isolated-staging lifecycle and
  cross-tenant negative authorization, two-prefix private-docs storage
  deletion certification, and persistent-MFA coordination with INTG-003/DB-008.
