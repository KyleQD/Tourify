# Manual SQL Runbook — Work Mode Worker Actions

SQL: `supabase/migrations/20260728185712_work_mode_worker_actions.sql`  
Status: operator reported successful manual application on 2026-07-28; not applied by Codex

## Preconditions

1. Confirm the exact Supabase project and environment.
2. Export hosted migration history and compare it with the local migration list.
3. Confirm `public.employment_assignments` and
   `public.work_mode_publications` exist and use UUID primary keys.
4. Record these baseline counts:

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

Test first in an isolated production-like environment. The SQL sets a five-second
lock budget and a 60-second statement budget.

## Expected effect

- Adds two empty append-only tables for publication acknowledgements and
  check-in/out events.
- Adds four indexes and four assignment-scoped RLS policies.
- Updates or backfills no existing row.
- Grants authenticated users `SELECT` and `INSERT` only. Anonymous users receive
  no access.

## Execution order

1. Keep `FEATURE_WORK_MODE_WORKER_ACTIONS` unset or disabled during SQL execution.
2. Run the reviewed SQL file through the operator-controlled deployment process.
3. Run postflight and persona checks.
4. Set `FEATURE_WORK_MODE_WORKER_ACTIONS=1` only after all postflight and persona
   checks pass. SQL application has been reported; feature-flag state is not
   recorded in this repository.

Do not run a reset, restore, seed reload, schema replacement, or destructive
cleanup.

## Postflight

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
```

Using authenticated test personas, verify:

- a confirmed worker can acknowledge a published packet for their assignment;
- the same acknowledgement/client request safely conflicts rather than duplicating;
- a worker with `check_in_out=true` can append check-in and check-out events;
- invited, cancelled, unpermitted, anonymous, and cross-user attempts fail;
- authenticated update and delete attempts fail.

## Forward fix

If checks fail, leave the feature flag disabled, preserve any append-only evidence,
and apply a later reviewed additive policy or constraint migration. Do not drop
either table as an incident response.
