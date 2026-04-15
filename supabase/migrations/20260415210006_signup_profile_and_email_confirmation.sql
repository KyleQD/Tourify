-- Restore complete signup side-effects on auth.users insert (profile row with email,
-- active profile row, onboarding row) and keep profiles in sync when email is confirmed.

create extension if not exists pgcrypto;

-- Pin search_path on username helper (idempotent if already set)
do $body$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'generate_unique_username'
  ) then
    execute 'alter function public.generate_unique_username(text, uuid) set search_path to public';
  end if;
end;
$body$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  base_username text;
  resolved_username text;
  resolved_full_name text;
  resolved_account_type text;
  resolved_email text;
  allowed_types text[] := array['general', 'artist', 'venue', 'organization'];
begin
  resolved_email := nullif(trim(coalesce(new.email, '')), '');

  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, new.phone, new.id::text), '@', 1)
  );

  resolved_username := public.generate_unique_username(base_username, new.id);
  resolved_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    resolved_username
  );

  resolved_account_type := lower(trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'account_type', ''),
    'general'
  )));
  if not (resolved_account_type = any(allowed_types)) then
    resolved_account_type := 'general';
  end if;

  begin
    insert into public.profiles (
      id,
      name,
      username,
      full_name,
      email,
      account_type,
      onboarding_completed,
      created_at,
      updated_at
    )
    values (
      new.id,
      resolved_full_name,
      resolved_username,
      resolved_full_name,
      resolved_email,
      resolved_account_type,
      coalesce((new.raw_user_meta_data ->> 'onboarding_completed')::boolean, false),
      now(),
      now()
    )
    on conflict (id) do update
      set
        name = coalesce(excluded.name, public.profiles.name),
        username = coalesce(public.profiles.username, excluded.username),
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        email = coalesce(excluded.email, public.profiles.email),
        account_type = coalesce(excluded.account_type, public.profiles.account_type),
        updated_at = now();
  exception
    when others then
      raise warning 'handle_new_user profile upsert failed for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
  end;

  begin
    insert into public.user_active_profiles (user_id, active_profile_type, created_at, updated_at)
    values (new.id, 'general', now(), now())
    on conflict (user_id) do update
      set updated_at = now();
  exception
    when others then
      raise warning 'handle_new_user user_active_profiles upsert failed for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
  end;

  begin
    insert into public.onboarding (
      user_id,
      general_profile_completed,
      artist_profile_completed,
      venue_profile_completed,
      active_profile_type,
      steps,
      created_at,
      updated_at
    )
    values (
      new.id,
      false,
      false,
      false,
      'general',
      '{
        "general": {"basic_info": false, "preferences": false},
        "artist": {"basic_info": false, "genres": false, "social": false},
        "venue": {"basic_info": false, "location": false, "amenities": false}
      }'::jsonb,
      now(),
      now()
    )
    on conflict (user_id) do nothing;
  exception
    when others then
      raise warning 'handle_new_user onboarding insert failed for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
  end;

  return new;
exception
  when others then
    raise warning 'handle_new_user unexpected failure for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When Supabase sets email_confirmed_at, mirror email to profiles and mark verified.
create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  if tg_op = 'update' and old.email_confirmed_at is not distinct from new.email_confirmed_at then
    return new;
  end if;

  update public.profiles
  set
    email = coalesce(nullif(trim(new.email), ''), profiles.email),
    is_verified = true,
    updated_at = now()
  where id = new.id;

  return new;
exception
  when others then
    raise warning 'handle_auth_user_email_confirmed failed for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.handle_auth_user_email_confirmed();
