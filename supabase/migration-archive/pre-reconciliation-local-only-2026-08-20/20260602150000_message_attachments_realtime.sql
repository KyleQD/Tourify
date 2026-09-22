set client_min_messages = warning;

-- Message attachments for DMs and group threads
alter table messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table group_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table event_group_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Storage bucket for chat attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'audio/webm',
    'audio/mpeg',
    'audio/wav'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload message attachments" on storage.objects;
create policy "Authenticated users can upload message attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'message-attachments');

drop policy if exists "Anyone can read message attachments" on storage.objects;
create policy "Anyone can read message attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'message-attachments');

-- Realtime publications for messaging tables
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'event_group_messages'
  ) then
    alter publication supabase_realtime add table public.event_group_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
