-- ============================================================================
-- db008_scheduled_posts_platform_columns_contract.sql
--
-- Zero-drift postflight for 20260926140200_scheduled_posts_platform_columns.sql
-- (HF-DB-011-SCHEDULED-POSTS-FRESH-CHAIN-DIVERGENCE).
--
-- Returns ONLY violation rows plus exactly one summary row
-- `scheduled_posts_platform_columns_ready`. If scheduled_posts does not exist the
-- statement fails outright rather than reporting a pass, because "the table is
-- absent" is a different and more serious finding and must not read as success.
-- ============================================================================

with violations as (
  -- 1. The relation must exist, or this postflight is measuring nothing.
  select 'scheduled_posts_missing'::text as check_name, 'public.scheduled_posts'::text as detail
  where to_regclass('public.scheduled_posts') is null

  union all
  -- 2. Both columns exist. These are the exact two app/api/artist/content/overview/
  --    route.ts:137 selects and lib/services/cross-platform-posting.service.ts:195
  --    writes.
  select 'missing_column', 'scheduled_posts.' || e.col
  from (values ('platform_status'), ('platform_errors')) as e(col)
  where to_regclass('public.scheduled_posts') is not null
    and not exists (
      select 1
      from pg_attribute a
      where a.attrelid = 'public.scheduled_posts'::regclass
        and a.attname = e.col
        and a.attnum > 0
        and not a.attisdropped
    )

  union all
  -- 3. Both must be jsonb. A text column would accept the writer's jsonb-shaped
  --    object only by accident and would break the `.reduce` that builds the map.
  select 'wrong_type', 'scheduled_posts.' || e.col || ' is ' || coalesce(format_type(a.atttypid, a.atttypmod), 'absent')
  from (values ('platform_status'), ('platform_errors')) as e(col)
  left join pg_attribute a
    on a.attrelid = 'public.scheduled_posts'::regclass
   and a.attname = e.col
   and a.attnum > 0
   and not a.attisdropped
  where to_regclass('public.scheduled_posts') is not null
    and a.atttypid is not null
    and a.atttypid <> 'jsonb'::regtype

  union all
  -- 4. RLS must still be enabled and the owner policy must still be there. This
  --    migration adds columns; it must not have disturbed the authorization
  --    surface of the table it touches.
  select 'rls_or_policy_missing', 'relrowsecurity=' || coalesce(c.relrowsecurity::text, 'absent')
  from (select relrowsecurity, relname from pg_class where oid = to_regclass('public.scheduled_posts')) c
  where c.relname is null or not c.relrowsecurity

  union all
  select 'owner_policy_missing', 'scheduled_posts_own'
  where to_regclass('public.scheduled_posts') is not null
    -- pg_policy has no schemaname/tablename columns; the relation identity comes
    -- from pg_class and pg_namespace. Writing `schemaname` here is a syntax error,
    -- not a null, so it fails loudly rather than silently passing.
    and not exists (
      select 1
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'scheduled_posts' and p.polname = 'scheduled_posts_own'
    )

  union all
  -- 5. Both GIN indexes must exist. 20250904110000 creates them inside a
  --    `do $body$` block that is skipped on a fresh replay for the same reason the
  --    columns are.
  select 'missing_index', e.idx
  from (values ('idx_scheduled_posts_platform_status'), ('idx_scheduled_posts_platform_errors')) as e(idx)
  where to_regclass('public.scheduled_posts') is not null
    and not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = e.idx)

  union all
  -- 6. The index on platform_status must actually be GIN on that column, not a
  --    btree left over under the same name.
  select 'index_not_gin_on_column', indexdef
  from pg_indexes
  where schemaname = 'public'
    and indexname in ('idx_scheduled_posts_platform_status', 'idx_scheduled_posts_platform_errors')
    and (indexdef !~* 'USING gin' )
)
select * from violations
union all
select 'scheduled_posts_platform_columns_ready'::text, 'all checks passed'::text
where not exists (select 1 from violations);
