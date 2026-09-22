-- TOUR-201 — Optimistic metadata version on tours (expand-only).
-- Distinct from plan_version (PLAN-101). Never reset the database.

set client_min_messages = warning;

alter table if exists public.tours
  add column if not exists metadata_version integer not null default 1;

comment on column public.tours.metadata_version is
  'TOUR-201 optimistic concurrency for tour metadata edits; clients send expected_version / metadata_version';

create index if not exists idx_tours_org_metadata_version
  on public.tours (org_id, metadata_version)
  where org_id is not null;
