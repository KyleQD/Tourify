# Organization state

- Last reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1` (generated maps stamped SHA; working tree dirty at review)
- Last reviewed at: 2026-09-09
- Active task: ORG-006 (org-scoped event lifecycle action disposition)
- Completed: ORG-001 (audit), ORG-002 (canonical identity), ORG-003 (atomic
  invite accept + revocation), ORG-004 (first-recipient RLS fix), and ORG-005
  (organizer-account visibility helper)
- Confidence: reviewed

## Durable facts

- Mission: Own organization identity, membership, tours, collaboration, and tenant context.
- Default working set is recorded in `WORKING_SET.json`; **the declared `lib/organization/**` path does not exist** — real paths are `lib/organizations/`, `lib/public-organization/`, `lib/admin/tour-*`, and `lib/auth/org-command.ts` (see BASELINE.md §7 and GAPS-3).
- Organization tenant context is `organizations` + `org_members` + `org_role_permissions` (migration `20250816132000_org_rbac.sql`); public/ops identity is `organizer_accounts` bridged via `ops_org_id`. Dual-model decision is open (QUESTIONS Q1 / ADR-001–003).
- ORG-002 decision: `organizations.id` is the canonical tenant identity, `org_members` is the authorization boundary, `organizer_accounts.id` is the linked public/ops profile, and `accounts` is only a compatibility/search projection. The shared mapping lives in `lib/organizations/identity.ts`; unbridged organizer profiles are not valid organization authorization contexts.
- Tours access model is canonical in `lib/admin/tour-access.service.ts` (TOUR-102): `org_member | tour_collaborator | legacy_owner`; org invite accept is atomic + token-hashed since ORG-003/ORG-004 (see the ORG-003 → ORG-004 section below; supersedes GAPS-2/GAPS-10's WS-0.2 remainder).
- Canonical admin org command layer exists: `lib/auth/org-command.ts` (SEC-103, `withOrgCommand`), adopted by 5 endpoints so far (GAPS-7).
- Admin org governance hub is built but mostly read-only: `app/admin/dashboard/organization/page.tsx` + 11 GET-mostly routes under `app/api/admin/organization/**` (GAPS-5).

## Current focus

- ORG-003/ORG-004 closed: org invite accept is atomic through `public.accept_org_invite` (invoker rights, hashed tokens, revocation RPC, rate-limited routes) and live-proven P1–P9 green on the local stack after the ORG-004 fix.
- Next bounded task candidates (after owner answers to QUESTIONS.md): identity model / membership lifecycle scope (P1), legacy `/api/tours` retirement (WS-2.3), acting-context fix on org hub panels.

## Durable facts (ORG-003 → ORG-004)

- Invite security hardening shipped in `20260909195618_atomic_org_invites.sql`: tokens hashed (`org_invites_token_hash_key` partial unique index; `token` nullable and cleared), atomic acceptance inside the RPC, recipient-accept RLS on `org_invites`/`org_members`, revocation column/RPC, and an immutability/acceptance guard trigger (`private.guard_org_invite_acceptance`).
- **ORG-004 fix** `20260910000000_fix_accept_org_invite_first_recipient_rls.sql`: `accept_org_invite` now inserts `org_members ... ON CONFLICT DO NOTHING` **without an explicit conflict target**. With an explicit `ON CONFLICT (org_id, user_id)` arbiter, PostgreSQL evaluates the SELECT policy `members_select` (`is_org_member(auth.uid(), org_id)`) against the candidate row, which is false for a first-time recipient → `42501 new row violates row-level security policy`; `ON CONFLICT DO NOTHING` (no target) skips conflicts on any unique constraint without gating the candidate row on the SELECT policy, while the INSERT WITH CHECK policies (`members_insert`, `org_members_accept_invite`) still gate the write at the data boundary. Applied manually (psql single transaction + `supabase migration repair --status applied`), 288/288 on `supabase_db_tourify-beta`.
- Live RLS evidence (2026-09-09, local DB at 127.0.0.1:54322): P1 first-time accept ATOMIC PASS, P2 no-overwrite PASS, P3 replay denial PASS, P4 revocation PASS, P5 revoked denial PASS, P6 cross-user denial PASS, P7 anon denial PASS, P8 token hashing PASS, P9 guard immutability PASS. Repository checks: migration-chain, migration-validation (ORG-003 + ORG-004 REL-102 manifests), database-types (no regen), focused vitest (2 files / 4 tests) all green.
- For authenticated-role emulation in probes on this stack: `set_config('role', '<role>', false)` + `set_config('request.jwt.claims', ..., false)` works (postgres is a member of authenticated/anon/service_role; supabase_admin is superuser). Note: a fresh session has `role` GUC = `'none'`, so the guard's postgres/service_role exemption does NOT apply to fixture writes until `set_config('role','postgres',false)` is issued.
- Open follow-up (non-blocking, noted in ORG-003/ORG-004): `accept_org_invite` returns `organizer_account_id` NULL for first-time recipients when no RLS policy lets a brand-new member see the org's (non-public) `organizer_accounts` row — decide on a security-definer helper or new-member visibility policy.

## Known risks

- Working tree was dirty at ORG-001 audit (386+ entries); preserve unrelated changes.
- Generated maps describe topology, not behavioral correctness.
- Org/tours surfaces span `app/api/admin/organization|tours/**` outside the declared working set — confirm ownership boundary with the admin agent when scoping follow-ups (QUESTIONS Q11).
- ORG-003 adds migration `20260909195618_atomic_org_invites.sql`: invite tokens are hashed, acceptance is atomic through an invoker-rights RPC, and revocation/accept routes are rate limited. Live RLS evidence was collected 2026-09-09 against local Supabase DB (127.0.0.1:54322): original run had 8/9 paths passing with P1 (first-time accept) failing with the circular RLS error. **Resolved by ORG-004** (`20260910000000_fix_accept_org_invite_first_recipient_rls.sql`): recreated `accept_org_invite` using `ON CONFLICT DO NOTHING` without the explicit `(org_id, user_id)` arbiter; re-probe P1–P9 all PASS, recorded in completed/ORG-003.json and completed/ORG-004.json.

## ORG-006 ownership boundary — 2026-09-18

- ORG-006 now owns `app/events/_actions/event-actions.ts` because all four
  actions mutate organization-scoped `events_v2`, calendars, or holds through
  the `event.manage` tenant boundary.
- `app/events/create/page.tsx` is the sole current external consumer and calls
  only `createEventAction`; the calendar, status, and hold exports require
  explicit retain/adopt/retire dispositions rather than absence-based cleanup.
- The 2026-08-23 H8 fix is a durable invariant: event-id mutations derive the
  actual owning org, and holds verify calendar-to-org binding. DB-006/database,
  venue, and QA-003 evidence are required before implementation or retirement.

## ORG-006 local disposition and authorization — 2026-09-18

- Exact caller evidence retains `createEventAction` for its live
  `app/events/create/page.tsx` consumer. `createCalendarAction` and
  `updateEventStatusAction` are retained pending Organization/Database adoption
  or explicit authorized retirement; `createHoldAction` is retained pending
  Venue adoption or explicit authorized retirement. Zero callers alone did not
  authorize deletion.
- All four actions use the request-scoped Supabase client and a server-side
  `has_perm(..., 'event.manage')` decision. No service-role client or
  client-supplied permission assertion is used.
- Status mutation authority is derived from the `events_v2` row's actual
  `org_id`. The update is now constrained by both event id and that authorized
  org id, returns the affected row, and fails closed if the event disappears or
  changes scope between lookup and update.
- Hold creation checks the calendar id and organization together, treats query
  errors or mismatched returned organization as unauthorized, and only then
  inserts the hold. Event and hold creation reject malformed timestamps and
  end-at-or-before-start ranges.
- Focused local coverage passes 11 tests for authentication, same-org success,
  unrelated/cross-org denial, missing and stale event targets, calendar-org
  binding, time validation, exact caller inventory, and the no-service-role
  invariant. Focused lint and inherited-config scoped TypeScript also pass.
- ORG-006 remains active because the three zero-caller exports still need named
  adoption/retirement authority, DB-006 has no hosted canonical/RLS evidence,
  Venue has not approved the hold lifecycle disposition, and QA-003 has not
  certified the retained flows against a deployed exact SHA.

Update this file only when a task establishes a durable fact future work needs.
