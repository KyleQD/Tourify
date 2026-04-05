-- Harden signup profile trigger so auth signup does not fail when
-- metadata is incomplete or username candidates collide.

create extension if not exists pgcrypto;

create or replace function public.generate_unique_username(base_username text, target_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  normalized_base text;
  candidate text;
  suffix integer := 0;
begin
  normalized_base := regexp_replace(lower(coalesce(trim(base_username), '')), '[^a-z0-9_-]+', '', 'g');
  if normalized_base = '' then
    normalized_base := 'creator';
  end if;

  candidate := left(normalized_base, 24);

  loop
    exit when not exists (
      select 1
      from public.profiles p
      where p.username = candidate
        and p.id <> target_user_id
    );

    suffix := suffix + 1;
    candidate := left(normalized_base, greatest(1, 24 - length(suffix::text) - 1)) || '-' || suffix::text;

    if suffix > 999 then
      candidate := left(normalized_base, 12) || '-' || left(target_user_id::text, 8);
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  base_username text;
  resolved_username text;
  resolved_full_name text;
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

  begin
    insert into public.profiles (id, username, full_name, created_at, updated_at)
    values (new.id, resolved_username, resolved_full_name, now(), now())
    on conflict (id) do update
      set username = coalesce(public.profiles.username, excluded.username),
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          updated_at = now();
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
