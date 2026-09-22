-- DB-005 (sub-migration db005c) zero-drift contract checks for the creator
-- metadata carried on the canonical accounts search projection.
-- Run after the additive migration
--   20260922120000_creator_search_metadata_projection.sql
-- in a target database. Every query should return zero rows; the final query
-- should return one row with creator_search_projection_ready = true.
-- Source-field semantics and the derivation formula are documented in the
-- migration header and in the planned manifest (assumptions section); the
-- artist-domain confirmation handoff is HF-DB-005-ARTIST-CREATOR-FIELDS.

-- 1. The four creator columns must exist on public.accounts.
select 'accounts missing creator search-projection columns' as violation
where not exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'accounts'
    and column_name in (
      'artist_profile_id',
      'genres',
      'creator_settings',
      'creator_available_for_hire'
    )
  having count(distinct column_name) = 4
);

-- 2. Backfill identity: every artist account in the projection whose source
--    artist_profile row exists must carry that artist_profiles.id as
--    artist_profile_id (artistProfileId).
select 'creator projection artist_profile_id missing for artist account' as violation
from public.accounts a
join public.artist_profiles ap on ap.id = a.profile_id
where a.profile_table = 'artist_profiles'
  and a.artist_profile_id is distinct from ap.id;

-- 3. Backfill completeness: for every artist account present, the projection
--    columns must mirror the source artist_profiles row (genres, raw settings,
--    derived availability gate).
select 'creator projection fields do not mirror artist_profiles' as violation
from public.accounts a
join public.artist_profiles ap on ap.id = a.profile_id
where a.profile_table = 'artist_profiles'
  and (
    a.genres is distinct from coalesce(ap.genres, '{}'::text[])
    or a.creator_settings is distinct from coalesce(ap.settings, '{}'::jsonb)
    or a.creator_available_for_hire is distinct from coalesce(
      case
        when jsonb_typeof(ap.settings #> '{capabilities_v1,availableForHire}') = 'boolean'
          then (ap.settings #>> '{capabilities_v1,availableForHire}')::boolean
      end,
      case
        when jsonb_typeof(ap.settings #> '{preferences,available_for_hire}') = 'boolean'
          then (ap.settings #>> '{preferences,available_for_hire}')::boolean
      end,
      false
    )
  );

-- 4. Empty-safe: when NO artist_profiles rows exist, the backfill must not
--    have invented creator projection data (nothing to populate from).
select 'creator projection not empty-safe' as violation
where not exists (select 1 from public.artist_profiles)
  and exists (
    select 1
    from public.accounts
    where profile_table = 'artist_profiles'
      and (
        artist_profile_id is not null
        or genres <> '{}'
        or creator_settings <> '{}'
        or creator_available_for_hire
      )
  );

-- 5. Non-artist accounts must stay untouched by the creator projection
--    (no creator metadata on rows that are not artist-profile accounts).
select 'creator projection leaked onto non-artist accounts' as violation
from public.accounts a
where a.profile_table is distinct from 'artist_profiles'
  and (
    a.artist_profile_id is not null
    or a.genres <> '{}'
    or a.creator_settings <> '{}'
    or a.creator_available_for_hire
  );

-- 6. Precondition: the polymorphic identity the projection and the backfill
--    join on must exist on accounts.
select 'accounts missing profile_table or profile_id column' as violation
where not exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'accounts'
    and column_name in ('profile_table', 'profile_id')
  having count(distinct column_name) = 2
);

-- 7. Supporting indexes must exist for identity and genre-filter resolution.
select 'idx_accounts_creator_artist_profile missing' as violation
where not exists (
  select 1
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'accounts'
    and c.relname = 'idx_accounts_creator_artist_profile'
);

select 'idx_accounts_creator_genres missing' as violation
where not exists (
  select 1
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'accounts'
    and c.relname = 'idx_accounts_creator_genres'
);

select 'DB-005 creator search projection contract' as contract,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'accounts'
           and column_name in (
             'artist_profile_id',
             'genres',
             'creator_settings',
             'creator_available_for_hire'
           )
         having count(distinct column_name) = 4
       ) as creator_search_projection_ready;