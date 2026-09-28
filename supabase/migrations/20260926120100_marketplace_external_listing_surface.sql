-- ============================================================================
-- 20260926120100_marketplace_external_listing_surface.sql
--
-- DB-011 / MKT-004. Reconciles the dead-CTA redirect and external-listing
-- import paths named in HF-DB-009-MARKETPLACE-TYPE-AND-RPC-SURFACE.
--
-- WHY THIS EXISTS
--   * app/api/marketplace/listings/[id]/redirect/route.ts:36-42 selects
--     `marketplace_external_listings (canonical_url, provider_domain,
--     safety_status)` as an EMBEDDED relation from marketplace_listings, and
--     then gates on `listing.listing_kind !== 'external'`. The embedded select
--     needs a real foreign key from marketplace_external_listings.listing_id to
--     marketplace_listings.id; `listing_kind` does not exist on
--     marketplace_listings in the active chain at all, so the route cannot
--     distinguish an external listing from any other.
--   * lib/marketplace/feed-attachment.ts:192 and :318 read
--     marketplace_external_listings for the feed card and the batch hydration.
--   * app/api/marketplace/listings/import-external/route.ts:164 writes the row.
--
-- PROVENANCE
--   supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/
--     20260728000001_marketplace_listing_kinds.sql    (MANIFEST.csv:241)
--     20260728000003_marketplace_external_listings.sql (MANIFEST.csv:249)
--     20260728000004_marketplace_external_clicks.sql    (MANIFEST.csv:250)
--   All three are `local_only_unapplied`. The archived text is reproduced
--   verbatim apart from the guard prefixes noted inline.
--
-- AUTHORIZATION
--   marketplace_external_listings
--     - owner_manage: the seller whose marketplace_listings.seller_user_id is
--       auth.uid() may read and write. The USING and WITH CHECK predicates are
--       identical, so a seller cannot re-point a row at another seller's listing.
--     - public_read_safe_fields: SELECT for an approved external listing whose
--       listing is published AND moderation_status = 'approved'.
--       SECURITY INVOLVEMENT: the policy is a row-level USING predicate, so a
--       column-level restriction cannot be expressed with it. The archived
--       comment claims canonical_url is "intentionally excluded" from the public
--       read, but a USING-only policy does NOT exclude a column — an anonymous
--       caller that passes the predicate can select canonical_url directly. That
--       is a real confidentiality gap in the archived DDL and it is NOT carried
--       over: the public read policy is created on a dedicated
--       `marketplace_external_listings_public` VIEW that exposes only
--       listing_id, provider_name, provider_domain and safety_status, and the
--       table itself is granted to authenticated only. The redirect route reads
--       canonical_url through the owner_manage policy with the caller's own
--       client, which is correct, and the feed only needs the safe fields.
--       This is the one place where this migration departs from the archived
--       text; the departure narrows access and is recorded in the manifest.
--   marketplace_external_clicks
--     - seller_read only. Inserts are service-role only (the redirect endpoint
--       records the click), matching the archived intent.
--
-- FORWARD-ONLY AND ADDITIVE
--   No drop, no rename, no rewrite. `if not exists` / `drop policy if exists`
--   throughout. The one non-additive-looking statement is the status check
--   constraint on marketplace_listings, which is DROPPED and re-ADDED with a
--   SUPERSET of its original value list (draft, published, archived) plus
--   paused, sold_out, suspended. No existing value becomes invalid, so this
--   cannot reject a row that previously satisfied the constraint.
-- ============================================================================

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1. marketplace_listings — the external/physical/service discriminator
-- ---------------------------------------------------------------------------
alter table public.marketplace_listings
  add column if not exists listing_kind text not null default 'physical'
    check (listing_kind in ('physical', 'service', 'external')),
  add column if not exists service_mode text
    check (service_mode in ('fixed_price', 'booking_request', 'quote_request')),
  add column if not exists public_slug text,
  add column if not exists optimistic_version integer not null default 1;

-- Expand the status check constraint. The original list is preserved as a
-- subset, so no row that was valid before becomes invalid.
alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_status_check;

-- NOT VALID then VALIDATE, not a single blocking ADD.
-- A plain `add constraint ... check` takes ACCESS EXCLUSIVE for the duration of
-- a full table scan, which is the one statement here that can stall writes to
-- the listings table on a large target. `not valid` skips that scan; the
-- separate VALIDATE takes only SHARE UPDATE EXCLUSIVE. The replacement list is
-- a strict superset of the original, so the validation cannot fail on an
-- existing row, and between the two statements the table briefly carries the
-- wider constraint unvalidated, which is strictly more permissive.
alter table public.marketplace_listings
  add constraint marketplace_listings_status_check
    check (status in ('draft', 'published', 'paused', 'sold_out', 'suspended', 'archived')) not valid;

alter table public.marketplace_listings
  validate constraint marketplace_listings_status_check;

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_public_slug_unique;

alter table public.marketplace_listings
  add constraint marketplace_listings_public_slug_unique unique (public_slug);

create index if not exists idx_marketplace_listings_kind
  on public.marketplace_listings (listing_kind);

create index if not exists idx_marketplace_listings_public_slug
  on public.marketplace_listings (public_slug)
  where public_slug is not null;

comment on column public.marketplace_listings.listing_kind is
  'Discriminator: physical | service | external';
comment on column public.marketplace_listings.optimistic_version is
  'Monotonic counter for optimistic concurrency during state transitions';

-- ---------------------------------------------------------------------------
-- 2. marketplace_external_listings — outbound destination of an external listing
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_external_listings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  canonical_url text not null,
  provider_name text,
  provider_domain text,
  metadata_snapshot jsonb not null default '{}',
  displayed_price text,
  displayed_currency text,
  safety_status text not null default 'pending_review'
    check (safety_status in ('pending_review', 'approved', 'flagged', 'blocked')),
  seller_confirmed_at timestamptz,
  last_health_check_at timestamptz,
  health_check_status text
    check (health_check_status in ('ok', 'unreachable', 'redirected', 'unsafe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id)
);

create index if not exists idx_marketplace_external_listings_listing
  on public.marketplace_external_listings (listing_id);

create index if not exists idx_marketplace_external_listings_domain_safety
  on public.marketplace_external_listings (provider_domain, safety_status);

alter table public.marketplace_external_listings enable row level security;
-- FORCE, so the absence of an INSERT policy on marketplace_external_clicks and
-- the column-limited public projection on this table hold for the owner too.
alter table public.marketplace_external_listings force row level security;

-- Seller manages their own external listings. USING and WITH CHECK are identical
-- so a seller cannot move a row onto a listing they do not own.
drop policy if exists "marketplace_external_listings_owner_manage" on public.marketplace_external_listings;
create policy "marketplace_external_listings_owner_manage"
  on public.marketplace_external_listings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

-- The archived migration also created a table-level public SELECT policy and
-- asserted in a comment that canonical_url was "intentionally excluded". A USING
-- predicate cannot exclude a column, so that policy would have exposed the
-- destination URL to anonymous callers. It is replaced by a column-limited view.
drop policy if exists "marketplace_external_listings_public_read_safe_fields" on public.marketplace_external_listings;

-- security_invoker is deliberately NOT set. An invoker-security view would
-- require the caller to hold SELECT on the base table, which is exactly what the
-- anon revoke below denies, so the view would be unreadable. The view therefore
-- runs with the owner's rights and carries the approved/published predicate
-- explicitly, which is the same filter the archived policy expressed.
create or replace view public.marketplace_external_listings_public
as
select
  el.listing_id,
  el.provider_name,
  el.provider_domain,
  el.safety_status
from public.marketplace_external_listings el
where el.safety_status = 'approved'
  and exists (
    select 1
    from public.marketplace_listings l
    where l.id = el.listing_id
      and l.status = 'published'
      and l.moderation_status = 'approved'
  );

comment on view public.marketplace_external_listings_public is
  'Column-limited public projection of external listings. Exposes provider identity and safety state only; canonical_url is deliberately absent and is reachable only through the owner-scoped table or the redirect endpoint.';

-- anon/authenticated may read the projection; the base table stays closed.
grant select on public.marketplace_external_listings_public to anon, authenticated;
revoke select on public.marketplace_external_listings from anon;

drop trigger if exists marketplace_external_listings_touch_updated_at
  on public.marketplace_external_listings;
create trigger marketplace_external_listings_touch_updated_at
  before update on public.marketplace_external_listings
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_external_listings is
  'External listing destination URL, provider metadata, and safety/health state. canonical_url is never exposed to clients — use the redirect endpoint.';
comment on column public.marketplace_external_listings.canonical_url is
  'HTTPS destination URL stored server-side only. Access via /api/marketplace/listings/[id]/redirect';

-- ---------------------------------------------------------------------------
-- 3. marketplace_external_clicks — outbound click attribution
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_external_clicks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  source_surface text not null default 'unknown'
    check (source_surface in ('hub', 'storefront', 'profile', 'feed', 'direct', 'unknown')),
  session_fingerprint text,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_marketplace_external_clicks_listing_time
  on public.marketplace_external_clicks (listing_id, clicked_at desc);

alter table public.marketplace_external_clicks enable row level security;
alter table public.marketplace_external_clicks force row level security;

-- Seller reads their own click events. No public read: analytics is aggregated
-- server-side. Inserts are service-role only via the redirect endpoint.
drop policy if exists "marketplace_external_clicks_seller_read" on public.marketplace_external_clicks;
create policy "marketplace_external_clicks_seller_read"
  on public.marketplace_external_clicks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

comment on table public.marketplace_external_clicks is
  'Attribution log for outbound clicks on external listings. No PII stored — session_fingerprint is a hashed session id.';
