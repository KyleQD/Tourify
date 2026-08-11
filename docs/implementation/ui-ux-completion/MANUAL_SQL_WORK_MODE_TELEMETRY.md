# Manual SQL Runbook — Work Mode UX Telemetry

SQL: `supabase/migrations/20260728181917_work_mode_ux_telemetry.sql`  
Status: planned and not applied by Codex

## Preconditions

1. Confirm the target Supabase project and environment.
2. Export hosted migration history and compare it with the local migration list.
3. Run the SQL first in an isolated production-like environment.
4. Set a 5-second lock budget and 60-second statement timeout.

## Expected effect

- Adds one empty `public.ux_telemetry_events` table.
- Adds three indexes and one authenticated insert-own policy.
- Updates or backfills no existing row.
- Grants authenticated users `INSERT` only; no client receives read, update, or
  delete access.

## Manual execution

Run the SQL file as one reviewed migration using the normal operator-controlled
deployment process. Do not use database reset, restore, seed reload, or schema
replacement.

## Postflight

```sql
select c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'ux_telemetry_events';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'ux_telemetry_events'
order by grantee, privilege_type;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'ux_telemetry_events';

select event_name, count(*)
from public.ux_telemetry_events
group by event_name
order by event_name;
```

Verify with authenticated personas that:

- inserting with their own `user_id` succeeds;
- inserting another `user_id` fails;
- anon insert fails;
- authenticated select, update, and delete fail.

## Recovery

Disable the telemetry client/endpoint if unexpected errors occur. Preserve any
collected evidence; use a later reviewed forward-fix migration rather than dropping
the table.
