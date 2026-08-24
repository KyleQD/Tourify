-- Tighten account_relationships INSERT policy: owner must own the linked profile
-- Prevents privilege escalation via link_existing without profile ownership

create table if not exists public.account_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  owned_profile_id uuid not null references public.profiles(id) on delete cascade,
  account_type text not null check (account_type in ('artist', 'venue', 'organization', 'service', 'admin', 'staff')),
  permissions jsonb default '{
    "can_post": true,
    "can_manage_settings": true,
    "can_view_analytics": true,
    "can_manage_content": true
  }'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(owner_user_id, owned_profile_id)
);

alter table public.account_relationships enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_relationships'
      and policyname = 'account_relationships_owner_manage'
  ) then
    create policy account_relationships_owner_manage
      on public.account_relationships
      for all
      to authenticated
      using (
        owner_user_id = (select auth.uid())
        or owner_profile_id = (select auth.uid())
      )
      with check (
        owner_user_id = (select auth.uid())
        or owner_profile_id = (select auth.uid())
      );
  end if;
end $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'account_relationships'
  ) THEN
    DROP POLICY IF EXISTS account_relationships_insert_own ON account_relationships;
    DROP POLICY IF EXISTS "Users can insert own account relationships" ON account_relationships;

    CREATE POLICY account_relationships_insert_own ON account_relationships
      FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_user_id = auth.uid()
        AND (
          owned_profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM artist_profiles ap
            WHERE ap.id = owned_profile_id AND ap.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM venue_profiles vp
            WHERE vp.id = owned_profile_id AND vp.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM organizer_accounts oa
            WHERE oa.id = owned_profile_id AND oa.user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;
