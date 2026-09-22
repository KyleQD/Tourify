-- TOUR-206 — Idempotent resumable tour duplication jobs.
-- Additive only. Never reset the database.

set client_min_messages = warning;

create table if not exists public.tour_duplicate_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  source_tour_id uuid not null references public.tours (id) on delete cascade,
  target_tour_id uuid references public.tours (id) on delete set null,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  plan_token text not null,
  selection jsonb not null default '{}'::jsonb,
  proposed_name text,
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'canceled')),
  current_domain text,
  domain_status jsonb not null default '{}'::jsonb,
  id_map jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tour_duplicate_jobs_org_idempotency unique (org_id, idempotency_key)
);

create index if not exists idx_tour_duplicate_jobs_source
  on public.tour_duplicate_jobs (org_id, source_tour_id, created_at desc);

create index if not exists idx_tour_duplicate_jobs_status
  on public.tour_duplicate_jobs (status, updated_at)
  where status in ('queued', 'running', 'paused');

create index if not exists idx_tour_duplicate_jobs_target
  on public.tour_duplicate_jobs (target_tour_id)
  where target_tour_id is not null;

alter table public.tour_duplicate_jobs enable row level security;
alter table public.tour_duplicate_jobs force row level security;

drop policy if exists tour_duplicate_jobs_select_org on public.tour_duplicate_jobs;
create policy tour_duplicate_jobs_select_org on public.tour_duplicate_jobs
  for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_duplicate_jobs_insert_org on public.tour_duplicate_jobs;
create policy tour_duplicate_jobs_insert_org on public.tour_duplicate_jobs
  for insert to authenticated
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_duplicate_jobs_update_org on public.tour_duplicate_jobs;
create policy tour_duplicate_jobs_update_org on public.tour_duplicate_jobs
  for update to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

comment on table public.tour_duplicate_jobs is
  'TOUR-206 resumable deep-duplicate jobs: per-domain status, id maps, idempotency.';
