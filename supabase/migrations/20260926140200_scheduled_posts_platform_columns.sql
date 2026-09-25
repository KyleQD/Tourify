-- ============================================================================
-- 20260926140200_scheduled_posts_platform_columns.sql
-- DB-008 / DB-011 — HF-DB-011-SCHEDULED-POSTS-FRESH-CHAIN-DIVERGENCE.
--
-- THE BUG
--   `20250904110000_scheduled_posts_platform_status.sql` adds
--   `platform_status jsonb` and `platform_errors jsonb` to `scheduled_posts`.
--   It runs at version 20250904110000. The table itself is created LATER, by
--   `20260413200000_port_missing_tables.sql:335`. Version order is not calendar
--   order: "2026-04-13" sorts after "2025-09-04". So on a FRESH replay the
--   `alter table if exists scheduled_posts add column if not exists ...` at
--   20250904110000 finds no table, does nothing, and is silently skipped. The
--   two columns are then never created by anyone.
--
--   `supabase/tests/db008_chain_contract_replay.mjs` records exactly this as a
--   `skippedRelationAbsentAtReplay` event and reports
--   `scheduled_posts in 20250904110000 -> columns a fresh replay never creates:
--   platform_status, platform_errors`.
--
-- WHY IT MATTERS, AND WHY WAVE 34'S "THEY AGREE" IS NOT THE END OF IT
--   The committed contract `lib/database.types.ts` also does not declare the two
--   columns, so contract and fresh chain agree with each other and regeneration
--   loses nothing. That was Wave 34's conclusion and it is correct about the
--   CONTRACT. It is not the end of the matter, because the two columns are not
--   dead:
--     * app/api/artist/content/overview/route.ts:137 selects
--       `id, content, scheduled_for, status, platform_status, platform_errors,
--        error_details` and :180-181 reads them into the API response
--     * lib/services/cross-platform-posting.service.ts:195 WRITES
--       `platform_status` as a per-platform map
--   So on any target built from the chain alone, a live route selects two
--   columns that do not exist and PostgREST returns an error. Any target that
--   received those columns out of band (a raw Management API apply, which
--   DB-002 found happening in this project) has them and the contract is still
--   missing them.
--
-- THE FIX
--   A new forward-only migration, at a version AFTER the one that creates the
--   table, that adds the two columns and their two GIN indexes. It is
--   `if not exists`, so it is a no-op on a target that already received them out
--   of band, and it repairs a target built from the chain. This is the only
--   shape that works: the earlier migration cannot be edited (it has already run
--   on real targets, and editing applied migrations breaks the history ledger),
--   and renumbering it would not move it after 20260413200000.
--
-- WHY NOT DELETE THEM
--   The columns are read and written by live, entry-reachable product code. A
--   migration that removed them would be a second authorization-grade regression
--   and is not proposed.
--
-- CONVENTIONS
--   Additive and forward-only. Two columns and two indexes. No table is created,
--   altered, dropped or rewritten, no policy, grant or trigger is touched, and
--   `scheduled_posts` keeps its RLS, its `scheduled_posts_own` policy and its
--   status CHECK. Idempotent.
-- ============================================================================

set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table if exists public.scheduled_posts
  add column if not exists platform_status jsonb default '{}'::jsonb,
  add column if not exists platform_errors jsonb default '{}'::jsonb;

comment on column public.scheduled_posts.platform_status is
  'Per-platform delivery state, e.g. {"instagram":"scheduled"}. Added forward of 20250904110000 because that migration runs BEFORE 20260413200000 creates this table, so a fresh replay skipped it. Read by app/api/artist/content/overview/route.ts:137,180-181 and written by lib/services/cross-platform-posting.service.ts:195.';
comment on column public.scheduled_posts.platform_errors is
  'Per-platform error detail keyed by platform. Same forward-ordering reason as platform_status.';

-- ---------------------------------------------------------------------------
-- Indexes. The originals live inside the `do $body$` block of 20250904110000 and
-- are therefore also skipped on a fresh replay.
-- ---------------------------------------------------------------------------
create index if not exists idx_scheduled_posts_platform_status
  on public.scheduled_posts using gin (platform_status);

create index if not exists idx_scheduled_posts_platform_errors
  on public.scheduled_posts using gin (platform_errors);

-- ---------------------------------------------------------------------------
-- Post-state assertion. A migration that ran before the table existed is exactly
-- the failure this file exists to repair, so the end state is checked rather than
-- assumed. On a target where scheduled_posts genuinely does not exist the block
-- returns without raising, because that target has a different problem and must
-- not be reported as this one.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.scheduled_posts') is null then
    raise warning
      'scheduled_posts does not exist on this target; 20260926140200 had nothing to repair. That is a separate finding from the one this migration fixes.';
    return;
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.scheduled_posts'::regclass
      and attname = 'platform_status'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception 'scheduled_posts.platform_status is still absent after 20260926140200';
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.scheduled_posts'::regclass
      and attname = 'platform_errors'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception 'scheduled_posts.platform_errors is still absent after 20260926140200';
  end if;
end $$;

commit;
