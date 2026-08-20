-- Phase 8 S4: metrics, runs, benchmark releases.

begin;

create table if not exists public.music_intelligence_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  purpose text not null,
  formula jsonb not null default '{}'::jsonb,
  source_policy jsonb not null default '{}'::jsonb,
  privacy_policy jsonb not null default '{}'::jsonb,
  prohibited_interpretations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'approved', 'retired'
  )),
  unique (code, version)
);

create table if not exists public.music_intelligence_metric_runs (
  id uuid primary key default gen_random_uuid(),
  metric_definition_id uuid not null references public.music_intelligence_metric_definitions(id) on delete restrict,
  dataset_version_id uuid not null references public.music_intelligence_dataset_versions(id) on delete restrict,
  cohort_id uuid references public.music_intelligence_cohorts(id) on delete set null,
  input_hash text not null,
  result_private jsonb,
  review_status text not null default 'draft' check (review_status in (
    'draft', 'privacy_review', 'competition_review', 'methodology_review', 'approved', 'rejected'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.music_intelligence_benchmark_releases (
  id uuid primary key default gen_random_uuid(),
  metric_run_id uuid not null references public.music_intelligence_metric_runs(id) on delete restrict,
  release_version integer not null,
  output jsonb not null default '{}'::jsonb,
  disclosure text not null default 'Historical descriptive aggregate only. Not a price recommendation or legal advice.',
  privacy_review_passed boolean not null default false,
  competition_review_passed boolean not null default false,
  methodology_review_passed boolean not null default false,
  contains_recommendation boolean not null default false,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'approved', 'published', 'revoked', 'superseded'
  )),
  published_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.music_intelligence_metric_definitions enable row level security;
alter table public.music_intelligence_metric_runs enable row level security;
alter table public.music_intelligence_benchmark_releases enable row level security;

revoke all on
  public.music_intelligence_metric_definitions,
  public.music_intelligence_metric_runs,
  public.music_intelligence_benchmark_releases
from anon, authenticated;

grant select on public.music_intelligence_metric_definitions to authenticated;
grant select on public.music_intelligence_metric_runs to authenticated;
grant select on public.music_intelligence_benchmark_releases to authenticated;

grant all on
  public.music_intelligence_metric_definitions,
  public.music_intelligence_metric_runs,
  public.music_intelligence_benchmark_releases
to service_role;

drop policy if exists mi_metrics_read on public.music_intelligence_metric_definitions;
create policy mi_metrics_read on public.music_intelligence_metric_definitions
for select to authenticated using (status = 'approved');

drop policy if exists mi_runs_read on public.music_intelligence_metric_runs;
create policy mi_runs_read on public.music_intelligence_metric_runs
for select to authenticated using (review_status = 'approved');

drop policy if exists mi_releases_read on public.music_intelligence_benchmark_releases;
create policy mi_releases_read on public.music_intelligence_benchmark_releases
for select to authenticated using (status in ('approved', 'published'));

drop policy if exists mi_metrics_service on public.music_intelligence_metric_definitions;
create policy mi_metrics_service on public.music_intelligence_metric_definitions for all to service_role using (true) with check (true);
drop policy if exists mi_runs_service on public.music_intelligence_metric_runs;
create policy mi_runs_service on public.music_intelligence_metric_runs for all to service_role using (true) with check (true);
drop policy if exists mi_releases_service on public.music_intelligence_benchmark_releases;
create policy mi_releases_service on public.music_intelligence_benchmark_releases for all to service_role using (true) with check (true);

comment on table public.music_intelligence_benchmark_releases is 'Descriptive only; contains_recommendation must remain false for publish.';

commit;
