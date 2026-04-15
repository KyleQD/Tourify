set client_min_messages = warning;

-- Tours domain: multi-event, multi-venue, multi-artist, vendor and team scaffolding
create extension if not exists pgcrypto;

-- Core tours table
create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'planning' check (status in ('planning','active','on_hold','completed','cancelled')),
  start_date date,
  end_date date,
  budget numeric,
  expenses numeric,
  revenue numeric,
  settings jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_tours_touch on tours;
create trigger trg_tours_touch before update on tours for each row execute function touch_updated_at();

-- Relationship: tour ↔ events_v2 (many)
create table if not exists tour_events (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  event_id uuid not null references events_v2(id) on delete cascade,
  ordinal integer,
  created_at timestamptz not null default now(),
  unique(tour_id, event_id)
);

-- Artists attached to tour (can be accounts or descriptors)
create table if not exists tour_artists (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  artist_user_id uuid references auth.users(id) on delete set null,
  artist_name text,
  role text,
  created_at timestamptz not null default now()
);

-- Vendors attached to tour
create table if not exists tour_vendors (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  vendor_account_id uuid references auth.users(id) on delete set null,
  vendor_name text,
  service_type text,
  contact jsonb,
  created_at timestamptz not null default now()
);

-- Teams attached to tour (pre/post planning)
create table if not exists tour_teams (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  name text not null,
  team_type text, -- e.g., production, marketing, finance
  created_at timestamptz not null default now()
);

-- Team members (industry profiles or user accounts)
create table if not exists tour_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references tour_teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  profile jsonb, -- descriptor for non-account participants
  role text,
  created_at timestamptz not null default now()
);

-- RLS
alter table tours enable row level security;
alter table tour_events enable row level security;
alter table tour_artists enable row level security;
alter table tour_vendors enable row level security;
alter table tour_teams enable row level security;
alter table tour_team_members enable row level security;

-- Permissive policies for beta (scope later with org perms)
drop policy if exists tours_read on tours;
create policy tours_read on tours for select using (auth.role() = 'authenticated');
drop policy if exists tours_write on tours;
create policy tours_write on tours for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists tour_events_all on tour_events;
create policy tour_events_all on tour_events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists tour_artists_all on tour_artists;
create policy tour_artists_all on tour_artists for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists tour_vendors_all on tour_vendors;
create policy tour_vendors_all on tour_vendors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists tour_teams_all on tour_teams;
create policy tour_teams_all on tour_teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists tour_team_members_all on tour_team_members;
create policy tour_team_members_all on tour_team_members for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


