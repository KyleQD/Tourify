# Manual SQL Runbook — Work Mode Worker Actions

**State: REVIEWED ACTIVE MIGRATION EXISTS; HOSTED APPLY STILL BLOCKED. Keep
`FEATURE_WORK_MODE_WORKER_ACTIONS` disabled.** The former
`supabase/migrations/20260728185712_work_mode_worker_actions.sql` is absent from
active migrations. Its copy is in
`supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/`, where
`MANIFEST.csv` marks it `local_only_unapplied`. A 2026-07-28 operator report
claims successful manual application, but this repository has no project ID,
hosted migration ledger, or postflight evidence tying it to isolated staging.
The archive copy is review material, not an instruction to replay a local-only
migration. The active `20260823170000_worker_checkin_contract.sql` creates
canonical shift RPCs; it does not create the two append-only tables used by
`/api/work-mode/assignments/[id]/actions`.

DB-010 now adds a reviewed forward migration,
`supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql`,
plus the contract check
`supabase/tests/db010_worker_actions_scope_contract.sql` and migration
validation manifest
`docs/engineering/migration-validation/20260922155356_worker_actions_scope_reconciliation.json`.
This active migration creates only append-only evidence tables, indexes, grants,
comments, and RLS policies. It does not backfill, delete, reset, or enable the
worker actions feature flag.

Before enablement, database and release owners must identify the isolated
staging Supabase project and deployment SHA, compare hosted migration history
and schema with active migrations, apply the reviewed active migration through
the CP-051 manual process if needed, and record the project reference, checksum,
operator, time, deployed SHA, and disabled flag state in WORK-006. Do not infer
application from the old report or hostname.

The archived acknowledgement policy checks publication scope only by
`event_id`, including the case where both event IDs are null. Work Mode also
serves tour-scoped and audience-filtered packets. Data-boundary review must
prove direct authenticated inserts cannot acknowledge a packet outside the
worker's event, tour, or intended audience before this flag can be enabled.
The API read-model check alone is not that proof.
The archived check-in policy also compares only `employment_assignments.event_id`;
the live read model may derive an event from `event_v2_id` or `staff_shifts.event_id`.
The new migration uses `coalesce(event_v2_id, event_id,
staff_shifts.event_id)` for that identity chain. Its acknowledgement policy
requires every populated packet event and tour dimension to match the
assignment, rejects mixed-org event/tour packets, and checks `visible_to`,
targeted audience rows, and `required_permission` at the data boundary. These
remain source-contract claims until isolated-staging persona probes pass.

## Preconditions

1. Confirm the exact Supabase project and environment.
2. Export hosted migration history and compare it with the local migration list.
   Record whether `20260728185712` exists in the hosted ledger and whether
   either append-only table already exists. Preserve existing rows.
3. Confirm `public.employment_assignments` and
   `public.work_mode_publications` exist and use UUID primary keys.
4. Record these baseline counts and the current staging deployment SHA:

```sql
select status, count(*)
from public.employment_assignments
group by status
order by status;

select count(*) as check_in_enabled
from public.employment_assignments
where status in ('confirmed', 'active')
  and coalesce((permissions ->> 'check_in_out')::boolean, false);

select status, publication_type, count(*)
from public.work_mode_publications
group by status, publication_type
order by status, publication_type;
```

Test first in verified isolated staging. The archived SQL proposed a five-second
lock budget and a 60-second statement budget; retain these or stricter approved
limits in any reviewed forward migration.

## Proposed schema effect (archive reference only)

- Adds two append-only tables for publication acknowledgements and check-in/out
  events if they do not already exist. Preserve any existing rows.
- Adds four indexes and four assignment-scoped RLS policies. The
  acknowledgement policy needs the event/tour/audience review above.
- Updates or backfills no existing row.
- Grants authenticated users `SELECT` and `INSERT` only. Anonymous users receive
  no access.

## Execution order

1. Keep `FEATURE_WORK_MODE_WORKER_ACTIONS` unset or disabled during SQL execution.
2. Apply `20260922155356_worker_actions_scope_reconciliation.sql` through the
   operator-controlled deployment process, one migration at a time. Verify its
   SHA-256 against the manifest. Do not replay the archive.
3. Record the resulting hosted migration ledger, postflight, and data-boundary
   persona evidence.
4. Set `FEATURE_WORK_MODE_WORKER_ACTIONS=1` only on isolated staging after all
   checks pass; record the enabled deployment SHA and rerun the worker/manager UI.

Do not run a reset, restore, seed reload, schema replacement, or destructive
cleanup.

## Postflight

Run both `supabase/tests/db010_worker_actions_scope_contract.sql` and
`supabase/tests/db010_worker_actions_contract.sql` first. They assert the
catalog contract; a pass does not replace the persona probes below.

```sql
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'work_mode_publication_acknowledgements',
    'work_mode_check_in_events'
  )
order by c.relname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'work_mode_publication_acknowledgements',
    'work_mode_check_in_events'
  )
order by table_name, grantee, privilege_type;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'work_mode_publication_acknowledgements',
    'work_mode_check_in_events'
  )
order by tablename, policyname;

select count(*) from public.work_mode_publication_acknowledgements;
select count(*) from public.work_mode_check_in_events;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.work_mode_publication_acknowledgements'::regclass,
                 'public.work_mode_check_in_events'::regclass)
order by table_name, conname;

select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public'
  and tablename in (
    'work_mode_publication_acknowledgements',
    'work_mode_check_in_events'
  )
order by tablename, indexname;
```

Capture Supabase security and performance advisor output. Compare row counts
against preflight rather than assuming zero if tables predated this run.
Using distinct authenticated campaign-owned test personas, verify at both the
data boundary and API (retain request IDs, actor IDs, row IDs, HTTP status or
SQLSTATE, and before/after row counts; never record credentials):

- a confirmed worker can acknowledge a published packet for their assignment;
- replay of the same acknowledgement request returns one row; a new request for
  the same packet conflicts without a second row;
- a worker with `check_in_out=true` can append check-in and check-out events;
- replay of a check-in request is idempotent; reusing its ID for another action
  or assignment conflicts without creating a row;
- invited, cancelled, unpermitted, anonymous, wrong-user, and cross-tenant
  attempts fail before mutation;
- unpublished, hidden, unrelated-event, and unrelated-tour packet attempts fail,
  including when both event IDs are null;
- authenticated update and delete attempts fail, and users select only own rows;
- worker UI persists the result after reload and manager attendance reflects it
  on the same deployed SHA. If manager visibility is absent, WORK-006 remains open.

## Forward fix

If checks fail, leave or return the feature flag to disabled, preserve append-only
evidence, and apply a reviewed additive policy or constraint migration. Do not
drop either table as an incident response. Production activation needs a
separate release proof packet.

## DB-010 isolated-staging operator packet (2026-09-22)

Use only a separately approved isolated-staging database URL. The local
Supabase environment files point to the registered production project; they are
not staging credentials. Confirm `work_mode_security` is absent from the
hosted Data API exposed-schema list, matching `supabase/config.toml`. Keep
`FEATURE_WORK_MODE_WORKER_ACTIONS` disabled.

From the repository root, after the release owner records the approved staging
project reference, exact deployed app SHA, and database URL in the protected
operator environment:

```bash
test -n "$ISOLATED_STAGING_DATABASE_URL" || { echo "isolated staging URL missing" >&2; exit 1; }
npm run check:supabase-target # requires SUPABASE_PROJECT_ID, EXPECTED_SUPABASE_PROJECT_ID, and SUPABASE_TARGET_CONFIRMATION set to the approved staging ref
shasum -a 256 supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql
# Expected: bb85462919f773131e89280e73c4fe4c30feeb00d743982cff38999de8c5530c
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "select version from supabase_migrations.schema_migrations where version in ('20260728185712','20260922155356') order by version"
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "select to_regclass('public.employment_assignments'), to_regclass('public.staff_shifts'), to_regclass('public.events_v2'), to_regclass('public.tours'), to_regclass('public.work_mode_publications'), to_regclass('public.work_mode_publication_audiences'), to_regclass('public.work_mode_publication_acknowledgements'), to_regclass('public.work_mode_check_in_events')"
```

Capture the table shapes, policies, grants, constraints, and existing row counts
from the Postflight queries above before applying. If either action table or the
archived version is present, compare its catalog and preserve all rows; stop on
unexplained drift. DB-008 must resolve migration-history parity separately.
After the operator approves the exact target and preflight, apply only this file:

```bash
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/db010_worker_actions_contract.sql
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/db010_worker_actions_scope_contract.sql
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/db002_security_grants.sql
```

The catalog test must emit `db010_worker_actions_catalog_ready`. Each violation
query in the scope contract must emit **zero rows**, and its final row must show
`worker_actions_scope_ready = true`. The DB-002 grant test must exit cleanly; if it fails, stop and route the
separate `20260914090000_revoke_public_execute_db002.sql` apply through DB-002
and DB-008 before continuing.
Explicit `psql` application does not itself write Supabase migration history;
DB-008 must reconcile the version only after the catalog is shown equivalent.
Do not run a broad push or replay to fill history gaps.

Use distinct campaign-owned worker and manager users and run direct authenticated
inserts in rollback-only transactions (`SET LOCAL ROLE authenticated` and
`set_config('request.jwt.claim.sub', actor UUID, true)`) as well as matching API
requests. For example, substitute a campaign-owned actor, assignment, packet,
and fresh request UUID; repeat with the negative fixture IDs listed below:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<actor-uuid>', true);
insert into public.work_mode_publication_acknowledgements
  (assignment_id, publication_id, user_id, client_request_id)
values
  ('<assignment-uuid>', '<publication-uuid>', '<actor-uuid>', '<request-uuid>')
returning id;
rollback;
```

For check-in, insert into `public.work_mode_check_in_events` with
`assignment_id`, `user_id`, `event_id`, `action`, and `client_request_id` from
the same campaign fixture. Run the API counterpart at
`POST /api/work-mode/assignments/<assignment-uuid>/actions` with a fresh
`clientRequestId`; keep the feature flag disabled until DB-010 catalog and
direct-denial evidence is complete, then WORK-006 owns API/UI activation. Capture before/after counts per attempt. Required cases and outcomes:

| Case | Expected direct insert / API outcome |
| --- | --- |
| Confirmed assigned worker acknowledges a published in-scope packet | one row / success; same request ID returns that row; new request ID for same packet conflicts with no extra row |
| Permitted assigned worker checks in and out | two distinct rows / success; replay each request ID returns its original row; reused ID for another action or assignment conflicts |
| Different worker or wrong `user_id` | RLS denial (SQLSTATE 42501) / denied; zero rows added |
| Invited, cancelled, or check-in-unpermitted assignment | RLS denial / denied; zero rows added |
| Foreign organization, unrelated event, or unrelated tour packet | RLS denial / denied; zero rows added |
| Unpublished, hidden, or untargeted-audience packet | RLS denial / denied; zero rows added |
| Anonymous insert, authenticated update, or authenticated delete | privilege denial / denied; zero rows changed |
| Worker reads another worker's evidence | zero visible rows |

Preserve request IDs, actor IDs, assignment/publication IDs, SQLSTATE or HTTP
status, before/after counts, advisor reports, project reference, operator/time,
exact app SHA, migration SHA-256, and hosted history output in the DB-010
manifest and DB-008 ledger. Do not record tokens or passwords. WORK-006 may
stage-enable the flag only after all cases and the worker/manager reload checks
pass against the recorded deployment SHA.


## DB-008 / DB-002 gate before the DB-010 staging apply

The DB-010 commands above are gated by RELEASE-007 isolation and the DB-008
ledger. The connected Supabase account currently shows only the active Tourify
Demo project and an inactive Tourify-dev project; neither is approved as
isolated staging. Obtain a distinct staging project/ref, a protected database
URL, and the exact deployed app SHA. Confirm the database URL's project with
an independent Supabase project readback before running any SQL. Do not use the
repository's local production-target environment files.

From the repository root, in the protected operator environment, capture the
read-only history and DB-002 state first. Redact the connection string from
all artifacts. The history output belongs in DB-008's hosted ledger, together
with the project ref, capture time, app SHA, and migration source digest.

```sql
select signature, to_regprocedure(signature) as installed_function,
       has_function_privilege('anon', to_regprocedure(signature), 'EXECUTE') as anon_can_execute
from (values
  ('public.can_view_hiring_pii(uuid,text,uuid)'),
  ('public.replace_ticket_revenue_allocations(uuid,jsonb)'),
  ('public.delete_tour_cascade(uuid)'),
  ('public.has_entity_permission(uuid,text,uuid,text)')
) as required(signature);
```

```bash
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "select version from supabase_migrations.schema_migrations order by version"
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "select version from supabase_migrations.schema_migrations where version in ('20260823210000','20260823210100','20260823220001','20260823221000','20260823221100','20260914090000','20260922155356') order by version"
shasum -a 256 supabase/migrations/20260914090000_revoke_public_execute_db002.sql supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql
```

Expected source SHA-256 values are `3f290ee45aab87b7300128167c200d169d7a2e90201f4bca5a1ae82102c27a98`
for DB-002 and `bb85462919f773131e89280e73c4fe4c30feeb00d743982cff38999de8c5530c`
for DB-010. If a version is absent but its objects exist, inspect catalog
equivalence and let DB-008 reconcile history; never replay the file blindly.
If a DB-002 object family is absent, resolve its prerequisite migrations one at
a time through the reviewed CP-051 path.

Only after the isolated staging target and preflight are signed off, apply the
DB-002 revoke file if its grants are not already correct. Its catalog test must
pass, and a distinct anonymous caller must receive permission denial for all
four functions before DB-010 is eligible for staging application. Keep a
rollback-only probe transaction for any synthetic data.

```bash
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20260914090000_revoke_public_execute_db002.sql
psql "$ISOLATED_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/db002_security_grants.sql
npm run check:migration-ledger:release
```

The `psql` application does not register a Supabase migration version. Record
that discrepancy and reconcile metadata only after schema equivalence, using
the approved DB-008 operator action. Capture security and performance advisors,
RLS/policy/grant catalog output, exact SQLSTATE and row counts for negative
probes, and a forward-fix plan. The strict ledger command is expected to fail
until all active versions are classified and both hosted histories are verified;
do not label its failure as a staging pass.
