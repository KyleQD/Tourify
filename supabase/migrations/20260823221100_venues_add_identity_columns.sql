-- ═══════════════════════════════════════════════════════════════
-- DB-002 — Reconcile missing venues identity columns (additive).
--
-- The deployed `venues` table (created by
-- 20250818120000_admin_staffing_core.sql) drifted from the chain:
-- the original DDL created slug / account_id / created_by, but the
-- live table carries only the 22 operational columns (name, address,
-- city, ..., rating, created_at, updated_at). The venues/RBAC RLS
-- baseline (20260823210100) references all three identity columns in
-- its venues_public_read / venues_owner_write policies, so applying
-- that baseline fails on the drifted schema.
--
-- This migration re-adds the three identity columns with the exact
-- types/nullability from the original DDL and restores slug
-- uniqueness as a partial unique index (NULLs allowed, matching
-- PostgreSQL UNIQUE semantics for the "not yet published" state).
-- Auth-scope columns stay NULL (service-role managed) — ownership is
-- never fabricated; the baseline policies then treat NULL-owner rows
-- as closed until a slug/owner is assigned.
--
-- Idempotent and additive: re-running converges. No backfill, no
-- destructive change. Rollback: drop index + the three columns.
-- ═══════════════════════════════════════════════════════════════

begin;

alter table public.venues
  add column if not exists slug text,
  add column if not exists account_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

comment on column public.venues.slug is
  'Public discovery slug (venues_public_read publishes rows with a non-null slug). NULL = not yet published.';
comment on column public.venues.account_id is
  'Owning account (auth.users.id); venues_owner_write scopes owner row access to this value.';
comment on column public.venues.created_by is
  'Creating account (auth.users.id); venues_owner_write scopes creator access to this value.';

-- Restore the chain-original unique slug, idempotently. Partial index
-- (WHERE slug IS NOT NULL) mirrors PostgreSQL UNIQUE NULL semantics.
create unique index if not exists venues_slug_key
  on public.venues (slug)
  where slug is not null;

commit;