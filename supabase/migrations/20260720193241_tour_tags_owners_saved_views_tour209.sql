-- TOUR-209 — Tour tags, owner/lead, and organization/personal saved views.
-- Additive only. Never reset the database.

set client_min_messages = warning;

alter table public.tours
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null,
  add column if not exists lead_user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_tours_org_owner
  on public.tours (org_id, owner_user_id)
  where owner_user_id is not null;

create index if not exists idx_tours_org_lead
  on public.tours (org_id, lead_user_id)
  where lead_user_id is not null;

create table if not exists public.org_tour_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  label text not null,
  color text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_tour_tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint org_tour_tags_org_slug unique (org_id, slug)
);

create table if not exists public.tour_tag_links (
  tour_id uuid not null references public.tours (id) on delete cascade,
  tag_id uuid not null references public.org_tour_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (tour_id, tag_id)
);

create index if not exists idx_tour_tag_links_tag
  on public.tour_tag_links (tag_id);

create table if not exists public.tour_saved_views (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  scope text not null check (scope in ('personal', 'organization')),
  owner_user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_saved_views_personal_owner check (
    (scope = 'personal' and owner_user_id is not null)
    or (scope = 'organization')
  ),
  constraint tour_saved_views_name_len check (char_length(trim(name)) between 1 and 120)
);

create index if not exists idx_tour_saved_views_org_scope
  on public.tour_saved_views (org_id, scope, updated_at desc);

create unique index if not exists idx_tour_saved_views_personal_name
  on public.tour_saved_views (org_id, owner_user_id, lower(name))
  where scope = 'personal';

create unique index if not exists idx_tour_saved_views_org_name
  on public.tour_saved_views (org_id, lower(name))
  where scope = 'organization';

alter table public.org_tour_tags enable row level security;
alter table public.org_tour_tags force row level security;
alter table public.tour_tag_links enable row level security;
alter table public.tour_tag_links force row level security;
alter table public.tour_saved_views enable row level security;
alter table public.tour_saved_views force row level security;

drop policy if exists org_tour_tags_select on public.org_tour_tags;
create policy org_tour_tags_select on public.org_tour_tags
  for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists org_tour_tags_write on public.org_tour_tags;
create policy org_tour_tags_write on public.org_tour_tags
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_tag_links_select on public.tour_tag_links;
create policy tour_tag_links_select on public.tour_tag_links
  for select to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_id and public.is_org_member(auth.uid(), t.org_id)
    )
  );

drop policy if exists tour_tag_links_write on public.tour_tag_links;
create policy tour_tag_links_write on public.tour_tag_links
  for all to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_id and public.is_org_member(auth.uid(), t.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.tours t
      where t.id = tour_id and public.is_org_member(auth.uid(), t.org_id)
    )
  );

drop policy if exists tour_saved_views_select on public.tour_saved_views;
create policy tour_saved_views_select on public.tour_saved_views
  for select to authenticated
  using (
    public.is_org_member(auth.uid(), org_id)
    and (
      scope = 'organization'
      or owner_user_id = auth.uid()
    )
  );

drop policy if exists tour_saved_views_insert on public.tour_saved_views;
create policy tour_saved_views_insert on public.tour_saved_views
  for insert to authenticated
  with check (
    public.is_org_member(auth.uid(), org_id)
    and (
      (scope = 'personal' and owner_user_id = auth.uid())
      or scope = 'organization'
    )
  );

drop policy if exists tour_saved_views_update on public.tour_saved_views;
create policy tour_saved_views_update on public.tour_saved_views
  for update to authenticated
  using (
    public.is_org_member(auth.uid(), org_id)
    and (
      (scope = 'personal' and owner_user_id = auth.uid())
      or scope = 'organization'
    )
  )
  with check (
    public.is_org_member(auth.uid(), org_id)
    and (
      (scope = 'personal' and owner_user_id = auth.uid())
      or scope = 'organization'
    )
  );

drop policy if exists tour_saved_views_delete on public.tour_saved_views;
create policy tour_saved_views_delete on public.tour_saved_views
  for delete to authenticated
  using (
    public.is_org_member(auth.uid(), org_id)
    and (
      (scope = 'personal' and owner_user_id = auth.uid())
      or scope = 'organization'
    )
  );

comment on table public.tour_saved_views is
  'TOUR-209 personal/org portfolio saved views; filters/columns revalidated on apply.';
