set client_min_messages = warning;

-- Artist social integrations: connect external social media accounts
create table if not exists artist_social_integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('instagram','facebook','twitter','youtube','tiktok')),
  account_handle text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean default false,
  last_sync timestamptz,
  analytics jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, platform)
);

alter table artist_social_integrations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'artist_social_integrations' and policyname = 'Users manage own artist social integrations'
  ) then
    create policy "Users manage own artist social integrations" on artist_social_integrations
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_artist_social_integrations_user on artist_social_integrations(user_id);
create index if not exists idx_artist_social_integrations_platform on artist_social_integrations(platform);

drop trigger if exists update_artist_social_integrations_updated_at on artist_social_integrations;
create trigger update_artist_social_integrations_updated_at
  before update on artist_social_integrations
  for each row execute function update_updated_at_column();


