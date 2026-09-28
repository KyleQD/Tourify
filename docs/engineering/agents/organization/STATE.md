# Organization state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `ORG-007` — blocked/waiting_dependency; POSTLAUNCH-LOGISTICS
<!-- generated-agent-state:end -->

- Last reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1` (generated maps stamped SHA; working tree dirty at review)
- Last reviewed at: 2026-09-09
- Historical active-task note (superseded by generated queue summary): ORG-006 (org-scoped event lifecycle action disposition)
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

## Workforce Command Center assignment — 2026-09-26

- Goal: establish canonical organization, active-manager, and vendor identity boundaries for the WFC program.
- Task: `WFC-003`, activated 2026-09-26 by the WFC-001 first-activation ownership review, **completed 2026-09-27** (see the third dated section below for what the completion rests on and what it deliberately does not claim).
- Required handoff: provide Database with one authoritative organization identifier, same-organization manager/vendor validation, and quarantine rules for ambiguous ownership; do not create workforce schema in this lane.
- Governing plan: `docs/engineering/exec-plans/active/WFC-COMMAND-CENTER-20260926.md`.

## WFC-003 activation — 2026-09-26

- CP-102 makes this lane the **sole author** of the canonical organization, active-manager, vendor-identity, and quarantine contract for the workforce program. `DB-012` (vendor-to-organization ownership) and `ORG-007` (canonical organization vendor services) are re-pointed as consumers. Do not author vendor identity in this lane and do not expect either task to supply it.
- `ORG-007` stays active and blocked, with an empty scope and working set. When it unblocks, its first act is to read this contract, not to design vendor identity. Two lanes free-writing one identity contract is the failure this ruling exists to prevent.
- The recorded working set was **repaired** at activation: `lib/organization/**` and `lib/admin/organization-context.ts` do not exist in this repository. The real organization-resolution surface is `lib/admin/resolve-authorized-org.ts`, `lib/admin/org-entity-access.ts`, and `lib/admin/org-scoped-mutation.ts`. A working set naming absent paths is not a contract.
- Ambiguity discipline is the deliverable, not a delay: an unresolved tenant, manager, or vendor case is recorded as an explicit quarantine outcome with its evidence. Do not guess a merge, and do not let a plausible default stand in for a decision.
- No overlap with `ORG-006` (`app/events/_actions/`) or `ORG-008` (job postings) was found. Preserve all three lanes' current work.

## WFC-003 canonical workforce identity contract — 2026-09-26

Authored once, under CP-102. DB-012 and ORG-007 consume this; they do not
author a competing vendor identity. Full contract with per-claim `file:line`
evidence: `docs/engineering/agents/organization/CONTRACTS/WORKFORCE-IDENTITY-CONTRACT.md`.
Typed surface: `types/vendor-identity-contract.ts` (inside the declared
`types/**vendor**` working-set glob, which was empty). Tests:
`__tests__/admin/workforce-identity-contract.test.ts` (32 passing).

**Canonical organization key:** `organizations.id`. No second tenant table
competes with it (`20250816132000_org_rbac.sql:8`). This restates ORG-002
(`lib/organizations/identity.ts`); WFC-003's addition is the alias map.

**Alias map — the durable part.** Readable as `organizations.id`: `org_members.org_id`,
`staff_members.org_id`, `event_vendor_requests.org_id`, `vendor_contracts.org_id`
(all real FKs), plus the aliases `organizer_accounts.ops_org_id`,
`staff_members.entity_id` where `entity_type='org'`, and
`employment_assignments.employer_entity_id` where `employer_entity_type='organization'`.
NOT readable: `organizer_accounts.id` and `accounts.id` (bridges, different
identifiers); `staff_members.entity_id` where `entity_type='event'` (bridge, needs a
join); `venue_id` / `adhoc_venue_id` (a different tenant — CP-093 makes a venue a
work scope); `venues.account_id` and `tour_vendors.vendor_account_id`
(**no foreign key exists on either** — `lib/database.types.ts:22224`, `:19492-19500`).

**The legacy staff-organization keys are five, not one.** `staff_members` carries
`org_id`, `entity_id`+`entity_type`, `employer_entity_id`+`employer_entity_type`,
`venue_id`, and `adhoc_venue_id`, all nullable
(`lib/database.types.ts:16470-16502`). Only `org_id` is canonical. The two legacy
type vocabularies **disagree**: `entity_type` admits `'org'`
(`20260602120000_unified_staff_roster.sql:7`) while `employer_entity_type` admits
`'organization'` (`20260714015225:146`) — a consumer matching on `'org'` alone
misses every `employment_assignments` organization row.

**Active-manager rule:** a user is an active manager of an org iff an `org_members`
row exists for `(org_id, user_id)` **and** `status = 'active'`; management
authority additionally needs `has_perm(uid, oid, 'workforce.manage')`. Tables
verified: **`org_members`** (`20250816132000:16-23`, PK `(org_id, user_id)` at `:22`
— no status in the key) and **`org_role_permissions`** (`:39-49`). Three existing
implementations already enforce this and must not drift:
`is_org_member` and `has_perm` at `20260821180438:106-151`, and
`resolveEffectiveAdminCapabilities` at `lib/auth/admin-capabilities.ts:228-229`
(`if (status !== 'active') return []`). **History:** the original `is_org_member` /
`has_perm` at `20250816132000:52-63` did **not** filter on status; the current
definitions added `and m.status = 'active'`. A member row with status `invited` or
`revoked` exists and grants nothing.

**Vendor identity:** a vendor is a company entity belonging to exactly one
organization, identified by an entity id, **never by a name**. Ratified from
existing code: `planVendorMerge` throws "Merge is org-scoped only"
(`lib/admin/vendor-identity.ts:302-304`) and `lib/admin/vendor-domain.ts:72-74,85`
throws "Cannot merge vendors across organizations" — one vendor entity per
organization. VEND-102's scoring and merge logic is adopted, not re-derived.

**Quarantine vocabulary** (`WORKFORCE_QUARANTINE_CODES`, 11 codes, asserted by
test). Fail-closed and terminal except `org_key_dangling`,
`membership_not_active`, `membership_absent`. The pattern is the one already
proven in this repo: `venue_identity_bridges` carries a constrained `provenance`
column and leaves malformed values for a reconciliation report "never silently
coerced" (`20260823010000_venue_identity_bridge.sql:40-41,76-77,120-136`).
Also ratified from `resolve-authorized-org.ts:72-76`: **never** infer an
organization from membership ordering for a multi-org admin.

**Ambiguities left unresolved on purpose — do not re-derive these.** 22 are
tabulated in the contract §5. The ones most likely to be re-litigated:

- **No vendor entity table exists anywhere in the chain.** Only `vendor_contracts`,
  `event_vendor_requests`, `tour_vendors`, all of which store a free-text
  `vendor_name`. Ownership is org-proven on two of them; identity on none.
- **Six vendor tables are read by live routes but exist in neither the migration
  chain nor `lib/database.types.ts`:** `vendors`
  (`app/api/admin/vendors/route.ts:20`), `org_vendors`, `vendor_compliance_documents`,
  `org_contracts`, `contract_signature_envelopes`
  (all `app/api/admin/organization/vendor-governance/route.ts:17,33,48,64`), and
  `vendor_aliases`. A route reading one returns a PostgREST **error, not an empty
  result** — so "no vendors found" is not evidence of no vendors (CP-098).
  **`vendors` vs `org_vendors` is NOT resolved**: guessing they are one entity is
  exactly the merge CP-096 forbids. WFC-004 decides.
- **`org_members` has two revocation representations and only one is honored.**
  `status` (`20260821180438:76-78`) and `revoked_at` (`:57`) both exist, but **no
  migration ever sets `revoked_at`** — it is always null. Only `status='revoked'`
  revokes. Mandate `status='active'`; WFC-004 reconciles the column.
- **`department_manager` is organization-wide, not department-scoped.**
  `AdminCapabilityTarget['type']` has no `department` member
  (`lib/auth/admin-capabilities.ts:193-195`) and a scopeless grant is an
  organization grant (`:253-259`), while `DEPARTMENT_MANAGER_CAPABILITIES` grants
  `workforce.manage` unqualified (`:113-119,129`). CP-094's resource-scoped manager
  authority is **not expressible today**. Recorded as `MANAGER_SCOPE_GAP`; WFC-004
  owns the schema. **Do not** use the free-text `staff_members.department` /
  `employment_assignments.department` columns as a workaround — no department
  table exists in the chain.
- **`staff_members` has no tenant isolation and no fail-closed scope check.** Its
  only three RLS policies are all `auth.role() = 'authenticated'`
  (`20250818120000_admin_staffing_core.sql:362,396,427`), so any authenticated user
  can read any org's `org_id`, `email`, `phone`, `hourly_rate`. Contrast
  `staff_shifts`, which has a **validated** `org_id is not null or venue_id is not
  null` check (`20260821031214:51-56`). `staff_members` has no equivalent, and
  `org_id` is nullable `on delete set null`. Recorded, not changed — WFC-004.
- **`staff_members_org_user_key` is partial** (`20260821031214:86-88`): it only
  constrains rows where `org_id is not null`, so the quarantined population is
  unconstrained and may duplicate. Do not cite it as general uniqueness.
- **`unified_staff_roster` is a VIEW**, not a table
  (`20260602120000_unified_staff_roster.sql:39-53`). Never a write target.
- **`get_active_organizer_account_for_org` uses `limit 1`** with no uniqueness
  guarantee on `(ops_org_id, is_active)` (`20260910000001:41-44`); a
  multi-profile organization is unproven.

**Verification recorded at SHA `16fb834f1a03a70f165be470a5f98f389bf6100a`:**
scoped `tsc -p tsconfig.wfc003-slice.json --noEmit` clean; focused vitest 32/32;
full `__tests__/admin` 3538 passed / 2 skipped; `check:admin-route-registry` OK;
`npm run agents:validate` 17 agents / 175 tasks / **0 warnings, 0 errors**.
Full-repo `npm run typecheck` **does not complete** on this machine
(`lib/database.types.ts` is 25,648 lines; two concurrent full typechecks were
observed thrashing). **No hosted, browser, or migration-applied evidence is
claimed** — this task created no schema. `check:admin-audit` fails with 3
pre-existing generated-view drift errors; proven pre-existing because none of its
hash inputs (`docs/audit/**`, `lib/supabase/service-role-import-review.json`,
`lib/admin/api-route-registry.ts`) are modified in the worktree.

---

## 2026-09-26 — WFC-003 second pass: a contract that cannot go stale, and the `workforce.*` role decision (CP-102)

**Read this before trusting any WFC-003 claim.** The first delivery contained four
false claims and one overstatement, and its suite passed over all five because each
was a sentence in this repository rather than a measurement of it. That is the
CP-085 / CP-090 / CP-104 failure class. All five are corrected below, and the
mechanism that produced the corrections is now part of the contract.

### The rule adopted

**A claim about the CURRENT STATE OF THE REPOSITORY is never stored as a sentence.**
It is stored as a measurement plus a pure classifier, and the test reads the
repository — the resolver module, the resolver's *source text*, the migration
chain, and `lib/database.types.ts`. Claims about *rules* stay sentences, because a
rule does not drift out from under you.

The consequence that matters: the suite alarms in **both** directions. If reality
moves away from the claim it goes red immediately; if reality moves *toward* it —
WFC-004 creating a department entity, WFC-004 seeding the role matrix — it also
goes red, so the record is updated deliberately instead of quietly becoming wrong.

### What was false

- **`MANAGER_SCOPE_GAP` was a string literal, and ADMIN-012 made it false while the
  test stayed green.** `AdminCapabilityTarget['type']` now admits `department`
  (`lib/auth/admin-capabilities.ts:199-206`) and `workforce.manage` is genuinely
  department-scoped for `department_manager` (`:319-323`, applied `:481-487` after
  the SEC-102 union). The literal is **retired, not deleted**:
  `MANAGER_SCOPE_REQUIREMENT` holds the CP-094 requirement, and
  `assessManagerScopeClosure` classifies the *measured* state. Today's verdict is
  `capability_expressed_entity_unsourced` — expressible, but with no department
  entity anywhere in the chain to source `managedDepartmentIds` from, so every
  department manager is denied. Fail-closed, and intended.
- **§3.3's "returns a PostgREST error, not an empty result" was false at the base
  SHA.** Every live reader already handles `42P01`. One does it correctly
  (`app/api/admin/vendors/route.ts:31-33` returns `unavailable: true`, and
  `vendor-master-panel.tsx:58-108` reads it); six render a `null` that is
  indistinguishable from a genuine null. The surviving fact is a CP-098 one, not
  an outage one.
- **§3.3's reader list was short by three.** Seven reader sites, not four.
  `org_contracts` is also read by `app/api/admin/organization/overview/route.ts:64`
  and `app/api/admin/organization/tours-health/route.ts:98`. An undercounted
  outage list is worse than none, because it reads as complete.
- **§1.3b's "any authenticated user can read any organization's `staff_members`"
  is withdrawn.** The CP-104 correction block is right: `20260823210000` drops
  those three policies, by literal name and by a dynamic `pg_policies` sweep that a
  literal grep cannot see. DB-013's `20260926150000` drops them again and creates
  three org-scoped ones. The real remaining shape is an *availability* gap, not a
  disclosure one — see the role decision below.
- **§2.3's "three implementations enforce it and all four cannot drift" was an
  overstatement.** Re-measured across `lib/admin/**`, `lib/auth/**` and the
  workforce services: **eleven `org_members` read sites, four enforce
  `status = 'active'`, seven do not.** One of the seven is
  `lib/admin/workforce-authority.service.ts:68` — the workforce authority boundary
  itself — and two more (`lib/admin/calendar/aggregate.ts:1013-1019`,
  `lib/admin/tour-event-operations.service.ts:751-775`) infer the **organization**
  from membership *ordering*, which the contract's own §4.3 rule 1 forbids and
  which `resolve-authorized-org.ts:72-76` forbids in prose two directories away.
  Handoff to WORK-102 / work / admin / DB-014.

### The CP-102 decision: who holds `workforce.*` at the database

`has_perm` is the only authority the workforce RLS policies read, and **no seeded
`org_role_permissions` role carries any `workforce.*` permission** — re-derived
here from the chain, not taken on DB-013's word. Because
`lib/auth/admin-context.ts:222-243` **unions** the matrix with the TypeScript
catalog, an organization administrator passes `withAdminCapability('workforce.manage')`
and then reads **zero rows**: a split-brain authorization whose visible symptom is
a plausible zero, on 20+ gated routes and 20+ `staff_members` readers.

The decision is a **rule, not a table**:
`seed(role) = catalog(role) ∩ workforce.* − departmentScoped(role)`. The subtraction
is the decision — `has_perm(uid, oid, perm)` has no target argument, so anything in
the matrix is granted organization-wide.

- `owner`, `admin`, `tour_manager`, `production`, `production_manager` →
  `view` + `manage` + `publish`. CP-094's own sentence.
- `finance`, `finance_manager`, `viewer` → `view`.
- `department_manager` → `view` + `publish`, and **never `manage`**. Withholding is
  the posture, not a gap: seeding `manage` there would hand a department manager
  organization-wide management authority, which is the one change that would
  actually violate CP-094.
- `ticketing`, `ticketing_manager`, `worker` → nothing.
- `staff.manage` is **retained**; the seed is additive.

**Mechanism: a migration, WFC-004's, under CP-051 manual additive apply.** The
matrix is world-readable (`roleperms_select ... using (true)`), it decides RLS, and
role defaults are a product contract rather than tenant data. **Per-tenant
delegation stays configuration** — the per-member `org_members.permissions` array,
already CHECK-constrained to the capability catalog. Default matrix = schema;
deviation = tenant data.

**Gap or posture? Both, and the halves must not be conflated.** A **genuine gap**
for the eight organization-wide roles: the app says yes and the database returns
nothing. A **deliberate posture** for `department_manager`: the authority is real,
resource-scoped, and unsatisfiable until WFC-004 creates the department entity.

**Operational cost WFC-004 must not discover mid-apply:**
`admin_acting_context_sessions.capability_version` digests
`org_role_permissions.perms` (`20260722002848:171,302`), so mutating a role's perms
**invalidates every active acting-context session** for that role. One migration,
all roles, verify the re-activation path *before* applying.

### Also new

`staff_members.user_id → org_members.org_id` is classified a **`bridge`**, not an
alias, and `resolveWorkforceOrganizationKey` quarantines it —
`lib/admin/workforce-authority.service.ts:201-216` derives a row's organization from
the member's `user_id` and then **writes the inference back** ("self-heal"). That is
membership-as-ownership. Not ratified; WORK-102 and WFC-004 own it.

**Verification at `16fb834f`:** focused vitest **65 passed** (from 32); scoped `tsc`
clean; eslint clean. **Negative control, recorded:** with
`WFC003_CAPABILITIES_SOURCE` pointing at a `/tmp` copy of the resolver with one line
removed, the same suite reported **4 failed** — including the primary state
assertion flipping to `not_expressible` — and restored to 65/65 when the override
was unset. `lib/auth/admin-capabilities.ts` was never written; only read.
`npm run verify:feature -- --changed` is **not claimed** (CP-106). No hosted,
browser, or migration-applied evidence. Three handoffs: `HF-WFC-004-WORKFORCE-RBAC-PROVISIONING`,
`HF-WFC-003-MEMBERSHIP-PREDICATE-AND-ORG-INFERENCE`, `HF-WFC-003-MISSING-VENDOR-TABLE-READERS`.

**WFC-003 remains `active`.** Acceptance criterion 2 is still not met, and correctly
so: no vendor entity and no department entity exists, so "managers and vendors
validated as active members/entities of the same organization" cannot be
demonstrated against real data. That is WFC-004's to create. The criterion is
retained deliberately; deleting it would tidy the record and destroy the only
thing standing between the program and a false green.

## 2026-09-27 — WFC-003 third pass: CP-094 is CLOSED, the negative control's own defect, and a false green the four red tests were hiding

CP-119 (accepted, this task) reviewed the four red tests in
`__tests__/admin/workforce-identity-contract.test.ts` after WFC-004 and DB-016
landed, and ruled that **all four were the suite working correctly**. This section
is the durable record of what that ruling changed. Nothing above is edited.

### The new verdict, and what moved it

`assessManagerScopeClosure` now returns **`closed`**, not
`capability_expressed_entity_unsourced`.

- **ADMIN-012** closed the capability side: `department` is in
  `ADMIN_CAPABILITY_TARGET_TYPES` (`lib/auth/admin-capabilities.ts:199-206`) and
  `workforce.manage` resolves department-scoped for `department_manager`
  (`:319-323`, applied `:481-487` after the SEC-102 union).
- **WFC-004** closed the entity side on 2026-09-27:
  `supabase/migrations/20260927100100_workforce_departments_and_memberships.sql`
  creates `workforce_departments` (:183, `org_id uuid not null references
  public.organizations(id)`, `unique (id, org_id)`), the accountable-manager
  relation `workforce_department_managers` (:250) and the primary/secondary
  membership relation `workforce_department_memberships` (:300).

`closed` is **expressible AND sourceable**, not `PROVEN`. Cross-organization
denial, secondary-membership denial, and the department-targeted guard in the
request path are still WFC-005's, and `assessManagerScopeClosure` carries that as
its `residual` with the test asserting it is present, so this contract cannot be
cited as closing CP-094 on its own.

The superseded state is **kept and asserted reachable**: the classifier still
returns `capability_expressed_entity_unsourced`, the test reaches it by flipping one
bit of the real measurement, and the blockers it names are the specification
WFC-004 implemented.

### `vendor_entities` exists. This corrects a recorded belief, not a code claim.

The second pass recorded that no vendor entity existed anywhere.
**WFC-004 created one** on 2026-09-27:
`supabase/migrations/20260927100000_workforce_vendor_entity_home.sql:160-283`
creates `vendor_entities` (NOT NULL `org_id` FK to `organizations(id)` :162,
`unique (id, org_id)` :193, seven-value `status` CHECK :171-175, a composite
self-FK that makes a cross-organization merge impossible by constraint :199-201)
and `vendor_entity_aliases` (:253-283), which finally gives
`VendorMergePlan.aliasesToRetain` a real target — at the **VEND-102** field
contract §3 ratified.

What did **not** change: the six relations live code reads (`vendors`,
`org_vendors`, `vendor_aliases`, `vendor_compliance_documents`, `org_contracts`,
`contract_signature_envelopes`) still have **no DDL anywhere**, and the
`vendors`/`org_vendors` merge question is still **UNRESOLVED** with a single
read-only catalog query recorded to settle it (CP-113,
`HF-DB-012-VENDOR-ENTITY-MERGE-UNRESOLVED`). The entity existing does not lift
`vendor_identity_name_only` for a caller that has not been migrated to it, and
**no live route reads `vendor_entities` yet**. Two live residuals, both asserted
so they cannot be discovered later as an application error:
`lib/database.types.ts` contains **neither** new entity table, and the entity
tables are unread by the application.

### The negative control's own defect — CP-119's second lesson

The negative control finished with
`expect(assessManagerScopeClosure(measureManagerScope()).state).toBe('capability_expressed_entity_unsourced')`
— **a hardcoded expected verdict inside the one test whose entire purpose is to
contain no hardcoded verdict.** Its mutant loop above it is correct; this final
line re-introduced the literal one indirection away, and it failed for the same
reason the original `MANAGER_SCOPE_GAP.currentState` literal did.

It now asserts the **mechanism**: the mutant override is restored,
`capabilitiesSourcePath()` is the real resolver, the retargeted measurement's
inputs equal the real file's parsed content, the chain half is unchanged by an
override that only retargets the resolver, the verdict is a member of the
classifier's declared three-state vocabulary, and it **differs** from the mutants'
verdict. No expected verdict appears.

**Proven to survive a change, in both directions:**

- Re-inserting the superseded value as the final assertion → **1 failed**
  (`expected 'closed' to be 'capability_expressed_entity_unsourced'`), with all
  five mechanism assertions before it passing. The value form fails on a
  legitimate move; the mechanism form did not.
- The whole suite against a **simulated pre-WFC-004 chain** (measurement forced to
  `departmentEntityExists: false`, i.e. the truth of 2026-09-26) → **both negative
  controls GREEN**, 3 tests red, and all three are the *state* assertions that
  must alarm when the state moves. That split is the design.

Swapping the literal for `'closed'` was refused, explicitly: it restores the same
anti-pattern one generation later and the next truth change breaks it again.

### The false green the four red tests were hiding

`scanSeededWorkforcePermissions` read roles only out of `('role', array[...])`
VALUES tuples. **DB-016 writes its seed as a `$json$` literal** driven by
`jsonb_each(c_seed)`, so the scanner saw the statement, saw the three
`workforce.*` names in it, and read **zero roles** out of it. Three assertions
therefore stayed **green while asserting things that were no longer true**: "no
seeded role carries any `workforce.*` permission", "the chain seeds five roles",
and "proves the split-brain: the route admits and the database returns nothing" —
which had become a live-defect report for a closed defect.

**A measurement that cannot see one spelling of the thing it measures reports the
absence of a fact as the absence of a violation.** That is a false green and it is
worse than a stale red. Both the scanner and the assertions it was fooling are
fixed. The corrected assertion diffs the **effective** matrix — the union across
all statements — against the derived rule, so it no longer depends on how many
seed statements exist, and it asserts **both ends of the move** (DB-013's `[]`
beside DB-016's nine roles, with the date and both task IDs) so neither value can
be quietly re-adopted.

### The same anti-pattern in the resolver, one level up

`DIRECTLY_READABLE_KEYS` and `CANONICAL_KEYS` in
`types/vendor-identity-contract.ts` were hand-written `Set` literals — a
**transcription** of `WORKFORCE_ORGANIZATION_KEY_ALIASES`, so the map could gain an
entry the resolver never saw. It did: WFC-004 created five NOT NULL
`organizations(id)` columns, this contract recorded all five as `canonical` in
§1.1, and `resolveWorkforceOrganizationKey` still classified every one of them as
cross-tenant. **A provably org-bound key was quarantined as a tenant violation** —
CP-098's plausible zero in a new costume. Both sets are now **derived** from the
map (`canonical ∪ alias`, and `canonical`), and the alias map carries the five new
entries with `file:line` evidence (21 entries).

A rule restated in two places is a rule that will be true in one of them.

### Standing rule, extended by this pass

The §0.1 rule covers **sentences**. This pass found the same defect in a
**measurement** (a scanner too weak to see a spelling), in a **derived set**
(transcribed instead of derived), and in a **test name** (a test called "still has
no vendor entity table" whose body never checked for one, so it kept passing after
the entity landed). The generalized rule:

> **A measurement must be shown to see every shape the thing it measures can take,
> and a name must not assert anything its body does not check.** A check that has
> only ever returned the answer it expects is an untested check.

### Verification at `16fb834f` (worktree, 2026-09-27)

Focused vitest **77 passed** (from 65); `__tests__/admin` **3667 passed, 12
skipped, 274 files, 0 failed**; scoped `tsc` clean; eslint clean;
`npm run agents:validate` **0 warnings, 0 errors**;
`npm run check:admin-route-registry` OK; `npm run check:admin-audit` **3
pre-existing failures, unchanged from base SHA**;
`npm run verify:feature -- --changed` **aborted at `check:supabase-target`** for
want of `SUPABASE_PROJECT_ID` — CP-120, triggered by other lanes' *untracked*
migrations in the shared worktree rather than by anything WFC-003 touched, after
scoped eslint, scoped typecheck and the migration-chain scans had all passed. Per
CP-120 a lane may not record that tier as `pass`; it is recorded `partial` with
the aborting step named. No hosted, browser, or migration-applied evidence.

**WFC-003 reaches `completed` on this pass.** Acceptance criterion 2 is now
demonstrated **against the migration chain**, measured rather than asserted: both
entity tables exist, both carry a NOT NULL `organizations(id)` tenant key and a
composite `unique (id, org_id)`, and a cross-organization manager→vendor
reference is refused by a **foreign key** rather than by a check somebody can
skip. Two residuals are recorded rather than absorbed — the generated schema is
stale, and no route reads the entity — and both belong to named lanes, not to this
contract. The criterion text is **unchanged**; only its state moved, with the
evidence and the date in the task record and the contract §0.2.
