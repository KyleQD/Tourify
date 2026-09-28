# Manual SQL Runbook — Venue Booking Lifecycle

SQL: `supabase/migrations/20260728195837_venue_booking_lifecycle.sql`  
Concurrent index:
`supabase/sql/20260728195837_venue_booking_lifecycle_concurrent_index.sql`  
Status: operator reported successful manual application on 2026-07-28; Codex did
not execute it. Backfill, constraint validation, read-only postflight output,
persona isolation, and feature-flag state are not yet recorded.

> Important: run the migration and concurrent-index files as two separate SQL
> Editor executions. Never paste them into the same editor run.

## Preconditions

1. Confirm the exact Supabase project and environment.
2. Export hosted migration history and compare it with the local migration list.
3. Confirm `public.venue_booking_requests` and `public.venue_profiles` exist.
4. Keep `FEATURE_VENUE_BOOKING_LIFECYCLE` unset or disabled.
5. Record the exact venue IDs approved for backfill. Do not infer tenant ownership.
6. Record these baselines:

```sql
select venue_id, status, count(*)
from public.venue_booking_requests
group by venue_id, status
order by venue_id, status;

select count(*) as booking_request_count
from public.venue_booking_requests;

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('venue_booking_requests', 'venue_booking_request_timeline');
```

Test first in an isolated production-like environment. The SQL sets a five-second
lock budget and a 60-second statement budget.

## Expected effect

- Adds nullable lifecycle, owner, due date, currency, amount, conflict, and
  revision fields beside the existing booking status.
- Adds one append-only timeline table, three indexes, one read policy, and two
  operator/service functions.
- The separate one-statement companion adds the fourth index concurrently.
- Does not remove or rename the existing `status` field.
- Does not update an existing row during schema expansion.
- Lets the operator backfill one explicit venue at a time in resumable batches.

## Execution order

1. Run only
   `supabase/migrations/20260728195837_venue_booking_lifecycle.sql`.
2. Open a new SQL Editor query and run only
   `supabase/sql/20260728195837_venue_booking_lifecycle_concurrent_index.sql`.
   Do not include `BEGIN`, `COMMIT`, or any other statement in that editor run:

```sql
create index concurrently if not exists venue_booking_requests_lifecycle_queue_idx
  on public.venue_booking_requests (venue_id, lifecycle_status, lifecycle_due_at)
  where lifecycle_status is not null;
```

3. For each reviewed venue ID, run the following repeatedly until it returns `0`:

```sql
select public.backfill_venue_booking_lifecycle(
  'REVIEWED-VENUE-UUID'::uuid,
  500
);
```

4. Validate constraints only after scoped backfills and exception review:

```sql
alter table public.venue_booking_requests
  validate constraint venue_booking_requests_lifecycle_status_check;
alter table public.venue_booking_requests
  validate constraint venue_booking_requests_currency_check;
alter table public.venue_booking_requests
  validate constraint venue_booking_requests_agreed_amount_check;
alter table public.venue_booking_requests
  validate constraint venue_booking_requests_conflict_state_check;
alter table public.venue_booking_requests
  validate constraint venue_booking_requests_lifecycle_revision_check;

alter table public.venue_booking_request_timeline
  validate constraint venue_booking_request_timeline_booking_request_fk;
alter table public.venue_booking_request_timeline
  validate constraint venue_booking_request_timeline_venue_fk;
alter table public.venue_booking_request_timeline
  validate constraint venue_booking_request_timeline_actor_fk;
alter table public.venue_booking_request_timeline
  validate constraint venue_booking_request_timeline_status_check;
alter table public.venue_booking_request_timeline
  validate constraint venue_booking_request_timeline_metadata_check;
```

5. Run postflight and persona checks.
6. Set `FEATURE_VENUE_BOOKING_LIFECYCLE=1` only after every check passes.

Do not run a reset, restore, seed reload, schema replacement, truncate, or
destructive cleanup.

## Postflight

Run the read-only companion and retain every result set:

`supabase/sql/20260728195837_venue_booking_lifecycle_postflight.sql`

The first result should report:

- `lifecycle_columns_found = 7`
- `valid_indexes_found = 4`
- `validated_constraints_found = 10` after the validation step
- `timeline_rls_enabled = true`
- `timeline_force_rls_enabled = true`
- `timeline_read_policies_found = 1`
- `lifecycle_rows_remaining = 0` after every reviewed venue backfill

The detailed result sets must show no unexpected grants to `anon` or
`authenticated`, except authenticated `SELECT` on the timeline. The transition
function must be executable by `service_role`, not client roles.

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'venue_booking_requests'
  and column_name in (
    'lifecycle_status',
    'lifecycle_owner_id',
    'lifecycle_due_at',
    'currency',
    'agreed_amount',
    'conflict_state',
    'lifecycle_revision'
  )
order by column_name;

select venue_id, count(*) as lifecycle_null_rows
from public.venue_booking_requests
where lifecycle_status is null
group by venue_id
order by venue_id;

select conname, convalidated
from pg_constraint
where conrelid in (
  'public.venue_booking_requests'::regclass,
  'public.venue_booking_request_timeline'::regclass
)
  and conname like 'venue_booking_request%'
order by conname;

select indexrelid::regclass as index_name, indisvalid, indisready
from pg_index
where indexrelid::regclass::text in (
  'venue_booking_requests_lifecycle_queue_idx',
  'venue_booking_request_timeline_request_created_idx',
  'venue_booking_request_timeline_venue_created_idx',
  'venue_booking_request_timeline_idempotency_idx'
)
order by index_name;

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'venue_booking_request_timeline';

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'venue_booking_request_timeline'
order by grantee, privilege_type;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'venue_booking_request_timeline';
```

Using authenticated test personas, verify:

- venue owners and active staff with `manage_bookings=true` can read scoped
  timeline entries;
- requesters can read only their own request timelines;
- unrelated venue, anonymous, and inactive staff personas are denied;
- valid stage changes succeed and append one timeline event;
- stale revisions return a conflict;
- repeating the same client request ID does not duplicate an event;
- invalid stage jumps fail;
- authenticated direct insert, update, and delete attempts on the timeline fail.

## Forward fix

If checks fail, leave the feature flag disabled. The UI will explicitly retain
the legacy approve/decline flow. Preserve lifecycle evidence and apply a later
reviewed additive policy, constraint, function, or index migration. Do not drop
the timeline or rewrite legacy statuses as an incident response.
