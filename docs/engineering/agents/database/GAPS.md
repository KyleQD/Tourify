# Database gaps

Audit task `DB-001` (read-only). This list reconciles the initial audit with
the completed DB-002/003/004/007 work. Every open item is triaged as **missing**
(artifact/process absent), **incomplete** (started or evidenced but not closed),
or **improve** (working direction exists but needs hardening or cleanup).

## M — Missing

### M-1. Trigger and data-propagation inventory

- **Triage**: missing
- **Evidence/location**: `docs/engineering/generated/database-objects.md`
  lists trigger functions with ordinary functions, but there is no generated
  relation of trigger → table → side effects. Relevant bodies include updated-at,
  engagement counts, roster sync, notification fanout, and post-appearance
  revision guards.
- **Impact**: counter repair, deletion/erasure, and concurrency reviews require
  repeated per-migration discovery.

### M-2. Table-by-table RLS coverage regression

- **Triage**: missing
- **Evidence/location**: static maps report 418 tables and 1,287 detected
  policies (`docs/engineering/generated/database-schema.md`,
  `docs/engineering/generated/database-objects.md`), while
  `docs/engineering/generated/permissions.md` warns it is not an authorization
  audit. No matrix asserts RLS enabled, policy operation coverage, restrictive
  policy use, or view exposure for every deployed table.
- **Impact**: a new table or policy can bypass the intended tenant/persona
  boundary without a failing check.

### M-3. FK/hot-path index and policy-plan coverage

- **Triage**: missing
- **Evidence/location**: `docs/DEVELOPMENT_BACKLOG.md` WS-3.2 calls out missing
  FK indexes, telemetry retention/partitioning, and initplan rewrites;
  `20260821183357_job_seat_foreign_key_indexes.json` is only an isolated
  validation artifact. No complete index or query-plan inventory exists.
- **Impact**: lock contention and latency risk at production volume.

### M-4. Deployed-catalog versus source-chain boundary test

- **Triage**: missing
- **Evidence/location**: DB-007 proves a 287/287 local apply, but the current
  source chain has 289 files; `.agents/organization-ticketing/INVENTORY.md`
  records undeployed/incompatible API tables and richer live-only promotion
  infrastructure. No automated catalog comparison covers this boundary.
- **Impact**: schema drift can surface as false-zero or runtime failures.

### M-5. GDPR erasure coverage map

- **Triage**: missing
- **Evidence/location**: WS-2.4 in `docs/DEVELOPMENT_BACKLOG.md` requires an
  inventory of tables without `auth.users` foreign keys; the current domain
  records only the account-deletion route and selected survivor scrubbing, not
  a complete table/retention disposition.
- **Impact**: user data may remain in unlinked content, audit, telemetry, or
  integration tables after account deletion.

## I — Incomplete

### I-1. Current source versus live-apply evidence

- **Triage**: incomplete
- **Evidence/location**: `supabase/migrations/` has 289 files, while DB-007's
  latest local proof is 287/287 (`docs/engineering/tasks/completed/DB-007.json`).
  The two-file delta is not covered by that proof. The migration-chain and
  validation checks pass against the source tree, not the live catalog.
- **Impact**: the current local target cannot yet be claimed reconciled to the
  current source chain.

### I-2. Validation pipeline is not at production evidence

- **Triage**: incomplete
- **Evidence/location**: `docs/engineering/migration-validation/` has 106
  migration manifests: 99 `planned`, 2 `isolated_validated`, and 5
  `staging_validated`; none is `production_verified`. `npm run
  check:migration-validation` passes, but status progression is unfinished.
- **Impact**: release gates G2/G7 remain unproven even where apply claims exist.

### I-3. Production-status representation for DB-002

- **Triage**: incomplete
- **Evidence/location**: `docs/engineering/tasks/active/DB-002.json` reports
  Management API application and postflight probes for the four staged
  security/money migrations, while their manifests remain only
  `staging_validated`. The evidence needs release-owner reconciliation rather
  than another SQL change.
- **Impact**: operators cannot distinguish “applied,” “staging validated,” and
  “production verified” from the durable records.

### I-4. Agent service-principal rollout

- **Triage**: incomplete
- **Evidence/location**: `supabase/migrations/20260908130000_agent_service_identities.sql`
  and `docs/engineering/tasks/completed/AUTH-AGENT-001.json` establish the
  directory and credential foundation; its validation manifest remains planned,
  and `docs/engineering/agents/database/BACKLOG.md` still calls for an isolated
  verification, approved provisioning, and first route wiring.
- **Impact**: the service-principal architecture is not yet an operationally
  proven path.

### I-5. Ticketing schema reconciliation

- **Triage**: incomplete
- **Evidence/location**: `DB-005` is active; the ticketing manifests
  `20260821000000` through `20260821031214` remain planned. The legacy
  inventory (`.agents/organization-ticketing/INVENTORY.md`) reports incompatible
  columns, undeployed tables, live-only promotion infrastructure, and overlapping
  grants/policies.
- **Impact**: ticketing APIs and admin read models cannot yet rely on one
  verified deployed contract.

### I-6. Events table strategy and domain policy conventions

- **Triage**: incomplete
- **Evidence/location**: `DB-006` is active; `.agents/plans/phase-0-data-integrity.md`
  documents planner writes to `events` while admin surfaces read `events_v2`.
  `docs/engineering/agents/database/DECISIONS.md` now records chain and type
  conventions, but not the final events choice or a complete RLS/view convention.
  The DB-006 six-caller cutover to `events_v2` is complete in code, and the
  2026-09-21 checkpoint classifies all 52 remaining legacy callers (14
  compatibility-gated, 38 deferred with owners) in `STATE.md`; the local
  classification acceptance gap is closed.
- **Impact**: hosted staging/production cutover evidence (CP-053) and the 38
  deferred callers' named-owner reviews remain before runtime probing and
  inconsistent authorization assumptions can be fully retired.

## R — Improve

### R-1. Legacy apply instructions and historical SQL retirement

- **Triage**: improve
- **Evidence/location**: DB-003 correctly classifies archives, backup SQL, and
  root SQL as historical, but `supabase/README.md` still instructs manual
  dashboard copy/paste and the historical directories remain present.
- **Impact**: operators may follow an obsolete apply path or mistake historical
  source for active schema.

### R-2. Static map separation of active versus historical objects

- **Triage**: improve
- **Evidence/location**: `docs/engineering/generated/database-objects.md` contains
  hundreds of latest-create entries sourced from `supabase/migrations/archive/`
  while `database-schema.md` aggregates active and archived files. The maps
  correctly warn they are static indexes, but separate active/deployed views
  would make review safer.
- **Impact**: archived definitions can be mistaken for live objects or policy
  coverage.

### R-3. Policy duplication and churn cleanup

- **Triage**: improve
- **Evidence/location**: the 1,287-policy static scan includes legacy and newer
  policy names for overlapping domains such as music, accounts, profiles, events,
  posts, and ticketing (`docs/engineering/generated/database-objects.md` and
  archived migration sources).
- **Impact**: review and supersession are harder, with greater risk of a stale
  permissive policy surviving.

### R-4. Security-definer/view regression checklist

- **Triage**: improve
- **Evidence/location**: DB-002 records pinned-search-path checks for the staged
  RPCs, and the Supabase security checklist requires invoker-safe views and
  SELECT policy coverage for UPDATE. There is no reusable regression artifact
  that enforces those rules for every new migration.
- **Impact**: future changes can silently reintroduce recursion, privilege, or
  view-exposure defects.

### R-5. Local Supabase client/type copy cleanup

- **Triage**: improve
- **Evidence/location**: DB-004 resolved the generated type source:
  `lib/database.types.ts` is canonical and `types/supabase.ts` re-exports it;
  `types/database.types.ts` is hand-authored view models. The independent
  placeholder files `app/admin/dashboard/components/types/supabase.ts` and
  `app/admin/dashboard/components/lib/supabase.ts` remain.
- **Impact**: consumers can still accidentally import stale placeholder shapes
  or create clients outside the canonical boundary.

### R-6. Ticket credential issuance atomicity

- **Triage**: improve
- **Evidence/location**: WS-1.2 in `docs/DEVELOPMENT_BACKLOG.md` and DB-002
  evidence cover transactional settlement/tour-delete RPCs and a compensating
  box-office saga, but credential/QR issuance still occurs app-side.
- **Impact**: box-office and transfer flows cannot yet be one SQL transaction.

### R-7. Dynamic-table event callers escape the literal caller scan

- **Triage**: improve
- **Evidence/location**: DB-006's 52-file legacy caller inventory is built on
  literal `.from('events')` / `.from('artist_events')` scans plus the recorded
  dynamic resolver. Repository-wide dynamic-table reads in
  `app/api/events/_lib/event-reference.ts` (covered), `app/api/events/[id]/page/route.ts`
  (DB-009 resolver consumer, covered), and `lib/services/event-page.service.ts`
  (dynamic `EventTableName` including `artist_events`/`events`; no active
  importer found outside the `lib/supabase/service-role-legacy-imports.json`
  mapping artifact) are not visible to the literal scan.
- **Impact**: future dynamic-table callers could bind to legacy event tables
  without appearing in the canonical caller inventory; a parameterized
  table-name scan or import graph is needed to keep the inventory complete.

## Resolved during the audit window

- DB-003 established the active chain as the only apply source and reconciled the
  local baseline.
- DB-004 established the canonical generated type path and drift gate.
- DB-007 restored the post-styles/account-follows family and verified the local
  schema through 287 migrations.
- DB-002 advanced the four staged security/money migrations to
  `staging_validated` and recorded RLS/RPC probes.
- DB-006 (2026-09-21) closed the local caller-classification acceptance gap:
  all 52 remaining legacy `events`/`artist_events` callers are classified (14
  compatibility-gated, 38 deferred with owners) in `STATE.md`.

## Counts

- **Missing:** 5
- **Incomplete:** 6
- **Improve:** 7
- **Total open items:** 18
