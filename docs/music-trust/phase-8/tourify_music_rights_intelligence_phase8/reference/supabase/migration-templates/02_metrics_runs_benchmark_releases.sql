-- REFERENCE ONLY.
create table if not exists public.intelligence_metric_definitions (
  id uuid primary key default gen_random_uuid(), code text not null, version integer not null,
  purpose text not null, formula jsonb not null, source_policy jsonb not null,
  privacy_policy jsonb not null, prohibited_interpretations jsonb not null default '[]'::jsonb,
  status text not null, unique(code, version)
);

create table if not exists public.intelligence_metric_runs (
  id uuid primary key default gen_random_uuid(), metric_definition_id uuid not null references public.intelligence_metric_definitions(id),
  dataset_version_id uuid not null references public.intelligence_dataset_versions(id),
  cohort_id uuid references public.intelligence_cohorts(id), input_hash text not null,
  result_private jsonb, review_status text not null, created_at timestamptz not null default now()
);

create table if not exists public.intelligence_benchmark_releases (
  id uuid primary key default gen_random_uuid(), metric_run_id uuid not null references public.intelligence_metric_runs(id),
  release_version integer not null, output jsonb not null, disclosure text not null,
  privacy_review_id uuid, competition_review_id uuid, methodology_review_id uuid,
  status text not null check (status in ('draft','review','approved','published','revoked','superseded')),
  published_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
-- Public access should be through a narrow security-invoker view containing published outputs only.
