set client_min_messages = warning;

create table if not exists public.site_map_share_tokens (
  id uuid primary key default gen_random_uuid(),
  site_map_id uuid not null references public.site_maps(id) on delete cascade,
  token text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_map_share_tokens_site_map_id
  on public.site_map_share_tokens(site_map_id);

alter table public.site_map_share_tokens enable row level security;

drop policy if exists "site_map_share_tokens_select" on public.site_map_share_tokens;
create policy "site_map_share_tokens_select"
  on public.site_map_share_tokens for select
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = site_map_id and sm.created_by = auth.uid()
    )
  );

drop policy if exists "site_map_share_tokens_insert" on public.site_map_share_tokens;
create policy "site_map_share_tokens_insert"
  on public.site_map_share_tokens for insert
  with check (
    exists (
      select 1 from public.site_maps sm
      where sm.id = site_map_id and sm.created_by = auth.uid()
    )
  );

drop policy if exists "site_map_share_tokens_update" on public.site_map_share_tokens;
create policy "site_map_share_tokens_update"
  on public.site_map_share_tokens for update
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = site_map_id and sm.created_by = auth.uid()
    )
  );
