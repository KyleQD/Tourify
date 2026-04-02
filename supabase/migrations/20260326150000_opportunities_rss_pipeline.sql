-- Opportunities pipeline backed by external RSS sources.
-- Non-destructive: create-if-missing plus idempotent policies/indexes.

create extension if not exists pgcrypto;

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source_name text not null,
  source_category text not null default 'Music News',
  title text not null,
  summary text not null default '',
  url text not null,
  location_text text,
  opportunity_type text not null check (opportunity_type in ('job', 'gig', 'grant', 'submission', 'networking', 'education')),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  opportunity_score numeric(5,4) not null default 0.4000 check (opportunity_score >= 0 and opportunity_score <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_name, external_id)
);

create index if not exists idx_opportunities_published_at on opportunities (published_at desc);
create index if not exists idx_opportunities_type on opportunities (opportunity_type);
create index if not exists idx_opportunities_source on opportunities (source_name);
create index if not exists idx_opportunities_tags_gin on opportunities using gin (tags);

create table if not exists user_opportunity_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('view', 'click', 'save', 'dismiss', 'apply')),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_opp_interactions_user_created on user_opportunity_interactions (user_id, created_at desc);
create index if not exists idx_user_opp_interactions_opportunity on user_opportunity_interactions (opportunity_id);

create or replace function touch_opportunities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_opportunities_touch_updated on opportunities;
create trigger trg_opportunities_touch_updated
before update on opportunities
for each row execute function touch_opportunities_updated_at();

alter table opportunities enable row level security;
alter table user_opportunity_interactions enable row level security;

drop policy if exists opportunities_read_public on opportunities;
create policy opportunities_read_public
on opportunities
for select
using (true);

drop policy if exists opportunities_write_authenticated on opportunities;
create policy opportunities_write_authenticated
on opportunities
for all
using (auth.role() = 'authenticated' or auth.role() = 'service_role')
with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists user_opportunity_interactions_read_owner on user_opportunity_interactions;
create policy user_opportunity_interactions_read_owner
on user_opportunity_interactions
for select
using (auth.uid() = user_id);

drop policy if exists user_opportunity_interactions_insert_owner on user_opportunity_interactions;
create policy user_opportunity_interactions_insert_owner
on user_opportunity_interactions
for insert
with check (auth.uid() = user_id);
