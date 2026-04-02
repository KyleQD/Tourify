create table if not exists public.artist_epk_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  template text not null default 'modern',
  is_public boolean not null default false,
  epk_slug text,
  custom_domain text,
  seo_title text,
  seo_description text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_artist_epk_settings_user_id on public.artist_epk_settings(user_id);
create unique index if not exists idx_artist_epk_settings_slug on public.artist_epk_settings(epk_slug) where epk_slug is not null;
create index if not exists idx_artist_epk_settings_public on public.artist_epk_settings(is_public) where is_public = true;

alter table public.artist_epk_settings
  add column if not exists epk_slug text,
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.artist_epk_settings enable row level security;

drop policy if exists "Users can view own epk settings" on public.artist_epk_settings;
create policy "Users can view own epk settings"
on public.artist_epk_settings
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own epk settings" on public.artist_epk_settings;
create policy "Users can insert own epk settings"
on public.artist_epk_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own epk settings" on public.artist_epk_settings;
create policy "Users can update own epk settings"
on public.artist_epk_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read public EPK settings" on public.artist_epk_settings;
create policy "Public can read public EPK settings"
on public.artist_epk_settings
for select
using (is_public = true);

create or replace function public.set_artist_epk_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artist_epk_settings_updated_at on public.artist_epk_settings;
create trigger trg_artist_epk_settings_updated_at
before update on public.artist_epk_settings
for each row
execute function public.set_artist_epk_settings_updated_at();
