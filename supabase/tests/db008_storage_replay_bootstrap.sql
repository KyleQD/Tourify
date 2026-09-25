-- Throwaway emulation of the Supabase storage bootstrap, used ONLY to prove the
-- CP-059 replay-guard pattern. No migration from the repository is applied to
-- any real or shared environment; this cluster is created under a temp dir,
-- listens on a unix socket, and is destroyed at the end of the run.
--
-- Fully idempotent: the harness re-runs this after every scenario, and roles are
-- cluster-wide while schemas are per-database.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'auth_admin') then
    create role auth_admin nologin noinherit;
  end if;
end
$$;

create schema if not exists auth authorization auth_admin;
create schema if not exists storage authorization supabase_storage_admin;

create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner uuid
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;

-- In the real Supabase layout the storage relations and helpers are owned by
-- supabase_storage_admin. A superuser bootstrap would otherwise leave them
-- owned by postgres, which would make pg_class_ownercheck accept the replay role
-- and the whole harness vacuous.
alter table storage.objects owner to supabase_storage_admin;
alter table storage.buckets owner to supabase_storage_admin;
alter function storage.foldername(text) owner to supabase_storage_admin;

-- Minimal public-schema relations the storage policy bodies in the migrations
-- under test reference. Without them both the original and the guarded form
-- would fail for an unrelated reason and the comparison would be vacuous.
create schema if not exists public;
create table if not exists public.project_collaborators (
  project_id uuid not null,
  user_id uuid,
  status text,
  permissions jsonb
);
alter table public.project_collaborators owner to supabase_storage_admin;
