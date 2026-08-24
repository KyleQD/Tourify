-- Admin Content Hub: org-scoped social integrations + Meta media insights

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- organization_social_integrations
-- ---------------------------------------------------------------------------
create table if not exists public.organization_social_integrations (
  id uuid primary key default gen_random_uuid(),
  organizer_account_id uuid not null references public.organizer_accounts(id) on delete cascade,
  ops_org_id uuid not null,
  platform text not null check (platform in ('instagram', 'facebook', 'twitter', 'youtube', 'tiktok')),
  account_handle text not null default '',
  access_token text,
  refresh_token text,
  token_envelope jsonb,
  refresh_token_envelope jsonb,
  token_expires_at timestamptz,
  is_connected boolean not null default false,
  last_sync timestamptz,
  analytics jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (organizer_account_id, platform)
);

create index if not exists idx_org_social_integrations_org
  on public.organization_social_integrations (ops_org_id);

create index if not exists idx_org_social_integrations_organizer
  on public.organization_social_integrations (organizer_account_id);

create index if not exists idx_org_social_integrations_connected
  on public.organization_social_integrations (is_connected)
  where is_connected = true;

comment on table public.organization_social_integrations is
  'OAuth-connected social platforms for an organizer account (Admin Content Hub).';
comment on column public.organization_social_integrations.access_token is
  'Provider access token for Edge Function sync. Never expose via client APIs.';
comment on column public.organization_social_integrations.token_envelope is
  'Encrypted access token envelope (marketplace credential pattern).';

drop trigger if exists update_organization_social_integrations_updated_at
  on public.organization_social_integrations;
create trigger update_organization_social_integrations_updated_at
  before update on public.organization_social_integrations
  for each row execute function public.update_updated_at_column();

alter table public.organization_social_integrations enable row level security;

drop policy if exists "org_social_integrations_select" on public.organization_social_integrations;
create policy "org_social_integrations_select"
  on public.organization_social_integrations
  for select
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_integrations_insert" on public.organization_social_integrations;
create policy "org_social_integrations_insert"
  on public.organization_social_integrations
  for insert
  to authenticated
  with check (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_integrations_update" on public.organization_social_integrations;
create policy "org_social_integrations_update"
  on public.organization_social_integrations
  for update
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_integrations_delete" on public.organization_social_integrations;
create policy "org_social_integrations_delete"
  on public.organization_social_integrations
  for delete
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- organization_social_media_insights (Meta post-level metrics)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_social_media_insights (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null
    references public.organization_social_integrations(id) on delete cascade,
  organizer_account_id uuid not null references public.organizer_accounts(id) on delete cascade,
  ops_org_id uuid not null,
  platform text not null check (platform in ('instagram', 'facebook', 'twitter', 'youtube', 'tiktok')),
  media_id text not null,
  permalink text,
  caption text,
  media_type text,
  impressions integer not null default 0,
  reach integer not null default 0,
  engagement integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  posted_at timestamptz,
  synced_at timestamptz not null default timezone('utc'::text, now()),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (integration_id, media_id)
);

create index if not exists idx_org_social_media_insights_organizer
  on public.organization_social_media_insights (organizer_account_id, synced_at desc);

create index if not exists idx_org_social_media_insights_org
  on public.organization_social_media_insights (ops_org_id, platform);

drop trigger if exists update_organization_social_media_insights_updated_at
  on public.organization_social_media_insights;
create trigger update_organization_social_media_insights_updated_at
  before update on public.organization_social_media_insights
  for each row execute function public.update_updated_at_column();

alter table public.organization_social_media_insights enable row level security;

drop policy if exists "org_social_media_insights_select" on public.organization_social_media_insights;
create policy "org_social_media_insights_select"
  on public.organization_social_media_insights
  for select
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_media_insights_insert" on public.organization_social_media_insights;
create policy "org_social_media_insights_insert"
  on public.organization_social_media_insights
  for insert
  to authenticated
  with check (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_media_insights_update" on public.organization_social_media_insights;
create policy "org_social_media_insights_update"
  on public.organization_social_media_insights
  for update
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  )
  with check (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );

drop policy if exists "org_social_media_insights_delete" on public.organization_social_media_insights;
create policy "org_social_media_insights_delete"
  on public.organization_social_media_insights
  for delete
  to authenticated
  using (
    public.is_org_member(auth.uid(), ops_org_id)
    or exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.user_id = auth.uid()
    )
  );
