set client_min_messages = warning;

-- Profile Content Core: top skills, endorsements, portfolio, experience, certifications
-- Non-destructive: creates columns/tables/policies if missing

begin;

-- Augment profiles with top_skills and account_tier
alter table profiles
  add column if not exists top_skills text[],
  add column if not exists account_tier text default 'free' check (account_tier in ('free','pro','business'));

-- Skill endorsements: unique per (endorser, endorsed, skill)
create table if not exists skill_endorsements (
  id uuid primary key default gen_random_uuid(),
  endorsed_id uuid not null references profiles(id) on delete cascade,
  endorser_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  created_at timestamptz default now(),
  unique (endorser_id, endorsed_id, skill)
);

-- Portfolio items
create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('album','music','video','merch','image','link','text')),
  title text not null,
  description text,
  tags text[],
  media jsonb default '[]'::jsonb, -- array of { kind: 'image'|'video'|'audio'|'file', url, meta }
  links jsonb default '[]'::jsonb, -- array of { label, url }
  order_index int default 0,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Experiences
create table if not exists profile_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  organization text,
  start_date date,
  end_date date,
  is_current boolean default false,
  description text,
  tags text[],
  source text default 'manual' check (source in ('manual','job','collaboration')),
  source_id uuid,
  is_visible boolean default true,
  order_index int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Certifications
create table if not exists profile_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  authority text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table skill_endorsements enable row level security;
alter table portfolio_items enable row level security;
alter table profile_experiences enable row level security;
alter table profile_certifications enable row level security;

-- RLS policies
do $$
begin
  -- Endorsements: public read; endorser can insert/delete own
  if not exists (select 1 from pg_policies where tablename='skill_endorsements' and policyname='Read endorsements') then
    create policy "Read endorsements" on skill_endorsements for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='skill_endorsements' and policyname='Create own endorsement') then
    create policy "Create own endorsement" on skill_endorsements for insert with check (endorser_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='skill_endorsements' and policyname='Delete own endorsement') then
    create policy "Delete own endorsement" on skill_endorsements for delete using (endorser_id = auth.uid());
  end if;

  -- Portfolio: public read if is_public; owner full
  if not exists (select 1 from pg_policies where tablename='portfolio_items' and policyname='Read public portfolio') then
    create policy "Read public portfolio" on portfolio_items for select using (is_public or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='portfolio_items' and policyname='Manage own portfolio') then
    create policy "Manage own portfolio" on portfolio_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- Experience: public read if visible; owner full
  if not exists (select 1 from pg_policies where tablename='profile_experiences' and policyname='Read visible experiences') then
    create policy "Read visible experiences" on profile_experiences for select using (is_visible or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='profile_experiences' and policyname='Manage own experiences') then
    create policy "Manage own experiences" on profile_experiences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- Certifications: public read if public; owner full
  if not exists (select 1 from pg_policies where tablename='profile_certifications' and policyname='Read public certifications') then
    create policy "Read public certifications" on profile_certifications for select using (is_public or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='profile_certifications' and policyname='Manage own certifications') then
    create policy "Manage own certifications" on profile_certifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;

commit;


