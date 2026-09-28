-- ============================================================================
-- db011_marketplace_checkout_surface_contract.sql
--
-- Zero-drift contract postflight for
--   20260926120000_marketplace_checkout_idempotency_and_guest_checkout.sql
--
-- Returns ONLY rows that are violations, plus exactly one summary row named
-- `marketplace_checkout_surface_ready`. A run against a target where the
-- migration was never applied therefore returns the violation rows and NOT the
-- summary row: the test cannot pass vacuously.
--
-- CP-051: run manually by the operator after the manual apply. Never wired into
-- a reset or a chain replay.
-- ============================================================================

with expectations(relation_name, column_name, data_type, is_nullable) as (
  values
    ('marketplace_checkout_attempts', 'id',                  'uuid',        false),
    ('marketplace_checkout_attempts', 'idempotency_key',    'text',        false),
    ('marketplace_checkout_attempts', 'buyer_user_id',      'uuid',        true),
    ('marketplace_checkout_attempts', 'guest_email',        'text',        true),
    ('marketplace_checkout_attempts', 'order_id',           'uuid',        true),
    ('marketplace_checkout_attempts', 'input_hash',         'text',        false),
    ('marketplace_checkout_attempts', 'status',             'text',        false),
    ('marketplace_checkout_attempts', 'created_at',         'timestamp with time zone', false),
    ('marketplace_checkout_attempts', 'expires_at',         'timestamp with time zone', false),
    ('marketplace_orders',            'order_number',                'text',               true),
    ('marketplace_orders',            'applied_fee_snapshot',        'jsonb',              true),
    ('marketplace_orders',            'idempotency_key',              'text',               true),
    ('marketplace_orders',            'guest_email',                  'text',               true),
    ('marketplace_orders',            'guest_access_token',           'text',               true),
    ('marketplace_orders',            'guest_access_token_expires_at','timestamp with time zone', true)
),
actual as (
  select
    c.relname::text              as relation_name,
    a.attname::text               as column_name,
    format_type(a.atttypid, a.atttypmod) as data_type,
    (not a.attnotnull)            as is_nullable
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid = a.attrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and a.attnum > 0
    and not a.attisdropped
    and c.relkind in ('r', 'p', 'v', 'm')
)
select
  e.relation_name,
  e.column_name,
  case
    when t.column_name is null then 'column missing'
    when t.data_type is distinct from e.data_type then 'type is ' || t.data_type || ', expected ' || e.data_type
    when t.is_nullable is distinct from e.is_nullable then 'nullability differs (expected nullable=' || e.is_nullable || ')'
  end as violation
from expectations e
left join actual t
  on t.relation_name = e.relation_name and t.column_name = e.column_name
where t.column_name is null
   or t.data_type is distinct from e.data_type
   or t.is_nullable is distinct from e.is_nullable
union all
-- The idempotency guarantee itself: a unique constraint or unique index over
-- idempotency_key alone. A non-unique index would let two buyers claim the key.
select
  'marketplace_checkout_attempts',
  'idempotency_key',
  'no unique constraint or unique index covers (idempotency_key) alone'
where not exists (
  select 1
  from pg_catalog.pg_index i
  join pg_catalog.pg_class c on c.oid = i.indrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'marketplace_checkout_attempts'
    and i.indisunique
    and i.indnatts = 1
    and i.indkey[0] = (
      select attnum from pg_catalog.pg_attribute
      where attrelid = c.oid and attname = 'idempotency_key' and not attisdropped
    )
)
union all
-- RLS must be forced on, not merely enabled: the table is written by the
-- service role and must be unreachable to anon.
select 'marketplace_checkout_attempts', 'row security',
       'relrowsecurity=' || c.relrowsecurity || ' relforcerowsecurity=' || c.relforcerowsecurity
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'marketplace_checkout_attempts'
  and (not c.relrowsecurity or not c.relforcerowsecurity)
union all
-- Only a buyer-scoped SELECT policy may exist. An INSERT or UPDATE policy would
-- let a signed-in buyer claim or mutate an attempt, which the route reserves for
-- the service role.
select 'marketplace_checkout_attempts', 'policy:' || p.polname,
       'unexpected policy command ' || p.polcmd::text
from pg_catalog.pg_policy p
join pg_catalog.pg_class c on c.oid = p.polrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'marketplace_checkout_attempts'
  and (p.polcmd <> 'r' or p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')::oid])
union all
-- The guest token must not be readable by anon.
select 'marketplace_orders', 'guest_access_token', 'anon retains SELECT on marketplace_orders'
where has_table_privilege('anon', 'public.marketplace_orders', 'SELECT')
union all
-- The summary row is emitted only when the relation actually exists, so a run
-- against a target where the migration was never applied yields violation rows
-- and no summary. That is what makes the test incapable of passing vacuously.
select
  '__summary__',
  'marketplace_checkout_surface_ready',
  'ok'
where exists (
  select 1
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'marketplace_checkout_attempts'
);
