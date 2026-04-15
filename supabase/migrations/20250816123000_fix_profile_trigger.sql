set client_min_messages = warning;

-- Fix signup failure: make profile creation trigger idempotent and robust
-- Root cause: INSERT into public.profiles failed (duplicate key) when the user row
-- already had a profile (e.g., retried signup, partial state). We now UPSERT.

-- Ensure required extension
create extension if not exists pgcrypto;

-- Recreate handle_new_user() with UPSERT and sane fallbacks
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _username text;
  _full_name text;
begin
  -- Prefer explicit metadata; fallback to email prefix for username
  _username := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'username'), ''), split_part(coalesce(NEW.email, NEW.phone, NEW.id::text), '@', 1));
  _full_name := nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), '');

  insert into public.profiles (id, username, full_name, created_at, updated_at)
  values (NEW.id, _username, _full_name, now(), now())
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return NEW;
end
$$ language plpgsql security definer;

-- Recreate trigger to ensure it's present (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


