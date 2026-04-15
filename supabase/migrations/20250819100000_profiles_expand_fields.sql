set client_min_messages = warning;

-- Expand profiles table with additional columns for user settings and visibility
-- Non-destructive: only adds columns/constraints if missing. No data resets.

begin;

-- Core scalar fields
alter table profiles
  add column if not exists title text,
  add column if not exists company text,
  add column if not exists experience_level text,
  add column if not exists availability_status text,
  add column if not exists hourly_rate integer,
  add column if not exists skills text[],
  add column if not exists preferred_project_types text[],
  add column if not exists instagram text,
  add column if not exists twitter text,
  add column if not exists show_hourly_rate boolean default false,
  add column if not exists show_availability boolean default true,
  add column if not exists allow_project_offers boolean default true,
  add column if not exists public_profile boolean default true,
  add column if not exists profile_data jsonb default '{}'::jsonb,
  add column if not exists social_links jsonb default '{}'::jsonb;

-- Ensure full_name exists in some environments
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and table_schema = 'public' and column_name = 'full_name'
  ) then
    alter table profiles add column full_name text;
  end if;
end$$;

-- Ensure visibility flags exist (older environments)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and table_schema = 'public' and column_name = 'show_email'
  ) then
    alter table profiles add column show_email boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and table_schema = 'public' and column_name = 'show_phone'
  ) then
    alter table profiles add column show_phone boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and table_schema = 'public' and column_name = 'show_location'
  ) then
    alter table profiles add column show_location boolean default true;
  end if;
end$$;

-- Add CHECK constraints if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_profiles_experience_level'
  ) then
    alter table profiles
    add constraint chk_profiles_experience_level
    check (experience_level is null or experience_level in ('entry','mid','senior','expert'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_profiles_availability_status'
  ) then
    alter table profiles
    add constraint chk_profiles_availability_status
    check (availability_status is null or availability_status in ('available','busy','unavailable'));
  end if;
end$$;

commit;


