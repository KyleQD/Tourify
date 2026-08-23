-- =====================================================================
-- P17 — Regional rankings: snapshot storage + geographic appeals.
-- Snapshots are precomputed (T04): requests read stored rows, never recompute.
-- Additive; RLS deny-by-default except the public read policy below.
-- =====================================================================

create table if not exists public.world_ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('city', 'region', 'country', 'global')),
  scope_key text not null,
  category text not null check (category in ('overall', 'genre', 'scene', 'rising', 'live')),
  "window" text not null check ("window" in ('7d', '30d', '90d', '1y', 'all_time')),
  formula_version text not null,
  window_start timestamptz,
  window_end timestamptz,
  entries jsonb not null default '[]'::jsonb,
  explainability jsonb not null default '{}'::jsonb,
  last_computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint world_ranking_snapshots_identity
    unique nulls not distinct (scope, scope_key, category, "window")
);

comment on table public.world_ranking_snapshots is
  'P17 precomputed ranking snapshots. Entries are bounded lists with per-entry component scores for explainability. Recompute jobs overwrite in place; requests never compute.';

create index if not exists world_ranking_snapshots_lookup_idx
  on public.world_ranking_snapshots (scope, scope_key, category, "window", last_computed_at desc);

alter table public.world_ranking_snapshots enable row level security;

-- Public read of published snapshots; writes are service/job only.
create policy world_ranking_snapshots_public_read
  on public.world_ranking_snapshots
  for select to anon, authenticated
  using (true);

-- Geographic appeals (T10): review candidates, never direct mutations.
create table if not exists public.world_ranking_appeals (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (subject_kind in (
    'artist','track','genre','scene','event','venue')),
  subject_id text not null,
  scope text not null check (scope in ('city', 'region', 'country', 'global')),
  scope_key text not null,
  claimed_scope_key text not null,
  "window" text not null,
  reason text not null check (length(btrim(reason)) between 20 and 2000),
  submitted_by text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists world_ranking_appeals_queue_idx
  on public.world_ranking_appeals (status, created_at);

alter table public.world_ranking_appeals enable row level security;
-- Deny-by-default to anon/authenticated: appeals arrive through the governed
-- API route which validates and inserts via the server path.
