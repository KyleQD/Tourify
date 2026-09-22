-- PLAN-101: optimistic draft plan version on tours (expand-only)

alter table public.tours
  add column if not exists plan_version integer not null default 1;

comment on column public.tours.plan_version is
  'PLAN-101/102 mutable draft plan version; incremented by canonical plan write service';

create index if not exists idx_tours_org_plan_version
  on public.tours (org_id, plan_version)
  where org_id is not null;
