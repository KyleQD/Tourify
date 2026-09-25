-- ============================================================================
-- db011_marketplace_external_listing_contract.sql
--
-- Zero-drift contract postflight for
--   20260926120100_marketplace_external_listing_surface.sql
--
-- Returns ONLY violation rows plus exactly one summary row named
-- `marketplace_external_listing_surface_ready`, so a target where the migration
-- was never applied cannot produce a vacuous pass.
--
-- The confidentiality assertion here is the point of the migration: the base
-- table must be closed to anon and the public projection must not carry
-- canonical_url.
-- ============================================================================

with expectations(relation_name, column_name, data_type, is_nullable) as (
  values
    ('marketplace_listings',           'listing_kind',        'text',    false),
    ('marketplace_listings',           'service_mode',        'text',    true),
    ('marketplace_listings',           'public_slug',         'text',    true),
    ('marketplace_listings',           'optimistic_version',  'integer', false),
    ('marketplace_external_listings',  'id',                  'uuid',    false),
    ('marketplace_external_listings',  'listing_id',          'uuid',    false),
    ('marketplace_external_listings',  'canonical_url',       'text',    false),
    ('marketplace_external_listings',  'provider_name',       'text',    true),
    ('marketplace_external_listings',  'provider_domain',     'text',    true),
    ('marketplace_external_listings',  'metadata_snapshot',   'jsonb',   false),
    ('marketplace_external_listings',  'displayed_price',     'text',    true),
    ('marketplace_external_listings',  'displayed_currency',  'text',    true),
    ('marketplace_external_listings',  'safety_status',       'text',    false),
    ('marketplace_external_listings',  'seller_confirmed_at', 'timestamp with time zone', true),
    ('marketplace_external_listings',  'last_health_check_at','timestamp with time zone', true),
    ('marketplace_external_listings',  'health_check_status', 'text',    true),
    ('marketplace_external_listings',  'created_at',          'timestamp with time zone', false),
    ('marketplace_external_listings',  'updated_at',          'timestamp with time zone', false),
    ('marketplace_external_clicks',    'id',                  'uuid',    false),
    ('marketplace_external_clicks',    'listing_id',          'uuid',    false),
    ('marketplace_external_clicks',    'source_surface',      'text',    false),
    ('marketplace_external_clicks',    'session_fingerprint', 'text',    true),
    ('marketplace_external_clicks',    'clicked_at',          'timestamp with time zone', false)
),
actual as (
  select
    c.relname::text   as relation_name,
    a.attname::text   as column_name,
    format_type(a.atttypid, a.atttypmod) as data_type,
    (not a.attnotnull) as is_nullable
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid = a.attrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and a.attnum > 0
    and not a.attisdropped
    and c.relkind in ('r', 'p')
)
select e.relation_name, e.column_name,
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
-- The embedded select in app/api/marketplace/listings/[id]/redirect/route.ts
-- only resolves if a real FK runs from listing_id to marketplace_listings.id.
select 'marketplace_external_listings', 'listing_id_fk',
       'no foreign key from marketplace_external_listings.listing_id to marketplace_listings.id'
where not exists (
  select 1
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid = con.conrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('marketplace_external_listings', 'marketplace_external_clicks')
    and con.contype = 'f'
    and con.confrelid = to_regclass('public.marketplace_listings')
)
union all
-- one external destination per listing
select 'marketplace_external_listings', 'listing_id',
       'listing_id is not uniquely constrained'
where not exists (
  select 1 from pg_catalog.pg_index i
  where i.indrelid = 'public.marketplace_external_listings'::regclass
    and i.indisunique and i.indnatts = 1
    and i.indkey[0] = (select attnum from pg_catalog.pg_attribute
                       where attrelid = 'public.marketplace_external_listings'::regclass
                         and attname = 'listing_id' and not attisdropped)
)
union all
-- confidentiality: the base table must not be anon-readable, or canonical_url
-- is exposed to anyone who satisfies the row policy.
select 'marketplace_external_listings', 'anon_select',
       'anon retains SELECT on the base table'
where to_regclass('public.marketplace_external_listings') is not null
  and has_table_privilege('anon', 'public.marketplace_external_listings', 'SELECT')
union all
-- and the public projection must exist, be anon-readable, and exclude the URL
select 'marketplace_external_listings_public', 'projection',
       case
         when to_regclass('public.marketplace_external_listings_public') is null then 'view missing'
         when not has_table_privilege('anon', 'public.marketplace_external_listings_public', 'SELECT') then 'anon cannot read the projection'
         when exists (select 1 from pg_catalog.pg_attribute
                        where attrelid = to_regclass('public.marketplace_external_listings_public')
                          and attname = 'canonical_url' and not attisdropped) then 'projection exposes canonical_url'
         else null
       end
where to_regclass('public.marketplace_external_listings_public') is null
   or not has_table_privilege('anon', 'public.marketplace_external_listings_public', 'SELECT')
   or exists (select 1 from pg_catalog.pg_attribute
                where attrelid = to_regclass('public.marketplace_external_listings_public')
                  and attname = 'canonical_url' and not attisdropped)
union all
-- RLS forced on both new relations
select c.relname, 'row security',
       'relrowsecurity=' || c.relrowsecurity || ' relforcerowsecurity=' || c.relforcerowsecurity
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('marketplace_external_listings', 'marketplace_external_clicks')
  and (not c.relrowsecurity or not c.relforcerowsecurity)
union all
-- status check must still accept every value the chain originally allowed
select 'marketplace_listings', 'status_check',
       'marketplace_listings_status_check is missing or narrower than the original list'
where not exists (
  select 1 from pg_catalog.pg_constraint
  where conrelid = to_regclass('public.marketplace_listings')
    and conname = 'marketplace_listings_status_check'
    and pg_get_constraintdef(oid) ~ 'draft'
    and pg_get_constraintdef(oid) ~ 'published'
    and pg_get_constraintdef(oid) ~ 'archived'
)
union all
select '__summary__', 'marketplace_external_listing_surface_ready', 'ok'
where to_regclass('public.marketplace_external_listings') is not null
  and to_regclass('public.marketplace_external_clicks') is not null
  and to_regclass('public.marketplace_external_listings_public') is not null;
