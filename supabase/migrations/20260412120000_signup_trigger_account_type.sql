set client_min_messages = warning;

-- Extend handle_new_user() trigger to read account_type from user metadata
-- and persist it to profiles.account_type on signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  base_username text;
  resolved_username text;
  resolved_full_name text;
  resolved_account_type text;
  allowed_types text[] := array['general','artist','venue','organization'];
begin
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
    insert into public.profiles (id, username, full_name, account_type, created_at, updated_at)
    values (new.id, resolved_username, resolved_full_name, resolved_account_type, now(), now())
    on conflict (id) do update
      set username     = coalesce(public.profiles.username, excluded.username),
          full_name    = coalesce(excluded.full_name, public.profiles.full_name),
          account_type = coalesce(excluded.account_type, public.profiles.account_type),
          updated_at   = now();
  exception
    when others then
      raise warning 'handle_new_user profile upsert failed for user %: % (SQLSTATE: %)', new.id, sqlerrm, sqlstate;
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
