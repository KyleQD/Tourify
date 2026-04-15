set client_min_messages = warning;

-- Artist Business Core: contracts, campaigns, social posts, financial transactions
create extension if not exists "uuid-ossp";

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- artist_contracts
create table if not exists artist_contracts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('performance','licensing','recording','management','publishing','endorsement','other')),
  client_name text not null,
  client_email text,
  client_company text,
  amount numeric(10,2) default 0,
  currency text default 'USD',
  start_date date not null,
  end_date date,
  status text not null default 'draft' check (status in ('draft','sent','signed','expired','cancelled')),
  terms text,
  notes text,
  document_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);
alter table artist_contracts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'artist_contracts' and policyname = 'Artists can manage their own contracts') then
    create policy "Artists can manage their own contracts" on artist_contracts for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_artist_contracts_user_id on artist_contracts(user_id);
create index if not exists idx_artist_contracts_status on artist_contracts(status);
create index if not exists idx_artist_contracts_dates on artist_contracts(start_date, end_date);
drop trigger if exists update_artist_contracts_updated_at on artist_contracts;
create trigger update_artist_contracts_updated_at before update on artist_contracts for each row execute function update_updated_at_column();

-- artist_marketing_campaigns
create table if not exists artist_marketing_campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('song_release','album_release','tour_promotion','brand_awareness','engagement','custom')),
  status text not null default 'draft' check (status in ('draft','active','paused','completed','cancelled')),
  budget numeric(12,2) default 0,
  spent numeric(12,2) default 0,
  start_date date,
  end_date date,
  platforms text[] default '{}',
  objectives text[] default '{}',
  content_types text[] default '{}',
  description text,
  metrics jsonb default '{"impressions":0,"reach":0,"engagement":0,"clicks":0,"conversions":0}',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);
alter table artist_marketing_campaigns enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'artist_marketing_campaigns' and policyname = 'Artists can manage their own campaigns') then
    create policy "Artists can manage their own campaigns" on artist_marketing_campaigns for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_artist_marketing_campaigns_user on artist_marketing_campaigns(user_id);
create index if not exists idx_artist_marketing_campaigns_status on artist_marketing_campaigns(status);
drop trigger if exists update_artist_marketing_campaigns_updated_at on artist_marketing_campaigns;
create trigger update_artist_marketing_campaigns_updated_at before update on artist_marketing_campaigns for each row execute function update_updated_at_column();

-- artist_social_posts
create table if not exists artist_social_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('instagram','facebook','twitter','youtube','tiktok')),
  content text not null,
  media_type text not null check (media_type in ('text','image','video','audio')),
  media_url text,
  scheduled_for timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','published','failed')),
  campaign_id uuid references artist_marketing_campaigns(id) on delete set null,
  hashtags text[] default '{}',
  mentions text[] default '{}',
  metrics jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);
alter table artist_social_posts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'artist_social_posts' and policyname = 'Artists can manage their own posts') then
    create policy "Artists can manage their own posts" on artist_social_posts for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_artist_social_posts_user on artist_social_posts(user_id);
create index if not exists idx_artist_social_posts_status on artist_social_posts(status);
create index if not exists idx_artist_social_posts_scheduled on artist_social_posts(scheduled_for);
drop trigger if exists update_artist_social_posts_updated_at on artist_social_posts;
create trigger update_artist_social_posts_updated_at before update on artist_social_posts for each row execute function update_updated_at_column();

-- artist_financial_transactions
create table if not exists artist_financial_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income','expense','royalty','merchandise','event','other')),
  source_table text,
  source_id uuid,
  amount numeric(12,2) not null,
  currency text default 'USD',
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'completed' check (status in ('completed','pending','failed')),
  description text,
  metadata jsonb default '{}',
  created_at timestamptz default timezone('utc'::text, now()) not null
);
alter table artist_financial_transactions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'artist_financial_transactions' and policyname = 'Artists can manage their own transactions') then
    create policy "Artists can manage their own transactions" on artist_financial_transactions for all using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_artist_fin_tx_user_time on artist_financial_transactions(user_id, occurred_at desc);
create index if not exists idx_artist_fin_tx_type on artist_financial_transactions(type);


