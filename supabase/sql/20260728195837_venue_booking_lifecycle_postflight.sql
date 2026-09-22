-- Read-only postflight for the Venue booking lifecycle package.
-- This file does not backfill, validate constraints, or change grants/policies.

select
  (select count(*)
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
     )) as lifecycle_columns_found,
  (select count(*)
   from pg_index
   where indexrelid::regclass::text in (
     'venue_booking_requests_lifecycle_queue_idx',
     'venue_booking_request_timeline_request_created_idx',
     'venue_booking_request_timeline_venue_created_idx',
     'venue_booking_request_timeline_idempotency_idx'
   )
     and indisvalid
     and indisready) as valid_indexes_found,
  (select count(*)
   from pg_constraint
   where conrelid in (
     'public.venue_booking_requests'::regclass,
     'public.venue_booking_request_timeline'::regclass
   )
     and conname in (
       'venue_booking_requests_lifecycle_status_check',
       'venue_booking_requests_currency_check',
       'venue_booking_requests_agreed_amount_check',
       'venue_booking_requests_conflict_state_check',
       'venue_booking_requests_lifecycle_revision_check',
       'venue_booking_request_timeline_booking_request_fk',
       'venue_booking_request_timeline_venue_fk',
       'venue_booking_request_timeline_actor_fk',
       'venue_booking_request_timeline_status_check',
       'venue_booking_request_timeline_metadata_check'
     )
     and convalidated) as validated_constraints_found,
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'venue_booking_request_timeline') as timeline_rls_enabled,
  (select c.relforcerowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'venue_booking_request_timeline') as timeline_force_rls_enabled,
  (select count(*)
   from pg_policies
   where schemaname = 'public'
     and tablename = 'venue_booking_request_timeline'
     and policyname = 'booking timeline participants can read') as timeline_read_policies_found,
  (select count(*)
   from public.venue_booking_requests
   where lifecycle_status is null) as lifecycle_rows_remaining;

select
  venue_id,
  count(*) as lifecycle_rows_remaining
from public.venue_booking_requests
where lifecycle_status is null
group by venue_id
order by venue_id;

select
  conname,
  convalidated
from pg_constraint
where conrelid in (
  'public.venue_booking_requests'::regclass,
  'public.venue_booking_request_timeline'::regclass
)
  and conname in (
    'venue_booking_requests_lifecycle_status_check',
    'venue_booking_requests_currency_check',
    'venue_booking_requests_agreed_amount_check',
    'venue_booking_requests_conflict_state_check',
    'venue_booking_requests_lifecycle_revision_check',
    'venue_booking_request_timeline_booking_request_fk',
    'venue_booking_request_timeline_venue_fk',
    'venue_booking_request_timeline_actor_fk',
    'venue_booking_request_timeline_status_check',
    'venue_booking_request_timeline_metadata_check'
  )
order by conname;

select
  indexrelid::regclass as index_name,
  indisvalid,
  indisready
from pg_index
where indexrelid::regclass::text in (
  'venue_booking_requests_lifecycle_queue_idx',
  'venue_booking_request_timeline_request_created_idx',
  'venue_booking_request_timeline_venue_created_idx',
  'venue_booking_request_timeline_idempotency_idx'
)
order by index_name;

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'venue_booking_request_timeline'
order by grantee, privilege_type;

select
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'backfill_venue_booking_lifecycle',
    'transition_venue_booking_lifecycle'
  )
order by routine_name, grantee, privilege_type;
