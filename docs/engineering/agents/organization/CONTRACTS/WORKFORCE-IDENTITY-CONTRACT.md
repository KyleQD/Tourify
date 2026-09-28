# WFC-003 — Canonical workforce organization, manager, and vendor identity contract

- **Task:** WFC-003
- **Author:** organization agent (sole author under CP-102)
- **Base SHA:** `16fb834f1a03a70f165be470a5f98f389bf6100a` (branch `codex/qa004-staging-campaign`)
- **First delivered:** 2026-09-26
- **Reconciled:** 2026-09-26 (second pass — see §0.1); **2026-09-27** (third pass — §2.4 and §2.5 were both *understating* the repository, see §0.2)
- **Mandate:** CP-102 (`docs/engineering/DECISIONS.md:963-971`)
- **Typed surface:** `types/vendor-identity-contract.ts`
- **Tests:** `__tests__/admin/workforce-identity-contract.test.ts` (77 passing, of which 3 are negative controls)
- **Status:** decision-complete. Schema and migrations are **WFC-004's**, not this task's.

## 0. What this document is, and what it is not

This is the single authoritative identity contract for the Workforce Command Center
program. `DB-012` (vendor-to-organization ownership) and `ORG-007` (canonical
organization vendor services) are **consumers**. Neither may author a competing
vendor identity, vendor-to-organization ownership rule, or manager-authority rule.
Any change another lane needs here is a handoff back to WFC-003, not an edit.

This document creates no tables, writes no migrations, and resolves no ambiguous
case by guessing. Where the repository is ambiguous, the ambiguity is recorded as a
quarantine outcome with its evidence and left for a human.

Every claim below cites the migration or source line that proves it. Claims that
could not be proven are marked **UNPROVEN** and are quarantined, not assumed.

### 0.1 Second-pass corrections, and the rule that produced them

The first delivery of this document asserted four things that were **false when
written**, and its test suite passed over all four because each was a sentence in
this repository rather than a measurement of it. That is the CP-085 / CP-090 /
CP-104 failure class, and a contract that carries it is worse than no contract,
because the next lane verifies against it and is misled.

| # | False claim | Reality | Now |
|---|---|---|---|
| 1 | `AdminCapabilityTarget['type']` has no `department` member, so CP-094 is not expressible (§2.4 Gap B) | ADMIN-012 added it at `lib/auth/admin-capabilities.ts:199-206` and made `workforce.manage` department-scoped at `:319-323,:481-487` | §2.4 derives the state from the resolver and the chain |
| 2 | A route reading a missing vendor table "returns a PostgREST error, not an empty result" (§3.3) | Every live reader already handles `42P01` and returns `null` / `unavailable: true`. This was false at the base SHA | §3.3 records what each reader does, measured |
| 3 | Six vendor tables, named from two route files (§3.3) | Seven reader sites. `org_contracts` is also read by `app/api/admin/organization/overview/route.ts:64` and `app/api/admin/organization/tours-health/route.ts:98` | §3.3 lists all seven, measured |
| 4 | `staff_members` retains three permissive `auth.role()='authenticated'` policies and "any authenticated user can read any organization's staff_members" (§1.3b, §5 #9) | The CP-104 correction is right: `20260823210000` drops them, and DB-013's `20260926150000` drops them unconditionally. What replaced them is employer-scoped, not org-scoped | §1.3b restated |

A fifth claim was an **overstatement rather than a falsehood**: §2.3 said three
implementations enforce the active-membership predicate and "all four cannot
drift". Re-measured, **four enforce it and seven do not** — including
`lib/admin/workforce-authority.service.ts:68`, which is the workforce authority
boundary itself. See §2.3.

**The rule that produced these corrections, now enforced in code:** a claim about
the *current state of the repository* is never stored as a sentence. It is stored
as a measurement plus a pure classifier, and the test reads the repository. Claims
about *rules* (what a consumer must do) are sentences, because a rule does not
drift out from under you. `MANAGER_SCOPE_REQUIREMENT` +
`assessManagerScopeClosure` and `deriveWorkforceRoleSeedDecisions` are the two
mechanisms. Both alarm in **both** directions: if reality moves away from the
claim the suite goes red, and if reality moves *toward* it — WFC-004 creating a
department entity, or seeding the role matrix — the suite also goes red, so the
record is updated deliberately instead of becoming quietly wrong.

### 0.2 Third-pass reconciliation, 2026-09-27: two sections were UNDERSTATING reality

CP-119 ruled that the four red tests in this suite after WFC-004 and DB-016 landed
were all correct, and this section is the document half of that ruling. **This is a
different failure from §0.1.** §0.1 was a claim that had become *false*; §0.2 is a
claim that was still true and had become *too weak* — a document that understated
what the repository now contains, so a reader would under-scope work that is
already done and would keep a closed gap in the open list.

| § | What the document said | What is true, and who moved it | Now |
|---|---|---|---|
| §2.4 Gap B | CP-094 department scope is `capability_expressed_entity_unsourced` — "no department entity exists" | **WFC-004** created `public.workforce_departments` + `workforce_department_managers` + `workforce_department_memberships` at `20260927100100_workforce_departments_and_memberships.sql:183-350` (2026-09-27) | §2.4 states `closed`; the superseded state is retained and asserted reachable |
| §2.5 | "**no seeded role in that table carries any `workforce.*` permission**"; the chain seeds five roles; seven catalog roles have no row at all | **DB-016** seeded all twelve catalog roles with the CP-102 workforce slice at `20260926200000_org_role_permissions_workforce_seed.sql` (2026-09-26), implementing the rule decided in §2.5.2 | §2.5 states the workforce-family split-brain is closed and measures the residual outside it |
| §3.2 / §3.3 | No vendor entity exists anywhere; a vendor can only be named | **WFC-004** created `public.vendor_entities` + `public.vendor_entity_aliases` at the VEND-102 field contract at `20260927100000_workforce_vendor_entity_home.sql:160-283` (2026-09-27) | §3.2 names the entity. §3.3 keeps the six *reader* names unproven — a different claim, and still true |
| §1.1 | 16-entry alias map, with the resolver's readable-key set transcribed separately | WFC-004 created five org-bound entity columns, and `resolveWorkforceOrganizationKey` classified every one of them as cross-tenant because its key sets were transcribed rather than derived from the map | 21 entries; the key sets are now **derived** from the map, so this cannot recur |
| §7.1 | The negative control proves the retargeted measurement "returns today's verdict" | That was a hardcoded expected verdict inside the one test whose purpose is to contain no hardcoded verdict, and it failed on 2026-09-27 for exactly the reason §0.1's rule exists | Asserts the **mechanism**; demonstrated to survive a verdict change in both directions |

**Nothing above was deleted.** Every superseded value is kept where a later reader
will meet it: `WORKFORCE_RBAC_SEED_IN_CHAIN.history` carries DB-013's `[]` beside
DB-016's nine roles with the date and both task IDs; §2.4 keeps the middle state and
the test asserts it is still reachable; `UNPROVEN_VENDOR_TABLES` and its reader list
are untouched, because the six relations live code reads still have no DDL anywhere
and that has not changed.

**One more consequence, which is a finding rather than a reconciliation.** The
third pass found that this suite's own `scanSeededWorkforcePermissions` read roles
only out of `('role', array[...])` VALUES tuples. DB-016 writes its seed as a
`$json$` literal, so the scanner saw the statement and read **zero roles** out of
it, and three assertions below stayed **green** while asserting things that were no
longer true. A measurement that cannot see one spelling of the thing it measures
reports the absence of a fact as the absence of a violation. That is a false green
and it is worse than a stale red, so both the scanner and the assertions it was
fooling are fixed, and the corrected form asserts the **effective** matrix — the
union across statements — against the derived rule, so it no longer depends on how
many statements exist.

## 1. The one canonical organization key

> **The canonical workforce tenant key is `organizations.id`.**

Proof: `organizations.id` is a `uuid primary key`
(`supabase/migrations/20250816132000_org_rbac.sql:8`) and is the foreign-key target
of every org-scoped workforce column in the chain. There is no second tenant table
competing with it.

This is not a new decision. It restates ORG-002
(`lib/organizations/identity.ts:1-15`), which the governing plan and CP-093/CP-094
already assume. WFC-003's contribution is the **alias map** — which existing keys
may be read as that key, and which must never be.

### 1.1 Alias map

| Key | Table | Relation | Readable as `organizations.id`? |
|---|---|---|---|
| `organizations.id` | `organizations` | `canonical` | yes |
| `org_members.org_id` | `org_members` | `canonical` | yes |
| `staff_members.org_id` | `staff_members` | `canonical` | yes |
| `event_vendor_requests.org_id` | `event_vendor_requests` | `canonical` | yes |
| `vendor_contracts.org_id` | `vendor_contracts` | `canonical` | yes |
| `organizer_accounts.ops_org_id` | `organizer_accounts` | `alias` | yes, when non-null |
| `staff_members.entity_id` where `entity_type='org'` | `staff_members` | `alias` | yes, **when both conditions hold** |
| `employment_assignments.employer_entity_id` where `employer_entity_type='organization'` | `employment_assignments` | `alias` | yes, when the type tag says so |
| `staff_members.entity_id` where `entity_type='event'` | `staff_members` | `bridge` | **no** — needs a join to `events_v2.org_id` |
| `organizer_accounts.id` | `organizer_accounts` | `bridge` | **no** — a different identifier |
| `accounts.id` | `accounts` | `bridge` | **no** — discovery projection only |
| `staff_members.venue_id`, `staff_members.adhoc_venue_id` | `staff_members` | `cross_tenant` | **no** — a venue is a work scope (CP-093) |
| `staff_members.employer_entity_id` where type is `venue`/`artist` | `staff_members` | `cross_tenant` | **no** — a different tenant |
| `staff_members.user_id` → `org_members.org_id` | `staff_members` | `bridge` | **no** — see §1.2c; live code infers from it and writes the result |
| `venues.account_id` | `venues` | `unproven` | **no** — no foreign key exists |
| `tour_vendors.vendor_account_id` | `tour_vendors` | `unproven` | **no** — no foreign key exists |
| `vendor_entities.org_id` | `vendor_entities` | `canonical` | yes — WFC-004, `20260927100000:162`, with `unique (id, org_id)` |
| `vendor_entity_aliases.org_id` | `vendor_entity_aliases` | `canonical` | yes — WFC-004, `20260927100000:255` |
| `workforce_departments.org_id` | `workforce_departments` | `canonical` | yes — WFC-004, `20260927100100:185`, with `unique (id, org_id)` |
| `workforce_department_managers.org_id` | `workforce_department_managers` | `canonical` | yes — WFC-004, `20260927100100:252` |
| `workforce_department_memberships.org_id` | `workforce_department_memberships` | `canonical` | yes — WFC-004, `20260927100100:302` |

Per-entry evidence is in `WORKFORCE_ORGANIZATION_KEY_ALIASES`
(`types/vendor-identity-contract.ts`), which is the machine-readable form of this
table and is asserted to carry `file:line` evidence by test.

> **The last five rows were added 2026-09-27, and adding them was not
> housekeeping — it was a live defect.** `resolveWorkforceOrganizationKey` decided
> which keys hold the tenant from a hand-written `Set` of key strings that was a
> transcription of this map, so the map could gain an entry the resolver never saw.
> WFC-004 created five NOT NULL `organizations(id)` columns, this table recorded all
> five as `canonical`, and the resolver still classified every one of them as
> cross-tenant: a provably org-bound key was **quarantined as a tenant
> violation**. `DIRECTLY_READABLE_KEYS` and `CANONICAL_KEYS` are now **derived** from
> the map (`canonical ∪ alias`, and `canonical`), so a table gaining a tenant column
> can be added here once and cannot be forgotten in the resolver. This is the §0.1
> rule applied to the resolver instead of the test: a rule that is restated in two
> places is a rule that will be true in one of them.

### 1.2 `organization_id` vs `venue_id` vs the legacy staff-organization keys

This is the distinction the task asked to be made explicitly, and the repository
does not make it for you.

**`venue_id` is not an organization key.** It is a different tenant, reached from
an organization only through `venue_identity_bridges.operational_org_id`
(`supabase/migrations/20260823010000_venue_identity_bridge.sql:36-44`). Per CP-093
an event, tour, venue, or date is a *filter or work scope*, not the root hierarchy.
Therefore a workforce record's tenant is the organization, and a venue on a
workforce row identifies a place of work, never the owning tenant. Resolving a
workforce record's organization from a venue is `org_key_cross_tenant_only` →
quarantine.

Note that even the bridge is `nullable` and `on delete set null`
(`20260823010000_venue_identity_bridge.sql:39`), so a venue may have no
organization at all.

**The legacy staff-organization keys are not one key. They are five, and they
disagree.** `staff_members` carries all of these as nullable columns
(`lib/database.types.ts:16468-16503`):

| Column | Line | Status |
|---|---|---|
| `org_id` | 16492 | **canonical** — real FK added by `20260821031214:5` |
| `entity_id` + `entity_type` | 16481-16482 | legacy polymorphic pair; `entity_type ∈ ('event','venue','tour','org')` (`20260602120000_unified_staff_roster.sql:7`) |
| `employer_entity_id` + `employer_entity_type` | 16478-16479 | legacy pair; `employer_entity_type ∈ ('venue','organization','artist')` (`20260714015225:146`) |
| `venue_id` | 16502 | venue, not a tenant |
| `adhoc_venue_id` | 16470 | a *second* venue column; unproven meaning |

The `org_id` column was added last and is the only one with a direct FK
(`20260821031214_repair_event_tour_staffing_flow.sql:5`). The migration backfilled
it from exactly two provable sources and **refused to invent a third** (same file,
lines 10-28):

- `entity_type = 'org'` **and** the id exists in `organizations` → copy `entity_id`
- `entity_type = 'event'` **and** the joined `events_v2.org_id` is non-null → copy that

Everything else stayed `NULL`. That backfill is the proof that
`entity_type='org' + entity_id` is an alias and that nothing else is.

> **The two legacy type vocabularies disagree.** `entity_type` admits `'org'`
> (`20260602120000:7`) while `employer_entity_type` admits `'organization'`
> (`20260714015225:146`). A consumer that matches on the string `'org'` alone will
> miss every `employment_assignments` organization row. Both spellings are in the
> alias map, keyed by their exact qualified name.

### 1.2c A user's membership is not ownership of their workforce row

**Added 2026-09-26, second pass.** Live code performs a derivation this contract
forbids, and then persists it.

`lib/admin/workforce-authority.service.ts:201-216` scopes a `staff_members` row
this way: if the row's own `org_id` is null, fall back to "is the row's `user_id`
an active member of the acting organization" — and if that succeeds, **write the
inferred `org_id` onto the row** ("self-heal", `:208-216`). The comment calls it
best-effort and non-blocking, which is accurate and is also the problem: it is an
inference that becomes a fact.

That is membership-as-ownership. §4.3 rule 1 forbids inferring an organization
from anything but a proven key, and the two files recorded in
`WORKFORCE_MEMBERSHIP_PREDICATE.organizationInferenceDefects` go further and infer
the *organization itself* from membership ordering.

The contract's position:

- the derivation is classified `bridge` in the alias map, which means
  `resolveWorkforceOrganizationKey` quarantines a record whose only key is that
  derivation rather than accepting it;
- it is **not** ratified. WFC-004 owns whether a user-membership derivation is
  ever permitted as a backfill source, and `20260821031214:10-28` set the precedent
  for what a provable source looks like — `entity_type='org'` *and* an
  `organizations` row, both conditions together. Membership satisfies neither.
- WORK-102 owns the service and is the receiver of the handoff. WFC-003 records
  the rule; it does not edit another lane's authority service.

### 1.3 `staff_members` is not a fail-closed tenant, and has no tenant RLS

Two findings that WFC-004 and WFC-005 must plan around. Both are stated as facts,
not resolved here.

**(a) No fail-closed scope constraint.** `staff_shifts` has a *validated* check
`org_id is not null or venue_id is not null`
(`20260821031214_repair_event_tour_staffing_flow.sql:51-56`). `staff_members` has
no equivalent: the only check constraint on it anywhere in the chain is
`staff_members_status_check` (`20260714015225:66-71`). `staff_members.org_id` is
nullable and `on delete set null`, so deleting an organization silently nulls
`org_id` on every member row rather than blocking the delete. A workforce read
that assumes `org_id` is present is wrong.

**(b) No organization-scoped RLS — restated 2026-09-26, because the first
delivery of this section was wrong.** The first delivery said `staff_members`
retains `read_all_staff`, `insert_staff` and `update_staff`, each gated only on
`auth.role() = 'authenticated'`
(`20250818120000_admin_staffing_core.sql:362,396,427`), and concluded that "any
authenticated user can read any organization's `staff_members` rows". That
conclusion is **withdrawn**, and the correction is the CP-104 correction block
(`docs/engineering/DECISIONS.md:1003-1011`), which the orchestrator recorded after
DB-013 measured the chain properly:

- `20260823210000_harden_hiring_onboarding_pii.sql` drops all three names — by
  literal name in its `v_permissive` array at `:267`, and by a **dynamic
  `pg_policies` sweep** at `:293-313` matching `qual ilike '%auth.role()%authenticated%'`.
  A literal grep cannot see `execute format(...)`. The first delivery's evidence
  was a literal grep.
- DB-013 then shipped `20260926150000_staff_members_org_scoped_rls.sql`, which
  drops all three names again with `drop policy if exists` (`:145-147`, so it is
  correct on a replayed target and a no-op on an unreplayed one), and creates
  `staff_members_scoped_read` / `_insert` / `_update` at `:161,186,209`, plus a
  `staff_members_worker_read_own` re-assert at `:241-265`.

**What is true now, and it is still a finding.** The mass-disclosure shape is gone
on a target where the chain was replayed. What replaced it is
`staff_members_employer_manage_hiring` (created by `20260823210000:352-364`),
which is keyed on `employer_entity_type` / `employer_entity_id`, and
`can_manage_hiring` returns false for a null entity pair
(`20260625000000:203-205`). The event/tour staffing rows `20260821031214` was
written for carry `org_id` and no employer pair, so until DB-013's three policies
landed they were invisible to org managers. That gap is now closed *if* the caller
holds `workforce.view` or `workforce.manage` on the row's `org_id` — which is the
subject of §2.5, and where no seeded role currently does.

So the honest statement of `staff_members` tenant isolation is:

1. no fail-closed scope CHECK (§1.3a) — unchanged, a real finding;
2. `org_id` nullable and `on delete set null` — unchanged, a real finding;
3. RLS is organization-scoped through `has_perm(..., 'workforce.view' |
   'workforce.manage')`, and **as seeded that predicate is false for every role**,
   so today those policies deny everyone who is not an org administrator once §2.5
   lands, and everyone at all until then. That is fail-closed and it is an
   availability defect, not a disclosure one. It is WFC-004's to close, per §2.5.

This lane does not change `staff_members` RLS. It records the state so the WFC-004
schema is not designed on the assumption that the table is already tenant-isolated
by anything other than a permission nobody holds.

### 1.4 Partial uniqueness, and what it does not cover

`staff_members_org_user_key` is a **partial** unique index on
`(org_id, user_id) where org_id is not null and user_id is not null`
(`20260821031214_repair_event_tour_staffing_flow.sql:86-88`). It guarantees at most
one `staff_members` row per (organization, user) **only when `org_id` is non-null**.
Rows with a null `org_id` — the entire quarantined population — are unconstrained
and may duplicate freely. Do not cite this index as a general uniqueness
guarantee.

`organizations.slug` is `text not null unique` (`20250816132000:10`). It is a
tenant-uniqueness guarantee on a *name*, not on identity, and must not be used to
match organizations.

## 2. Active-manager membership validation

### 2.1 The rule

> A person is an active manager of an organization **iff** an `org_members` row
> exists for `(org_id, user_id)` **and** `status = 'active'`. Management
> authority additionally requires `workforce.manage` for that same organization.

### 2.2 The real tables verified

**`org_members` is the membership table.** Not a proposed one.

- Created: `supabase/migrations/20250816132000_org_rbac.sql:16-23`
- Primary key: `(org_id, user_id)` — same file, `:22`. There is **no status in the
  key**, so a member has at most one row per organization and `status` is the only
  lifecycle discriminator.
- FK to `organizations(id)`: same file, `:17`
- Columns added later: `status`, `permissions`, `invited_at`, `activated_at`,
  `revoked_at`, `updated_at`, `seat_source`, `job_posting_id`, `job_application_id`
  — `supabase/migrations/20260821180438_job_posting_scopes_and_organization_seats.sql:52-61`

**`org_role_permissions`** is the role→permissions matrix
(`20250816132000:39-42`). It is seeded in **two** places, and only five roles exist
across both: `20250816132000:44-49` (`owner`, `admin`, `production`, `finance`)
and `20260712005429:219-235` (`tour_manager`, with
`on conflict do update set perms`). It is **world-readable**
(`roleperms_select ... using (true)`, `20250816132000:112`). §2.5 is about this
table.

**`organizations` and `organizer_accounts`** complete the context;
`organizer_accounts.ops_org_id` is the profile→tenant bridge
(`lib/database.types.ts:12938,12992-12997`).

### 2.3 The implementations of the rule, and how many actually enforce it

The rule above is not this task's invention. It is already expressed in four
places that **do** enforce it:

1. **`public.is_org_member(uid, oid)`** —
   `20260821180438_job_posting_scopes_and_organization_seats.sql:106-120`:
   ```sql
   select exists(select 1 from public.org_members m
     where m.org_id = oid and m.user_id = uid and m.status = 'active')
   ```
2. **`public.has_perm(uid, oid, perm)`** — same file, `:122-151`. Same
   `status = 'active'` predicate, then the union of the role's `org_role_permissions`
   and the member's own `permissions` array. **This is the one every RLS policy
   calls**, which is why §2.5 exists.
3. **`resolveEffectiveAdminCapabilities`** — `lib/auth/admin-capabilities.ts:452-453`:
   `if (status !== 'active') return []`.
4. **`loadMembership`** — `lib/auth/admin-context.ts:169-182`:
   `if (!data?.org_id || !data.role || data.status !== 'active') return null`,
   before any capability is computed.

`validateActiveManagerMembership` in `types/vendor-identity-contract.ts` is a fifth
expression of the same predicate, so a route guard, a migration validation query,
and a test agree by construction.

#### 2.3a Seven read sites that do NOT enforce it — measured, 2026-09-26

**The first delivery of this section claimed all implementations agree and could
not drift. That was an overstatement and it is withdrawn.** Re-measured across
`lib/admin/**`, `lib/auth/**` and the `admin-workforce*` services: eleven
`org_members` read sites, **four enforce the predicate and seven do not.** The
list is `WORKFORCE_MEMBERSHIP_PREDICATE.notEnforcedBy` and the test derives it from
the source tree, so it cannot drift again in either direction without the contract
changing with it.

The seven, in descending order of consequence:

| Site | What it does instead |
|---|---|
| `lib/admin/workforce-authority.service.ts:68` | `select("org_id")` with no status filter. `requireWorkforceOrgAccess` treats the row's existence as membership. **This is the workforce authority boundary.** |
| `lib/admin/resolve-authorized-org.ts:94` | Service-client read of *every* org the user has a row for, no status filter, and the result becomes `directlyAuthorizedOrgIds` at `:114`. A `revoked` member's organization is authorized. This file is in WFC-003's own working set. |
| `lib/admin/tour-access.service.ts:65` | `select("org_id")`, no status filter; gates tour access. |
| `lib/admin/event-access.service.ts:66` | `select("org_id")`, no status filter; gates event access. |
| `lib/admin/workspace-scope.ts:85` | `select("role")`, no status filter; reads a role for a revoked member. |
| `lib/services/admin-workforce-people.service.ts:92` | `select("user_id, role")`, no status filter, for an employer entity. |
| `lib/admin/calendar/aggregate.ts:1014` | `.limit(1).maybeSingle()` — see below. |
| `lib/admin/tour-event-operations.service.ts:752` | `if (memberships[0]) return memberships[0]` — see below. |

**Two of the seven are worse than a missing filter, because they infer the
organization itself from membership ordering:**

- `lib/admin/calendar/aggregate.ts:1013-1019` takes the *first* `org_members` row
  for a user and returns its `org_id`.
- `lib/admin/tour-event-operations.service.ts:751-775` does the same one line
  later, at `:774`.

§4.3 rule 1 is ratified from `lib/admin/resolve-authorized-org.ts:72-76`, which
states the opposite rule in prose: "It never infers an organization from
membership ordering, which is ambiguous for multi-org admins." Two files in the
same directory as that comment break it. This contract ratifies the rule and
records the two counterexamples; the receivers are WORK-102
(`workforce-authority.service.ts`), and work/admin for the access services.

> **History worth not repeating.** The original definitions at
> `20250816132000_org_rbac.sql:52-63` did **not** filter on status. They were
> replaced by `20260711153040:2-32` and then again by
> `20260821180438:106-151`, which added `and m.status = 'active'`. Any consumer
> that reads the *first* version's source, or that assumes "a row means active",
> is wrong. A member row with `status = 'invited'` or `'revoked'` exists and grants
> nothing — in SQL.

### 2.4 Two gaps as recorded 2026-09-26: one still open, one now CLOSED

**Gap A — revocation has two representations and only one is honored.**
`org_members` has both a `status` column constrained to
`('invited','active','revoked')` (`20260821180438:76-78`) and a `revoked_at`
timestamp (`:57`). **No migration in the chain ever sets `org_members.revoked_at`
to a non-null value** — `rg "revoke.*org_member"` matches only the unrelated
`revoke all on function` grant statements at `20260711153040:34`. Only
`status = 'revoked'` actually revokes. A reader that filters on `revoked_at is null`
as its revocation check is reading a column that is always null.

> **WFC-004 decision required:** make `status` the single source of revocation truth
> and either drop `revoked_at` or maintain it in the same write. Until that lands,
> this contract mandates `status = 'active'` and nothing else.

**Gap B — department scope is CLOSED. The gap existed, and WFC-004 closed it.**

> **State: `closed`, measured 2026-09-27.** Two lanes closed the two halves, and
> the §2.4 state changed because the repository changed, not because a claim was
> re-worded:
>
> - **ADMIN-012** closed the *capability* side: `department` is a member of
>   `ADMIN_CAPABILITY_TARGET_TYPES` and `workforce.manage` resolves
>   department-scoped for `department_manager`.
> - **WFC-004** closed the *entity* side on 2026-09-27:
>   `supabase/migrations/20260927100100_workforce_departments_and_memberships.sql`
>   creates `public.workforce_departments` (:183), the accountable-manager relation
>   `workforce_department_managers` (:250) and the primary/secondary membership
>   relation `workforce_department_memberships` (:300).
>
> The state is **not** stored here as a sentence. It is derived by
> `assessManagerScopeClosure` from a measurement of the resolver's scope catalog,
> its department-scoped role map, and the migration chain plus generated schema, and
> the test reads the repository.

What is actually true now, each item cited:

- `ADMIN_CAPABILITY_TARGET_TYPES` is `organization | tour | event | site_map |
  document | department` — `lib/auth/admin-capabilities.ts:199-206`, with
  `isAdminCapabilityTargetType` at `:214`.
- `grantCoversCapabilityTarget` at `:255-296` is the single decision point for
  whether a grant covers a target; its switch is exhaustive over that catalog and
  its `default` arm both fails `tsc` and denies at runtime.
- `DEPARTMENT_SCOPED_ROLE_CAPABILITIES` at `:319-323` is
  `{ department_manager: ['workforce.manage'] }`, applied at `:481-487` **after**
  the SEC-102 union, so neither a role default nor an entity grant can restore
  organization-wide `workforce.manage` to a department manager.
- `departmentScopeDenial` at `:372-391` is the whole rule, nine fail-closed
  denial codes, and it requires a `DepartmentAuthorityInput` whose
  `managedDepartmentIds` contains the target department.
- **A department entity exists.** `workforce_departments` is created at
  `20260927100100_workforce_departments_and_memberships.sql:183` with
  `org_id uuid not null references public.organizations (id)` (:185) and
  `unique (id, org_id)` (:197) — the two properties `departmentScopeDenial` needs,
  because the cross-organization denial depends on the id space being globally
  unique *and* the entity being org-bound. `workforce_department_managers` (:250)
  carries the accountable-manager relation with a partial unique index allowing one
  accountable manager per department (:285), and
  `workforce_department_memberships` (:300) separates `primary` (one active row per
  organization and person, :339) from `secondary`, which confers no management
  authority — enforced by `workforce_department_is_managed_by` never reading that
  table (:331), not by a comment.

**What `closed` does NOT mean, stated so it is not over-read.** Expressible AND
sourceable is not the same as proven end to end. Cross-organization denial,
secondary-membership denial, and the department-targeted guard in the request path
are only proven once **WFC-005** supplies the `DepartmentManagementLookup` and a
live multi-tenant test exercises them. `assessManagerScopeClosure` carries that as
its `residual`, and the test asserts the residual is present, so this contract
cannot be cited as closing CP-094 on its own.

**The superseded state, kept because it was the truth until yesterday.**
`capability_expressed_entity_unsourced` was correct from 2026-09-26 (when ADMIN-012
had closed only the capability side) until 2026-09-27. It is not deleted: the
classifier still returns it, the blockers it names (WFC-004's entity, WFC-004's
accountable-manager and membership relations, WFC-005's lookup) are the actual
specification WFC-004 implemented, and the test asserts the state is still
reachable by flipping one bit of the real measurement. A record that only carried
the current value could not tell a later reader which of the two was current.

> **Forbidden workaround, unchanged and still in force:** do not treat
> `staff_members.department` or `employment_assignments.department` as a department
> scope. Both are unconstrained nullable **text** columns
> (`lib/database.types.ts:16476` and `:4556`) with no foreign key. CP-094 already
> rejected free-text department fields as a responsibility boundary; this contract
> rejects them as an authorization boundary too. Recorded as
> `DEPARTMENT_SCOPE_FORBIDDEN_WORKAROUND` precisely *because* the state has now
> changed — a real department table exists, which is exactly when somebody will
> reach for the free-text column instead of it.

## 2.5 Who holds `workforce.*` at the database — the CP-102 decision

**New section, 2026-09-26. Provisioned 2026-09-27; this subsection is the update.**
It is recorded here, in the identity contract, because §2.3 makes it unavoidable:
`has_perm` is the only authority the RLS policies call and `has_perm` reads
`org_role_permissions`. On 2026-09-26 **no seeded role in that table carried any
`workforce.*` permission** and the split-brain below was live. **DB-016 closed it
on 2026-09-26** by seeding all twelve catalog roles with the slice derived in
§2.5.2 (`20260926200000_org_role_permissions_workforce_seed.sql`), which is the
action DB-013 raised and correctly declined to take from a security fix.

The rest of §2.5 is unchanged and is kept in full, because it is the specification
DB-016 implemented and the specification every later reader needs. What follows is
the state, restated with the move visible.

> **The state, 2026-09-27.** The chain seeds **three** `org_role_permissions`
> statements, covering all **twelve** catalog roles, and **nine** of them now carry
> a `workforce.*` permission. The vocabulary mismatch §2.5.1 describes is closed
> for membership. The application's gate and `has_perm` now **agree on every
> `(role, workforce permission)` pair** — that is the test, and it is measured
> against the chain, not asserted. The residual outside the workforce family is
> still non-zero and is **reported by the test rather than absorbed**: the matrix
> carries the legacy `staff.manage` / `event.manage` vocabulary and none of the
> other 39 capabilities, so layer 1 remains a superset of layer 2 for those, and
> widening the seed to the full catalog projection is a new decision (HF-WFC-004
> residual gap #1), not this one's.

The superseded measurements, kept so a later reader can tell them from the current
ones: **two** seed statements, **five** seeded roles (`owner`, `admin`,
`production`, `finance`, `tour_manager`), and **zero** seeded roles carrying any
`workforce.*` permission. Those were DB-013's numbers, measured on 2026-09-26, and
they are the measurement CP-098's plausible-zero finding rests on — a fact about
the chain at a version, not a fact about the chain forever. They live in
`WORKFORCE_RBAC_SEED_IN_CHAIN.history` and the test asserts **both ends of the
move**, so neither value can be quietly re-adopted.

### 2.5.1 The two role vocabularies, and why they must not be allowed to drift

| | Application | Database |
|---|---|---|
| source of truth | `ROLE_DEFAULT_CAPABILITIES`, `lib/auth/admin-capabilities.ts:123-138` | `org_role_permissions`, seeded `20250816132000:44-49` and `20260712005429:219-235` |
| how it is read | `loadCapabilities` passes the row's `perms` as `configuredPermissions` **and** the role string, and `resolveEffectiveAdminCapabilities` **unions** them (`:464-480`) | `has_perm(uid, oid, perm)` → `org_members.role` → `org_role_permissions.perms`, unioned with the member's own `permissions` (`:143-149`) |
| what it gates | `withAdminCapability(...)` in ~30 live route handlers | `staff_shifts_scoped_*` (`20260821031214:125,142,153,159,170`) and `staff_members_scoped_*` (`20260926150000:161,186,209`) |

The application is a **union**, so a role the TypeScript catalog defines gets its
capabilities whether or not the database agrees. The database is not a union over
the catalog, so it grants nothing extra. Admin API routes use a **user-scoped**
client (`withAdminCapability` → `withAuth` → `authenticateApiRequest` →
`createServerClient`, `lib/auth/api-auth.ts:143,276-292`), so RLS genuinely
applies.

**The consequence is split-brain authorization, and it is a silent one:**

1. An org administrator with `org_members.role = 'admin'` passes
   `withAdminCapability('workforce.manage', …)` — `admin` is `ALL_CAPABILITIES`
   minus two.
2. `staff_members_scoped_read` evaluates
   `has_perm(uid, org_id, 'workforce.view') OR has_perm(uid, org_id, 'workforce.manage')`.
3. `has_perm` looks up `org_role_permissions` for `'admin'` and finds
   `org.invite, event.manage, offer.manage, task.manage, schedule.manage,
   staff.manage, finance.manage, report.view, storage.read, storage.write`.
4. Both predicates are false. The policy denies. The route returns **zero rows**.

CP-098 is explicit that a plausible zero is the failure this program is guarding
against. A seeded organization administrator looking at an empty roster is exactly
that. Twenty-plus live routes are gated on `workforce.view` / `workforce.manage`
and more than twenty read `staff_members`.

> **Steps 1–4 above describe the state as it stood on 2026-09-26 and are the
> specification DB-016 implemented. As of 2026-09-26 they no longer describe the
> chain**: step 3's `admin` row now also carries `workforce.view, workforce.manage,
> workforce.publish`, so step 4 is false and the policy admits. The defect was real
> and the mechanism that fixed it is the decision in §2.5.2 — kept here verbatim
> because "what the split-brain looked like" is the only way a later reader can tell
> whether a new one is the same one.

**The vocabularies also did not match in membership, and no longer do.** As of
2026-09-26 the chain seeded five roles (`owner`, `admin`, `production`, `finance`,
`tour_manager`) against a catalog of twelve; `department_manager`, `viewer`,
`worker`, `ticketing`, `ticketing_manager`, `finance_manager` and
`production_manager` had **no `org_role_permissions` row at all**, so `has_perm`
returned false for *every* permission for them — not only the workforce ones.
DB-016 gave all twelve a row, so membership now matches. `roleperms_select ...
using (true)` (`20250816132000:112`) still makes that matrix world-readable, which
is why the decision below is a migration and not configuration, and that reason is
unaffected by the provisioning.

### 2.5.2 The decision

**Rule, not a table.** `deriveWorkforceRoleSeedDecisions` in
`types/vendor-identity-contract.ts` derives the required seed for every role from
the live catalog:

```
seed(role) = { c ∈ workforce.* ∩ catalog(role) : c is NOT department-scoped }
```

The subtraction *is* the decision. `has_perm(uid, oid, perm)` takes no target, so
**any** permission present in `org_role_permissions` is granted across the whole
organization. A department-scoped capability therefore must not be in the matrix:
putting it there would hand a department manager organization-wide management
authority, which is precisely what CP-094 forbids and precisely what ADMIN-012
removed from the resolver. The derived answer, asserted by test against the live
catalog:

| role | `workforce.*` in the matrix | posture |
|---|---|---|
| `owner`, `admin` | `view`, `manage`, `publish` | `seed` — organization administrator, CP-094's own sentence |
| `tour_manager`, `production`, `production_manager` | `view`, `manage`, `publish` | `seed` |
| `finance`, `finance_manager`, `viewer` | `view` | `seed` |
| `department_manager` | `view`, `publish` — **never `manage`** | `withhold_department_scoped` |
| `ticketing`, `ticketing_manager`, `worker` | none | `none` |

**Organization administrator default.** `owner` and `admin` carry `workforce.view`,
`workforce.manage` and `workforce.publish` organization-wide. Both already carry
the superseded `staff.manage` (`20250816132000:45-46`), which is **retained, not
removed** — additive only. This is CP-094 verbatim: "Organization administrators
retain organization-wide workforce authority."

**Department manager default.** `department_manager` carries `workforce.view` and
`workforce.publish` and **deliberately not `workforce.manage`**. Withholding is the
posture, not a gap: the matrix can only express organization scope and CP-094
requires department scope. The resolver agrees — the organization-level projection
of that role does not carry `workforce.manage` — so the two boundaries cannot
disagree. `workforce.view` remains organization-wide at the RLS layer; that residual
belongs to WFC-005/WFC-006, which own the read models, not to this decision.

**Provisioning mechanism: a migration, WFC-004's, under CP-051 manual additive
apply.** Three reasons, all of them about the matrix being a security control:

1. `roleperms_select ... using (true)` (`:112`) makes the matrix world-readable, so
   a tenant-configurable role matrix is a public configuration surface.
2. The matrix decides RLS. A per-tenant matrix means the grant set differs per
   organization — the CP-104 hazard at a new site, where "the chain says X" and
   "the target has X" stop being the same claim.
3. Role defaults are a product contract, not tenant data, so they belong in the
   chain where a replay reproduces them.

**Per-tenant delegation stays configuration**, and the split is deliberate: the
**default** role matrix is schema, the **deviation** from it is tenant data. The
existing mechanism is the per-member `org_members.permissions` array, already
constrained to the capability catalog by `org_members_permissions_check`
(`20260821180438:81-96`) and unioned by `has_perm` (`:143-149`).

**Gap or posture? Both, and the halves must not be conflated.**

- For `owner`, `admin`, `tour_manager`, `production`, `production_manager`,
  `finance`, `finance_manager` and `viewer`: a **genuine gap**. The catalog grants
  it, the route admits the caller, the database returns nothing. **CLOSED
  2026-09-26 by DB-016**, which seeded exactly this slice for exactly these roles.
- For `department_manager`: a **deliberate posture**. The authority is real,
  resource-scoped, and unsatisfiable from the matrix, because `has_perm` has no
  target argument. It is recorded here so nobody "fixes" it by widening the matrix,
  which is the one change that would actually violate CP-094. **Still in force**,
  and it is now load-bearing rather than hypothetical: `workforce_departments`
  exists, so the department-scoped authority is sourceable from the entity and the
  *only* remaining reason it is denied is that the matrix cannot express the scope.
  Widening the matrix would now hand out authority that the entity makes real.

**Operational consequence WFC-004 must not discover during an apply.**
`admin_acting_context_sessions.capability_version` is a digest over
`(role, array_to_string(org_role_permissions.perms))`
(`20260722002848:171,302`). Mutating a role's `perms` **invalidates every active
acting-context session** for members of that role. Land the whole matrix in **one**
migration so a single re-activation covers it, and verify the re-activation path
*before* applying.

**Residual, not changed here.** `isOrganizationCreator` / `isMasterAccount` return
`ALL_CAPABILITIES` in the resolver (`lib/auth/admin-capabilities.ts:462`) but
bypass `has_perm` entirely, so a creator or master with no `org_members` row is
authorized at the route and still reads nothing. The correct remedy is a
membership row, not a new bypass in RLS.

## 3. Vendor identity contract

### 3.1 The decision

> **A vendor is a company entity that belongs to exactly one organization. The
> vendor's identity is an entity id, never a name. A vendor record whose identity
> is a name is quarantined, not resolved.**

`classifyVendorOwnership` in `types/vendor-identity-contract.ts` implements this
fail-closed in a fixed decision order.

### 3.2 What the repository actually contains

**A vendor entity table now exists.** WFC-004 created `public.vendor_entities` and
`public.vendor_entity_aliases` on 2026-09-27
(`20260927100000_workforce_vendor_entity_home.sql:160-283`), at the **VEND-102**
field contract this section ratified — the only vendor table in this repository with
a reviewed ADR, a tested implementation, and archived DDL that live TypeScript
already produces rows for. `vendor_entities` carries `org_id uuid not null
references public.organizations (id)` (:162), `unique (id, org_id)` (:193), a
`status` CHECK over seven lifecycle values (:171-175), and a composite self-FK that
makes a cross-organization merge impossible by constraint (:199-201). That is
§3.1's decision — *an entity id owned by exactly one organization, never a name* —
expressed as DDL, and `vendor_entity_aliases` is finally a real target for
`VendorMergePlan.aliasesToRetain`, which had none.

**What had no vendor entity, and still has none.** The three real vendor tables
below, and what they can prove:

| Table | Org key | Identity column | Identity kind | Evidence |
|---|---|---|---|---|
| `event_vendor_requests` | `org_id` NOT NULL FK | `vendor_name` text | name only | `lib/database.types.ts:6534-6565` |
| `vendor_contracts` | `org_id` NOT NULL FK | `vendor_name` text | name only | `lib/database.types.ts:20338-20393` |
| `tour_vendors` | none | `vendor_name` text | name only | `lib/database.types.ts:19443-19500` |
| `staffing_agencies` | **none at all** | `name` text | name only | `lib/database.types.ts:17474-17496` |

So: vendor **contract ownership** is org-proven on two tables, and vendor **identity
is a name** on all of them — none of these four stores a vendor entity, which is
why `vendor_identity_name_only` still exists and still fires for a caller reading
any of them. A name cannot be shown to be the same company across two rows, so a
caller that has not been migrated to `vendor_entities` still cannot prove identity.
The quarantine is not lifted by the entity existing; it is lifted by a reader
selecting the entity, and **no live route reads `vendor_entities` yet** (CP-113
records that as a consequence of the deferred `vendors` / `org_vendors` decision,
not as an oversight).

`staffing_agencies` is the closest existing thing to a vendor company — a staffing
agency with its staff — and it has **no `org_id`, no `venue_id`, and no tenant
column whatsoever** (`lib/database.types.ts:17474-17523`;
`staffing_agency_staff` is `(agency_id, user_id, created_at)` only). It is also not
in the migration chain under that name, which is a separate finding recorded in §5.

### 3.3 Vendor identity tables referenced by live code but absent from the chain

**These are the tables DB-012 and ORG-007 must not assume exist.** Each is
referenced by a live route or by live service code and appears in neither the
migration chain nor `lib/database.types.ts` — re-measured 2026-09-26, still true.

#### 3.3.1 The complete reader list — seven sites, and the first delivery found four

The first delivery named two route files and missed three reader sites. An
undercounted outage list is worse than none, because it reads as complete. The
list below is **measured** by the test, which enumerates every
`.from(<missing table>)` under `app/api/**`:

| Table | Reader | Line |
|---|---|---|
| `vendors` | `app/api/admin/vendors/route.ts` | 20 |
| `org_vendors` | `app/api/admin/organization/vendor-governance/route.ts` | 17 |
| `vendor_compliance_documents` | `app/api/admin/organization/vendor-governance/route.ts` | 33 |
| `org_contracts` | `app/api/admin/organization/vendor-governance/route.ts` | 48 |
| `org_contracts` | `app/api/admin/organization/overview/route.ts` | **64** |
| `org_contracts` | `app/api/admin/organization/tours-health/route.ts` | **98** |
| `contract_signature_envelopes` | `app/api/admin/organization/vendor-governance/route.ts` | 64 |

Plus one non-route reader: `vendor_aliases` is named by
`lib/admin/vendor-identity.ts:280-286` as `VendorMergePlan.aliasesToRetain`, which
has no target table anywhere.

#### 3.3.2 What each reader actually does — the first delivery's claim was false

The first delivery stated that a route reading one of these "returns a
**PostgREST error, not an empty result**", and that "a UI that renders 'no vendors
found' is therefore not evidence that an organization has no vendors". The first
half is **withdrawn**: every live reader already handles the undefined-table code
`42P01` and fails *degraded*. This was false at the base SHA, not because a later
lane changed the routes — `git diff 16fb834f` over all four route files is empty.

| Table / reader | Behaviour on `42P01` | Consequence |
|---|---|---|
| `vendors` — `app/api/admin/vendors/route.ts:31-33`, and the thrown path at `:56-58` | returns `{ success: true, vendors: [], unavailable: true, unavailableReason: 'Vendors table not yet migrated.' }` | **CP-098-correct.** `components/admin/vendors/vendor-master-panel.tsx:58-108` already reads `unavailable`. This one is honest. |
| `org_vendors` — `vendor-governance:20` | `null` for the whole `vendorSummary` object, inside `safeCatch` | `null` is indistinguishable from "computed and null" in the response body |
| `vendor_compliance_documents` — `vendor-governance:40` | `null` for `expiringComplianceDocs` | same null-ambiguity |
| `org_contracts` — `vendor-governance:55` | `null` for `expiringContracts` | same null-ambiguity |
| `org_contracts` — `overview:69` | `null` for `expiringContractCount` | same; this is the organization health tile |
| `org_contracts` — `tours-health:103` | `null` for `contractRiskCount` | same; this is the tour contract-risk signal |
| `contract_signature_envelopes` — `vendor-governance:69` | `null` for `stalledEnvelopeCount` | same |
| `vendor_aliases` — `lib/admin/vendor-identity.ts:280-286` | not read at runtime | **silent data loss**: `planVendorMerge` *returns* the alias rows and no code path writes them, so a merge plan can be executed with its alias half unpersisted |

**The launch-relevant statement, corrected.** These are not user-visible outages —
the four routes already degrade. They are **permanently unavailable health and
governance signals that render as `null`**, and five of the seven are
indistinguishable from a genuine null. Under CP-098 that is the exact hazard the
program exists to prevent: an organization with expiring vendor contracts, lapsed
compliance documents, or stalled signature envelopes reads as "nothing to report".
WFC-003 fixes nothing here and creates nothing; DB-002 and the launch graph own
whether these tables ship.

### 3.4 The existing typed vendor identity logic, and its gaps

`lib/admin/vendor-identity.ts` is a real, tested, pure implementation (VEND-102,
354 lines; 143-line test) and this contract **adopts it rather than re-deriving
it**. It already defines:

- `normalizeVendorName` (`:49-58`) — NFKD, strips diacritics, lowercases, strips
  legal suffixes, strips punctuation
- `normalizePhoneDigits` (`:60-65`), `normalizeEmail` (`:67-72`)
- `vendorIdentityInputSchema` (`:74-89`) — a `.strict()` zod schema
- `VENDOR_DUPLICATE_HARD_THRESHOLD = 80` / `SOFT = 40` (`:43-45`)
- `scoreVendorDuplicate` (`:150-256`) — weights: exact normalized legal name 100,
  exact external accounting id 100, legal name + country 90, alias match 95, shared
  contact email 85, shared contact phone 75, display name + city 70
- `planVendorMerge` (`:292-346`) — survivor/absorbed/aliases, with
  `throw new Error("Merge is org-scoped only")` at `:302-304` when
  `org_id` differs. **This contract ratifies that org-scoping rule** and makes it
  the reason two organizations can never share one vendor entity.
- `canAcknowledgeDistinctDuplicate` (`:348-353`) — a hard duplicate may be
  acknowledged only with a reason of ≥3 characters

`lib/admin/vendor-domain.ts` independently encodes the same org-scoping invariant:
`previewVendorMerge` and `executeVendorMerge` both throw
`'Cannot merge vendors across organizations'` on `org_id` mismatch
(`:72-74`, `:85`).

**Gaps this contract records rather than resolves:**

1. `VendorIdentityRecord` (`:93-109`) declares `normalized_legal_name`, `aliases`,
   and `merged_into_id` against a table that does not exist. The logic is sound
   and tested; the storage is unwritten.
2. Two divergent `VendorCategory` vocabularies coexist: eight values in
   `vendor-identity.ts:8-17` versus sixteen in `vendor-domain.ts:23-26`. They are
   not reconcilable by inference.
3. `scoreVendorDuplicate` returns the **maximum** signal weight, not a sum
   (`:242`). Two independent 70-weight signals therefore do not reach the 80 hard
   threshold. That is a deliberate-looking choice, but it is undocumented as
   intentional.
4. `findVendorDuplicateMatches` (`:258-275`) filters out `merged_into_id` and
   `status === 'inactive'` rows, but it is **not** org-filtered — it trusts the
   caller to pass one organization's rows. A caller that passes a cross-org array
   gets a cross-org merge plan that `planVendorMerge` will then reject at `:302`.
   Safe, but the failure is late.

### 3.5 Duplicate resolution: quarantine, not merge

A vendor identity that scores at or above the hard threshold against one or more
existing vendors, with no explicitly approved merge, is
`vendor_identity_ambiguous` and is **terminal**. This is `lib/admin/vendor-identity.ts`'s
own creation block (`:42-45`, `:348-353`) expressed as a return value instead of a
thrown error, so a lane can branch on it. CP-096's "no automatic merge of visually
similar legacy shifts" is the same principle applied to vendors.

## 4. Ambiguous-ownership quarantine

### 4.1 Principle

Quarantine is **fail-closed and terminal** until a human or an explicit
reconciliation resolves it. A quarantine code is never downgraded to a warning and
never cleared by inference.

This is the pattern already proven in this repository, not an invention:
`venue_identity_bridges` carries
`provenance text not null default 'backfill' check (provenance in ('backfill','runtime','manual'))`
(`20260823010000_venue_identity_bridge.sql:40-41`) and its backfill deliberately
leaves malformed values for a reconciliation report "never silently coerced" (same
file, `:76-77`), exposing `malformed_json_values` and `dangling_orgs` counters in
`venue_identity_bridge_audit` (`:120-136`). WFC-003 copies that discipline and WFC-004
should copy that schema shape.

### 4.2 The vocabulary

`WORKFORCE_QUARANTINE_CODES`, asserted by test:

| Code | Meaning | Terminal |
|---|---|---|
| `org_key_missing` | no organization key of any kind | yes |
| `org_key_conflict` | two or more keys present and they disagree | yes |
| `org_key_dangling` | key present, target row not proven to exist | **no** — a later read may clear it |
| `org_key_cross_tenant_only` | only a venue/artist key; no org was ever established | yes |
| `organizer_profile_unbridged` | `organizer_accounts` row exists, `ops_org_id` is null | yes |
| `membership_not_active` | org key proven, `org_members.status != 'active'` | **no** — may become active |
| `membership_absent` | no `org_members` row for that user in that org | **no** — may be invited |
| `vendor_identity_name_only` | vendor identity is a name, not an entity | yes |
| `vendor_table_unproven` | vendor table absent from the migration chain | yes |
| `vendor_identity_ambiguous` | hard duplicate with no approved merge | yes |
| `department_not_an_entity` | department was free text, never became an entity | yes |

Only `org_key_dangling`, `membership_not_active`, and `membership_absent` are
retryable, and only because a legitimate later event can change their truth. The
terminal ones require a human decision.

### 4.3 The three rules, stated once

1. **Zero usable keys → `org_key_missing`.** Never default to the actor's first
   organization. `lib/admin/resolve-authorized-org.ts:72-76` already documents this
   for the logistics path: "It never infers an organization from membership
   ordering, which is ambiguous for multi-org admins." That existing rule is
   ratified program-wide.
2. **Disagreeing keys → `org_key_conflict`.** Never a merge, never a
   most-recently-updated winner, never a "most likely" default.
3. **A cross-tenant or unproven key is ignored, not resolved.** It is recorded in
   `ignoredKeys` so the reconciliation report can see it, and it never contributes
   an organization id. A record whose only keys are cross-tenant quarantines as
   `org_key_conflict` with the observed keys attached, because that is what the
   evidence shows: something was there, and it was not an organization.

## 5. Every ambiguity recorded as quarantined rather than resolved

These are the honest gaps. Each names what is unknown and who owns it.

| # | Ambiguity | Evidence | Disposition |
|---|---|---|---|
| 1 | No vendor entity table exists anywhere in the chain | `rg "create table.*vendor" supabase/migrations` → only `vendor_contracts`, `event_vendor_requests`, `tour_vendors` | WFC-004 creates it; until then `vendor_identity_name_only` |
| 2 | Six vendor tables are read by live code but absent from the chain, at **seven** reader sites | §3.3.1 table | `vendor_table_unproven`, terminal; five of seven render as an ambiguous `null` |
| 3 | `vendors` vs `org_vendors` — two different names for what is presumably one entity, and neither exists | `app/api/admin/vendors/route.ts:20`; `app/api/admin/organization/vendor-governance/route.ts:17` | **Not resolved.** Guessing they are one table is exactly the merge CP-096 forbids. WFC-004 decides. |
| 4 | `staff_members` has five competing nullable tenant keys | `lib/database.types.ts:16470-16502` | `org_id` is canonical; the rest are aliases/cross-tenant/unproven per §1.2 |
| 5 | `entity_type` says `'org'`; `employer_entity_type` says `'organization'` | `20260602120000:7` vs `20260714015225:146` | Both spellings in the alias map, keyed by qualified name |
| 6 | `org_members` has two revocation representations; only `status` is honored | `20260821180438:57,76-78`; no migration sets `revoked_at` | Mandate `status='active'`; WFC-004 reconciles the column |
| 7 | `department_manager` department scope | `lib/auth/admin-capabilities.ts:199-206,319-323,481-487`; capability side CLOSED by ADMIN-012; **entity side CLOSED 2026-09-27 by WFC-004** (`20260927100100_workforce_departments_and_memberships.sql:183-350`) | State is now `closed` (measured, not stored). WFC-005 still owns the `DepartmentManagementLookup` and the department-targeted guard — `closed` is not `PROVEN`. **Superseded states kept: `MANAGER_SCOPE_GAP` (the finding, retired) and `capability_expressed_entity_unsourced` (the 2026-09-26 state, still reachable and still asserted reachable). See §2.4** |
| 8 | No department table exists; every `department` column is free text | `lib/database.types.ts:16476,4556,3735,9144,12431,15913,16727`; zero `create table … departments` in the chain (measured) | `department_not_an_entity`; WFC-004 |
| 9 | `staff_members` RLS history | `20250818120000:362,396,427` created three permissive policies; `20260823210000:267,293-313` drops them; `20260926150000:145-147` drops them again and creates three org-scoped ones | **CORRECTED 2026-09-26.** The first delivery's "all three survive and any authenticated user can read any org's rows" is withdrawn per the CP-104 correction block. The live shape is employer-scoped plus three org-scoped policies gated on a permission nobody holds (§2.5) |
| 10 | `staff_members` has no fail-closed scope CHECK, unlike `staff_shifts` | `20260821031214:51-56` (shifts) vs `staff_members_status_check` at `20260714015225:70` as the only one | Recorded. WFC-004 |
| 11 | `staff_members_org_user_key` is partial — null `org_id` rows are unconstrained | `20260821031214:86-88` | Do not cite as general uniqueness |
| 12 | `venues` has no `org_id`; `venues.account_id` has no FK; `venues_v2` has neither | `lib/database.types.ts:22196-22249,22224` | `venues.account_id` is `unproven` |
| 13 | `tour_vendors` has no org key at all and `vendor_account_id` has no FK | `lib/database.types.ts:19443-19500` | Tour-scoped only; org must be derived through `tours.org_id`, else quarantine |
| 14 | `staffing_agencies` / `staffing_agency_staff` have no tenant column | `lib/database.types.ts:17474-17523`; not in the migration chain under that name | Vendor-company-adjacent and unowned by any tenant. WFC-004 must decide whether these are vendors. |
| 15 | Two `VendorCategory` vocabularies (8 vs 16 values) | `lib/admin/vendor-identity.ts:8-17` vs `lib/admin/vendor-domain.ts:23-26` | Both preserved; not merged. WFC-004. |
| 16 | `scoreVendorDuplicate` takes max weight, not sum | `lib/admin/vendor-identity.ts:242` | Documented as-is. A weighting change is a product decision, not WFC-003's. |
| 17 | `findVendorDuplicateMatches` is not org-filtered | `lib/admin/vendor-identity.ts:258-275` | `planVendorMerge:302-304` is the backstop. Callers must pass one org. |
| 18 | `org_members` has no `department`/`workforce` link; a manager is only a `role` string | `lib/database.types.ts:12618` | Manager *authority* is role+capability; manager *of a department* needs WFC-004 schema. |
| 19 | `unified_staff_roster` is a **view** over `staff_members`, not a table | `20260602120000_unified_staff_roster.sql:39-53` | Read-only; never a write target |
| 20 | `organizer_accounts.ops_org_id` is nullable, so a profile can have no tenant | `lib/database.types.ts:12938` | `organizer_profile_unbridged`, terminal |
| 21 | `get_active_organizer_account_for_org` returns `limit 1` with no uniqueness guarantee on `(ops_org_id, is_active)` | `20260910000001:41-44` | A multi-profile org is unproven; not resolved here |
| 22 | `employment_assignments` has no `org_id`; org is reachable only indirectly | `lib/database.types.ts:4552-4578` | `employer_entity_id` where type is `'organization'` is the only proven path; `organizer_id` is a two-hop path through `organizer_accounts.ops_org_id` |
| 23 | **A user's active membership is used to own their `staff_members` row, and the inferred value is written back** | `lib/admin/workforce-authority.service.ts:201-216` | Classified `bridge`; quarantined, not ratified. §1.2c. WORK-102 owns the service, WFC-004 owns whether the derivation is ever a provable backfill source |
| 24 | **Two live sites resolve the organization itself from membership ordering** | `lib/admin/calendar/aggregate.ts:1013-1019`; `lib/admin/tour-event-operations.service.ts:751-775` | Violates §4.3 rule 1, which is ratified from `resolve-authorized-org.ts:72-76` in the same directory. Handoff to work/admin |
| 25 | **Seven `org_members` read sites do not filter on `status`, including the workforce authority boundary** | `WORKFORCE_MEMBERSHIP_PREDICATE.notEnforcedBy`; measured by test | Fail-open relative to §2.3's rule. Handoff to WORK-102 / admin. WFC-003 records the predicate; it does not own those files |
| 26 | **Seven roles the catalog defines had no `org_role_permissions` row at all** (DB-013, 2026-09-26) | `viewer`, `worker`, `ticketing`, `ticketing_manager`, `finance_manager`, `production_manager`, `department_manager`; `has_perm` returns false for every permission when the row is missing (`20260821180438:139`) | **RESOLVED 2026-09-26 by DB-016** (`20260926200000_org_role_permissions_workforce_seed.sql`), which wrote a row for all twelve. The non-workforce permissions those roles still lack is a **separate, still-open** question this contract does not answer (HF-WFC-004 residual gap #1) |

## 6. Handoff to WFC-004 (the only lane that turns this into schema)

WFC-004 authors migrations. It consumes this document and does **not** re-derive it.

> **Delivery status, 2026-09-27.** WFC-004 has landed items 5, 6, 9 and 10 —
> `workforce_departments` + managers + memberships (`20260927100100`), the vendor
> entity home (`20260927100000`), and the reconciliation substrate
> (`20260927100200`); **DB-016** landed item 10's role-matrix seed
> (`20260926200000`). The section is kept in full because it is the
> specification those migrations implement, and because a reader checking whether
> an item is satisfied needs the item, not only the verdict. Items **1–4, 7 and 8**
> are requirements on every workforce table, not single deliverables, and remain
> live: item 4 (revocation truth is `org_members.status`, not `revoked_at`) is
> **unresolved** and is ambiguity 6.

**Must hold, additively, under CP-051 (manual, additive, one at a time; no
`supabase db reset`, no blanket replay):**

1. Every workforce table carries a **NOT NULL** `organizations.id` FK. Not
   nullable, and not `on delete set null` — see ambiguity 10 for why the existing
   nullable pattern is unsafe.
2. A **validated** `CHECK` in the shape of `staff_shifts_requires_scope`
   (`20260821031214:51-56`), so a row cannot be written without a provable tenant.
3. Manager validation reuses `org_members` + `org_role_permissions` and
   `has_perm(uid, oid, 'workforce.manage')`. It does **not** introduce a second
   membership table, and it does not infer activity from `staff_members.status`.
4. Revocation truth is `org_members.status`. Resolve ambiguity 6 explicitly.
5. **A `department` entity with a platform-unique id, bound to exactly one
   `organizations.id`; an accountable-manager relation, one manager per
   department; and a membership relation separating the primary department from
   secondary memberships.** This replaces the first delivery's item 5. The
   *capability* side of CP-094 is already delivered by ADMIN-012 and needs nothing
   from WFC-004; the schema side is the whole of what is left, and until it lands
   every `department_manager` is denied `workforce.manage` everywhere, which is
   fail-closed and intended. Cross-organization denial at
   `departmentScopeDenial` depends on the department id being globally unique and
   org-bound — a same-id department in two organizations would be
   indistinguishable at that boundary, and no resolver test can prove a property of
   a table that does not exist. The free-text `department` columns are a forbidden
   workaround (`DEPARTMENT_SCOPE_FORBIDDEN_WORKAROUND`).
6. A vendor entity table with: entity id, `organizations.id` NOT NULL FK, and the
   VEND-102 fields from `lib/admin/vendor-identity.ts:93-109`
   (`normalized_legal_name`, `aliases`, `merged_into_id`). Vendor-to-org ownership
   is one organization per vendor entity — ratifying `vendor-domain.ts:72-74,85`.
   `vendor_aliases` needs a real target table or `planVendorMerge`'s
   `aliasesToRetain` half stays unpersisted (§3.3.2).
7. An explicit quarantine table in the `venue_identity_bridges` shape: a
   `reason`/`code` column constrained to `WORKFORCE_QUARANTINE_CODES`, a
   `provenance`-style column constrained like `20260823010000:40-41`, and a
   reconciliation view counting each code — the
   `venue_identity_bridge_audit` pattern at `:112-136`.
8. Backfill only from provable sources, in the style of `20260821031214:10-28`.
   Rows that cannot be proven stay quarantined. **Do not** merge visually similar
   legacy rows (CP-096). A user's `org_members` membership is **not** a provable
   source for a `staff_members.org_id` (§1.2c, ambiguity 23).
9. A `department` entity replaces every free-text `department` column by explicit
   link, not by value comparison.
10. **Seed `org_role_permissions` with the `workforce.*` slice derived in §2.5.2,
    in ONE forward-only migration, under CP-051 manual additive apply.** The
    decision is WFC-003's under CP-102; the SQL is WFC-004's and WFC-003 does not
    author it. Three requirements that are easy to get wrong:
    - the slice is `catalog(role) ∩ workforce.*` **minus** the department-scoped
      capabilities, so `department_manager` gets `workforce.view` and
      `workforce.publish` and **never** `workforce.manage`;
    - retain the existing `staff.manage` entries; additive only, no removals;
    - `admin_acting_context_sessions.capability_version` digests
      `org_role_permissions.perms` (`20260722002848:171,302`), so the apply
      invalidates every active acting-context session for the affected roles.
      Land all roles in one migration and verify the re-activation path before
      applying, not after.
    Post-condition to assert inside the transaction, in the style of
    `20260926150000:273-361`: for every role in `ROLE_DEFAULT_CAPABILITIES`
    (`lib/auth/admin-capabilities.ts:123-138`), the seeded `workforce.*` set equals
    what `resolveEffectiveAdminCapabilities` returns for that role with no target
    and no department authority. That single assertion is what keeps the two
    vocabularies from drifting again, and it is the same rule the WFC-003 test
    derives (`deriveWorkforceRoleSeedDecisions`).

**DB-012 and ORG-007:** this document is the input. Do not author vendor identity,
vendor-to-organization ownership, or manager authority. If the schema you need is
not specified here, the gap is a handoff back to WFC-003, not a local decision.

**WFC-005 / WFC-006 (read models and services):** use
`resolveWorkforceOrganizationKey`, `validateActiveManagerMembership`,
`classifyVendorOwnership`, and `proveSameOrganization` from
`types/vendor-identity-contract.ts`. Do not re-derive.

**WFC-008 through WFC-010 (admin UI):** the `not_authorized` state must not leak
whether a quarantined record exists. A quarantine is a server-side outcome, not a
UI state.

## 7. Verification performed

Every command below was run as an individual step. **No `verify:feature` tier is
claimed green**, for the reason in the task record: `scripts/verify.mjs:44` runs
`npm run typecheck` unconditionally, ignoring `--changed`, and
`lib/database.types.ts` (~25,600 lines) exceeds this machine's heap. That is
CP-106, owned by RELEASE-010. Verbatim output is in
`docs/engineering/tasks/active/WFC-003.json`.

| Step | Result |
|---|---|
| `npx vitest run __tests__/admin/workforce-identity-contract.test.ts` | **65 passed** on 2026-09-26 (33 more than the first delivery's 32); **77 passed** on 2026-09-27 after the CP-119 reconciliation |
| negative control: `WFC003_CAPABILITIES_SOURCE=<mutant> npx vitest run …` | **4 failed** — see §7.1 |
| negative control: superseded value re-inserted as the final assertion | **1 failed** (`expected 'closed' to be 'capability_expressed_entity_unsourced'`) — see §7.1.1 |
| negative control: whole suite against a simulated pre-WFC-004 chain | **both negative controls green**, 3 state assertions red — see §7.1.1 |
| `NODE_OPTIONS='--max-old-space-size=8192' npx tsc -p tsconfig.wfc003-slice.json --noEmit` | pass, no output |
| `npx eslint types/vendor-identity-contract.ts __tests__/admin/workforce-identity-contract.test.ts` | pass, no output |
| `npx vitest run __tests__/admin` | see task record |
| `npm run agents:validate` | see task record |
| `npm run check:admin-route-registry` | see task record |
| `npm run check:admin-audit` | see task record — pre-existing failure re-verified at base SHA |
| `npm run verify:feature -- --changed` | see task record |

### 7.1 The negative control, in detail

The point of the second pass is that the §2.4 state is *measured*. That is only
worth something if the measurement can be shown to fail, so:

- **Property made false:** a copy of `lib/auth/admin-capabilities.ts` with the
  single line `  'department',` removed from `ADMIN_CAPABILITY_TARGET_TYPES`
  (a one-line diff, written to `/tmp`, never over a repository file).
- **Suite went red:** 4 tests failed, including the primary assertion —
  `classifies CP-094 as expressed-but-unsourced` received `'not_expressible'`
  instead of `'capability_expressed_entity_unsourced'` — and
  `reads the scope catalog … and it agrees with the live module` reported the
  catalog missing `department`.
- **Restored:** the env override unset, i.e. the suite measuring the real file
  again. **65 passed.** `lib/auth/admin-capabilities.ts` was never written to;
  its mtime predates this session and its content hash is unchanged.
- **Permanently in the suite:** three negative-control tests that mutate the
  resolver source in `/tmp` and assert the classifier reports `not_expressible`,
  plus one that proves the `closed` state is reachable so the middle state is a
  real verdict rather than the only answer the classifier can give.

Note honestly which assertions moved and which did not: the mutant red-flags the
**measurement** path, and the four `live resolver` capability assertions stayed
green because they import the module rather than read its text. That is the
intended split — the behavioural assertions are guarded by a real import, the
state classifier is guarded by a real parse, and the
`parse === import` test means neither can drift without the other noticing.

#### 7.1.1 The negative control's own defect, and the fix — 2026-09-27

The last line of that negative control was:

```ts
// And the real file is still what the suite measures.
expect(assessManagerScopeClosure(measureManagerScope()).state).toBe(
  'capability_expressed_entity_unsourced',
)
```

**That is a hardcoded expected verdict inside the one test whose entire purpose is
to contain no hardcoded verdict**, and it failed on 2026-09-27 for exactly the
reason the `MANAGER_SCOPE_GAP.currentState` literal was retired: the truth moved
(WFC-004 created the entity) and the suite produced a stale red instead of asking a
question. The mutant loop above it is correct — it mutates the input and asserts
the verdict becomes `not_expressible` — but the final line re-introduced the
literal one indirection away. Swapping it for `'closed'` would have restored the
same anti-pattern one generation later.

**What it asserts now, which is the mechanism and not the value:** that the mutant
override was restored (`WFC003_CAPABILITIES_SOURCE` is undefined and
`capabilitiesSourcePath()` is the real resolver); that the retargeted
measurement's own inputs equal the real file's parsed content
(`departmentScopeTypePresent` and the whole department-scoped role map); that the
chain half of the measurement is unchanged by an override that only retargets the
resolver; that the resulting verdict is a member of the classifier's declared
three-state vocabulary; and that it **differs** from the mutants' verdict, so the
retarget demonstrably changed something. No expected verdict appears.

**Proven to survive a verdict change, in both directions**, on 2026-09-27:

| Demonstration | Result |
|---|---|
| The superseded value re-inserted as the final assertion | **1 failed** — `expected 'closed' to be 'capability_expressed_entity_unsourced'`, with the five mechanism assertions before it all passing. The value form fails on a legitimate move; the mechanism form did not |
| The whole suite run against a **simulated pre-WFC-004 chain** (the measurement forced to `departmentEntityExists: false`, i.e. the truth of 2026-09-26) | **both negative controls GREEN.** 3 tests failed, and all three are the *value* assertions that must alarm when the state moves: the entity-exists assertion, the `closed` classification, and criterion 2's end-to-end proof. That split is the design: a mechanism assertion survives the move, a state assertion refuses to be re-adopted silently |
| The suite as it now stands, against the real chain | **77 passed** |

The same demonstration found one more instance of the anti-pattern in this
contract's own suite: a test named *"the classifier is a pure function of the
measurement"* also asserted today's verdict from the real measurement. It was
rewritten to compare four **explicit synthetic** measurements that differ in one
bit, so purity and sensitivity are tested without pinning any current answer.
