set client_min_messages = warning;

-- P2 Migration 001: Extend marketplace_listings with listing_kind, service_mode,
-- public_slug, optimistic_version, and expand the status check constraint.

alter table public.marketplace_listings
  add column if not exists listing_kind text not null default 'physical'
    check (listing_kind in ('physical', 'service', 'external')),
  add column if not exists service_mode text
    check (service_mode in ('fixed_price', 'booking_request', 'quote_request')),
  add column if not exists public_slug text,
  add column if not exists optimistic_version integer not null default 1;

-- Expand the status check constraint to include paused, sold_out, suspended.
-- The original constraint only allowed: draft, published, archived.
alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_status_check;

alter table public.marketplace_listings
  add constraint marketplace_listings_status_check
    check (status in ('draft', 'published', 'paused', 'sold_out', 'suspended', 'archived'));

-- Unique constraint on public_slug (null values are excluded — each non-null value is unique)
alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_public_slug_unique;

alter table public.marketplace_listings
  add constraint marketplace_listings_public_slug_unique unique (public_slug);

-- Index on listing_kind for filtered discovery queries
create index if not exists idx_marketplace_listings_kind
  on public.marketplace_listings (listing_kind);

-- Partial unique index on public_slug (null-safe, only indexes non-null values)
-- The unique constraint above covers nullability; this index optimises slug lookups.
create index if not exists idx_marketplace_listings_public_slug
  on public.marketplace_listings (public_slug)
  where public_slug is not null;

comment on column public.marketplace_listings.listing_kind is
  'Discriminator: physical | service | external';
comment on column public.marketplace_listings.service_mode is
  'Only set when listing_kind = service: fixed_price | booking_request | quote_request';
comment on column public.marketplace_listings.public_slug is
  'Optional human-readable URL slug, globally unique when set';
comment on column public.marketplace_listings.optimistic_version is
  'Monotonic counter for optimistic concurrency during state transitions';
