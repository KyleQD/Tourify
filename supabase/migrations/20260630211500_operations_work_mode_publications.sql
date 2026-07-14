-- Operations tab completion: Work Mode publications, day sheet receipts, and logistics storage policy foundations.

create extension if not exists "pgcrypto";

alter table if exists public.day_sheets
  add column if not exists version integer not null default 1;

alter table if exists public.day_sheets
  add column if not exists site_map_id uuid references public.site_maps(id) on delete set null;

alter table if exists public.event_bulletins
  add column if not exists moderation_status text not null default 'approved'
  check (moderation_status in ('pending', 'approved', 'rejected'));

create table if not exists public.work_mode_publications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events_v2(id) on delete cascade,
  tour_id uuid references public.tours(id) on delete cascade,
  site_map_id uuid references public.site_maps(id) on delete set null,
  publication_type text not null check (publication_type in ('advance', 'day_sheet', 'command_broadcast', 'site_map')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  visible_to text[] not null default array['assigned_workers']::text[],
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_mode_publications_has_scope check (event_id is not null or tour_id is not null)
);

create index if not exists idx_work_mode_publications_event_id on public.work_mode_publications(event_id);
create index if not exists idx_work_mode_publications_tour_id on public.work_mode_publications(tour_id);
create index if not exists idx_work_mode_publications_site_map_id on public.work_mode_publications(site_map_id);
create index if not exists idx_work_mode_publications_type_status on public.work_mode_publications(publication_type, status);

alter table public.work_mode_publications enable row level security;

drop policy if exists work_mode_publications_select on public.work_mode_publications;
create policy work_mode_publications_select on public.work_mode_publications
  for select using (
    auth.uid() is not null and (
      exists (
        select 1
        from public.events_v2 e
        join public.org_members om on om.org_id = e.org_id
        where e.id = work_mode_publications.event_id
          and om.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.tours t
        join public.org_members om on om.org_id = t.org_id
        where t.id = work_mode_publications.tour_id
          and om.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.employment_assignments ea
        where ea.user_id = auth.uid()
          and ea.status in ('active', 'confirmed')
          and ea.event_id = work_mode_publications.event_id
      )
    )
  );

drop policy if exists work_mode_publications_manage on public.work_mode_publications;
create policy work_mode_publications_manage on public.work_mode_publications
  for all using (
    auth.uid() is not null and (
      exists (
        select 1
        from public.events_v2 e
        join public.org_members om on om.org_id = e.org_id
        where e.id = work_mode_publications.event_id
          and om.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.tours t
        join public.org_members om on om.org_id = t.org_id
        where t.id = work_mode_publications.tour_id
          and om.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() is not null and (
      exists (
        select 1
        from public.events_v2 e
        join public.org_members om on om.org_id = e.org_id
        where e.id = work_mode_publications.event_id
          and om.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.tours t
        join public.org_members om on om.org_id = t.org_id
        where t.id = work_mode_publications.tour_id
          and om.user_id = auth.uid()
      )
    )
  );

create table if not exists public.day_sheet_receipts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events_v2(id) on delete cascade,
  recipient_email text,
  recipient_user_id uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'acknowledged')),
  sent_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_day_sheet_receipts_event_id on public.day_sheet_receipts(event_id);
create index if not exists idx_day_sheet_receipts_user_id on public.day_sheet_receipts(recipient_user_id);
create unique index if not exists idx_day_sheet_receipts_unique_recipient_version
  on public.day_sheet_receipts (
    event_id,
    coalesce(recipient_email, ''),
    coalesce(recipient_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    version
  );

alter table public.day_sheet_receipts enable row level security;

drop policy if exists day_sheet_receipts_select on public.day_sheet_receipts;
create policy day_sheet_receipts_select on public.day_sheet_receipts
  for select using (
    recipient_user_id = auth.uid()
    or exists (
      select 1
      from public.events_v2 e
      join public.org_members om on om.org_id = e.org_id
      where e.id = day_sheet_receipts.event_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists day_sheet_receipts_manage on public.day_sheet_receipts;
create policy day_sheet_receipts_manage on public.day_sheet_receipts
  for all using (
    exists (
      select 1
      from public.events_v2 e
      join public.org_members om on om.org_id = e.org_id
      where e.id = day_sheet_receipts.event_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.events_v2 e
      join public.org_members om on om.org_id = e.org_id
      where e.id = day_sheet_receipts.event_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists day_sheet_receipts_acknowledge on public.day_sheet_receipts;
create policy day_sheet_receipts_acknowledge on public.day_sheet_receipts
  for update using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid() and status = 'acknowledged');

insert into storage.buckets (id, name, public)
values
  ('logistics-documents', 'logistics-documents', false),
  ('site-map-images', 'site-map-images', false),
  ('rental-attachments', 'rental-attachments', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "operations logistics read" on storage.objects;
create policy "operations logistics read" on storage.objects
  for select using (
    bucket_id in ('logistics-documents', 'site-map-images', 'rental-attachments')
    and auth.uid() is not null
  );

drop policy if exists "operations logistics upload" on storage.objects;
create policy "operations logistics upload" on storage.objects
  for insert with check (
    bucket_id in ('logistics-documents', 'site-map-images', 'rental-attachments')
    and auth.uid() is not null
  );

drop policy if exists "operations logistics update" on storage.objects;
create policy "operations logistics update" on storage.objects
  for update using (
    bucket_id in ('logistics-documents', 'site-map-images', 'rental-attachments')
    and auth.uid() is not null
  )
  with check (
    bucket_id in ('logistics-documents', 'site-map-images', 'rental-attachments')
    and auth.uid() is not null
  );

drop policy if exists "operations logistics delete" on storage.objects;
create policy "operations logistics delete" on storage.objects
  for delete using (
    bucket_id in ('logistics-documents', 'site-map-images', 'rental-attachments')
    and auth.uid() is not null
  );
