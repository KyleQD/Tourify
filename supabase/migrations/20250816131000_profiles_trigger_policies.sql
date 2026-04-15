set client_min_messages = warning;

-- Allow trigger to upsert into profiles during auth.users insert safely

alter table profiles enable row level security;

-- Ensure an insert policy exists that allows trigger execution
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (
    -- allow inserts from authenticated users for themselves
    auth.uid() = id
    or
    -- allow trigger (no auth.uid()) to insert as part of auth.users creation
    current_setting('role', true) in ('supabase_auth_admin', 'service_role')
  );


