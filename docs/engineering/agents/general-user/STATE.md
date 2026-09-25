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

## Wave 35 — `profiles.custom_url`, `calculate_venue_profile_completion`, the phone gate, and MFA — 2026-09-26

Last reviewed SHA: `ca3bb0b08870b87ce5f6e4ac69c65ddf31942c96`

### Durable facts

- `profiles.custom_url` does not exist in the active chain or in `lib/database.types.ts`. The
  canonical, chain-populated public handle on `profiles` is `username`
  (`public.generate_unique_username`, `public.lookup_profile_id_by_username`). `profiles.url_slug`
  appears in the generated contract but has **no active migration and no reader**, so it is not a
  usable destination. `custom_url` survives only as a documented request/response alias on
  `/api/profile/update`, `/api/profile/update-optimized` and `/api/profile/current`.
- **A phantom column fails the whole PostgREST statement, not one field.** A column missing from the
  target relation returns an error and a null `data`, so one stale identifier inside a shared select
  string, an `.eq()` filter, or a spread-into-payload write silently disables the entire route. This
  is how the drift presented: `profiles.custom_url` was inside the select of `/api/profile/current`
  (9 entry-reachable callers), inside both selects of `/api/profile/[username]`, and inside the
  update payload of `/api/profile/update` (a form that always submits the field);
  `/api/profile/update-optimized` copied every submitted key into the column payload, so the `phone`
  both settings forms always send poisoned the statement. `profiles.verified` in
  `/api/settings/profile` was the same shape.
- The database type inventory's `tscFiles` are **file-level, not line-level**, and its
  `tscDiagnosticHits` are **upper bounds**. Three lanes have now measured an object wrong
  independently. Measured at ca3bb0b0: `profiles.custom_url` = 10 primary diagnostics, all in
  `lib/seo/public-preview-readers.ts` (inventory: 17, split across an artist file that contains no
  such reference); `calculate_venue_profile_completion` = 1 live consumer,
  `app/api/settings/route.ts:125` (inventory: 3 files, 8 hits). Re-derive with a scoped tsc; do not
  trust the inventory's file list.
- `profiles` has **no** `phone` column. It has `show_phone`, `show_email`, `show_location` —
  real boolean columns from `20250819100000_profiles_expand_fields.sql`, default false — and those
  are the **sole** publication switches. The canonical phone storage is
  `profiles.profile_data.phone`; `profiles.metadata.phone` is the legacy mirror.
  `lib/profile/general-public-profile.ts:27` is the one correct gate and strips `profileData.phone`
  unless `show_phone === true`.
- The phone gate has a **writer divergence that is deliberately unresolved**.
  `app/api/settings/profile/route.ts:85` writes the column; `app/api/profile/update/route.ts` wrote
  `metadata.show_phone` only; `app/api/profile/update-optimized/route.ts` mass-assigns the column
  when its statement is not poisoned. The two settings components read `metadata.show_phone`, so the
  toggle the user sees is not the toggle the public gate honours. Unifying it is a product/privacy
  decision whose two directions have opposite consequences — see
  `HF-USER-035-PHONE-GATE-WRITERS`. Do not unify it silently.
- `app/api/connect/sessions/route.ts:146` is a **live third-party reader of the phone gate**
  (`Boolean(profile.show_phone && connectSettings.sharePhoneOnConnect && profile.profile_data?.phone)`)
  and belongs to no agent's grant.
- `app/api/settings/route.ts` took a caller-supplied `profile_id` on both verbs. RLS blocked the
  cross-user **write** (`profiles_update ... USING (id = auth.uid())`) but the route still answered
  `success: true` for a zero-row update, and RLS never blocked the cross-user **read** because
  `profiles_select` is `USING (true)` in the active chain — GET returned another user's entire
  profile row, `metadata` and `profile_data` included. Both verbs now return 403 and issue no query.
- MFA is **dead**, and the unlock is a deletion order rather than a permission. The complete importer
  set of `lib/services/mfa.service.ts` is `hooks/use-mfa.ts` and
  `__tests__/integrations/mfa.service.test.ts`; the hook had zero importers and is **deleted**. The
  `user_mfa_*` relations the service reads are created by no SQL file under `supabase/` and are
  superseded by `20260918213707_mfa_verification_codes`. Persistent MFA remains an open requirement
  under INTG-003 / DB-008; this retires one superseded implementation.
- A scoped tsc over the MFA graph did **not** complete inside a 10-minute bound — `mfa.service.ts`
  triggers `TS2589` at six sites, so the measurement itself is expensive. The 40 + 1 diagnostic
  figures are quoted from the design-system lane's preserved run, not re-measured here.

### Current focus

- USER-003: the drift repair is complete for the general-user surface. Remaining acceptance still
  depends on the canonical settings-family owner decision in `QUESTIONS.md` Q2.
- USER-005: locally achievable work is done. Hosted criteria (isolated-staging lifecycle, cross-tenant
  negative authorization, two-prefix `private-docs` Storage certification) remain blocked and are not
  claimed.
- USER-006: **decided — RETIRE.** See the `decision` block in the task. The route is retained on disk
  only because the removal sequence's route-map precondition needs `agents:generate`.

### Known risks

- `custom_url` now aliases `username` in three API responses. A client that treated them as
  independent handle fields will see them converge. The conflict case is rejected with 400 rather
  than silently resolved, so no handle change is ever chosen for the user.
- `/api/profile/create/route.ts` is repointed but has **zero callers** and is not deleted; route
  deletion is a product-surface decision and is routed by handoff.
- The `events`, `analytics`, `calendar` and `connect` path families belong to no agent, so nothing in
  them can be verified by an owner until the registry is repaired.
