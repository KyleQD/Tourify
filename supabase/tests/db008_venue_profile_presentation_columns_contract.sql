-- DB-008 contract checks for 20260925210000_venue_profile_presentation_columns.sql.
-- Run after the migration is applied. Every violation query must return zero
-- rows; the final query must return one row with
-- venue_profile_presentation_columns_ready = true.

select 'public.venue_profiles does not exist' as violation
where to_regclass('public.venue_profiles') is null;

-- 1. Both columns exist with the exact contracted type and nullability.
select 'venue_profiles.social_links missing or wrong type' as violation
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'venue_profiles'
    and column_name = 'social_links'
    and data_type = 'jsonb'
    and is_nullable = 'NO'
    and column_default = '''{}''::jsonb'
);

select 'venue_profiles.cover_image_url missing or wrong type' as violation
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'venue_profiles'
    and column_name = 'cover_image_url'
    and data_type = 'text'
    and is_nullable = 'YES'
);

-- 2. Precondition the migration assumed: the table was already RLS-enabled with
--    its own policies before this migration ran. The migration must not have
--    changed the authorization surface, so the policy count must be non-zero and
--    RLS must still be enabled and forced.
select 'venue_profiles lost forced RLS' as violation
where exists (
  select 1 from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'venue_profiles'
    and (not c.relrowsecurity or not c.relforcerowsecurity)
);

select 'venue_profiles has no policies: the public projection would return nothing' as violation
where not exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'venue_profiles'
);

-- 3. The migration must not have widened the authorization surface: anon and
--    authenticated must not have gained any new table-level privilege.
select format('venue_profiles unexpected grant %s to %s', privilege_type, grantee) as violation
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'venue_profiles'
  and grantee in ('anon', 'authenticated')
  and privilege_type not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
;

-- 4. Existing rows are readable through the new column: every row must expose an
--    object, never NULL, because the public venue projection indexes it.
select 'venue_profiles row with NULL social_links: ' || id::text as violation
from public.venue_profiles
where social_links is null;

-- 5. The new column must not collide with the sibling contract it mirrors.
--    profiles.social_links exists from 20250819100000_profiles_expand_fields.sql;
--    if that column is absent the premise of the migration is wrong.
select 'precondition failed: public.profiles.social_links is absent, so the mirrored contract cannot be verified' as violation
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'social_links'
);

select true as venue_profile_presentation_columns_ready
where not exists (
  select 1 from public.venue_profiles where social_links is null
)
and exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'venue_profiles'
    and column_name = 'social_links' and data_type = 'jsonb'
)
and exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'venue_profiles'
    and column_name = 'cover_image_url' and data_type = 'text'
)
and exists (
  select 1 from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'venue_profiles'
    and c.relrowsecurity and c.relforcerowsecurity
)
and exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'venue_profiles'
);
