set client_min_messages = warning;

-- P8 Migration: marketplace admin support columns
--
-- 1. marketplace_moderation_queue admin action columns
--    (storefront_id, action, actor_user_id, previous_status, new_status, resolved_at)
-- 2. marketplace_listings: ensure suspended status is in CHECK constraint
--
-- All additive (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ─── marketplace_moderation_queue admin columns ──────────────────────────────

alter table public.marketplace_moderation_queue
  add column if not exists storefront_id      uuid references public.marketplace_storefronts(id) on delete set null,
  add column if not exists action             text,
  add column if not exists actor_user_id      uuid references auth.users(id) on delete set null,
  add column if not exists previous_status    text,
  add column if not exists new_status         text,
  add column if not exists resolved_at        timestamptz;

create index if not exists idx_marketplace_moderation_queue_storefront
  on public.marketplace_moderation_queue (storefront_id)
  where storefront_id is not null;

create index if not exists idx_marketplace_moderation_queue_actor
  on public.marketplace_moderation_queue (actor_user_id)
  where actor_user_id is not null;

create index if not exists idx_marketplace_moderation_queue_resolved
  on public.marketplace_moderation_queue (resolved_at desc);

comment on column public.marketplace_moderation_queue.storefront_id is
  'Target storefront when the moderation action applies to a storefront rather than a listing';
comment on column public.marketplace_moderation_queue.action is
  'Admin action taken: suspend | restore';
comment on column public.marketplace_moderation_queue.actor_user_id is
  'Admin user who performed the moderation action';
comment on column public.marketplace_moderation_queue.previous_status is
  'Status of the target before the action';
comment on column public.marketplace_moderation_queue.new_status is
  'Status of the target after the action';
comment on column public.marketplace_moderation_queue.resolved_at is
  'Timestamp when the admin resolved or actioned this moderation record';

-- ─── marketplace_listings: add suspended to status CHECK if missing ───────────
-- The original schema may only allow 'draft'|'published'|'archived'; 'suspended'
-- and 'sold_out' need to be present for admin moderation and inventory completion.
-- We drop and recreate the check constraint additively (only if suspended is missing).

do $$
begin
  -- Check if 'suspended' is already allowed by the constraint
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'marketplace_listings'
      and c.contype = 'c'
      and c.conname like '%status%'
      and pg_get_constraintdef(c.oid) like '%suspended%'
  ) then
    -- Safe: add suspended and sold_out to the allowed status values
    alter table public.marketplace_listings
      drop constraint if exists marketplace_listings_status_check;
    alter table public.marketplace_listings
      add constraint marketplace_listings_status_check
        check (status in ('draft', 'published', 'sold_out', 'suspended', 'archived'));
  end if;
end $$;

-- ─── marketplace_storefronts: add suspended to status CHECK if missing ────────

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'marketplace_storefronts'
      and c.contype = 'c'
      and c.conname like '%status%'
      and pg_get_constraintdef(c.oid) like '%suspended%'
  ) then
    alter table public.marketplace_storefronts
      drop constraint if exists marketplace_storefronts_status_check;
    alter table public.marketplace_storefronts
      add constraint marketplace_storefronts_status_check
        check (status in ('draft', 'active', 'paused', 'suspended', 'closed'));
  end if;
end $$;
