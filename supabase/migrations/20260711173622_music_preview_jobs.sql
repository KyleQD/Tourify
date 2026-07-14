set client_min_messages = warning;

-- Async preview generation for native music playback.
-- Production clipping is handled by a worker, not by Next.js request handlers.

alter table public.artist_music
  add column if not exists preview_status text not null default 'not_required',
  add column if not exists preview_error text,
  add column if not exists preview_generated_at timestamptz;

update public.artist_music
set preview_status = case
  when coalesce(preview_mode, 'full') <> 'clip' then 'not_required'
  when preview_storage_path is not null or preview_file_url is not null then 'ready'
  when preview_status = 'not_required' then 'pending'
  else preview_status
end;

alter table public.artist_music
  drop constraint if exists artist_music_preview_status_check,
  add constraint artist_music_preview_status_check
    check (preview_status in ('not_required', 'pending', 'ready', 'failed'));

alter table public.artist_music
  drop constraint if exists artist_music_preview_storage_required_check,
  add constraint artist_music_preview_storage_required_check
    check (
      preview_mode <> 'clip'
      or preview_status in ('pending', 'failed')
      or preview_storage_path is not null
      or preview_file_url is not null
    );

alter table public.artist_music
  drop constraint if exists artist_music_public_preview_ready_check,
  add constraint artist_music_public_preview_ready_check
    check (
      is_public = false
      or preview_mode <> 'clip'
      or (
        preview_status = 'ready'
        and (preview_storage_path is not null or preview_file_url is not null)
      )
    );

create table if not exists public.music_preview_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  music_id uuid not null references public.artist_music(id) on delete cascade,
  artist_user_id uuid not null references public.profiles(id) on delete cascade,
  source_bucket text not null default 'artist-music',
  source_path text not null,
  preview_bucket text not null default 'artist-music',
  preview_path text,
  duration_seconds integer not null default 15
    check (duration_seconds between 1 and 600),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed', 'canceled')),
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.music_preview_generation_jobs enable row level security;

drop policy if exists "Artists can read own preview jobs" on public.music_preview_generation_jobs;
create policy "Artists can read own preview jobs" on public.music_preview_generation_jobs
  for select
  using (artist_user_id = auth.uid());

drop policy if exists "Artists can insert own preview jobs" on public.music_preview_generation_jobs;
drop policy if exists "Artists can update own preview jobs" on public.music_preview_generation_jobs;
drop policy if exists "Anyone can insert preview jobs" on public.music_preview_generation_jobs;
drop policy if exists "Anyone can update preview jobs" on public.music_preview_generation_jobs;
-- Job writes are performed by trusted API routes or workers with service role.

create index if not exists idx_music_preview_jobs_status_created
  on public.music_preview_generation_jobs (status, created_at)
  where status in ('queued', 'processing');

create index if not exists idx_music_preview_jobs_music_created
  on public.music_preview_generation_jobs (music_id, created_at desc);

create index if not exists idx_artist_music_preview_status
  on public.artist_music (user_id, preview_status, updated_at desc);

drop trigger if exists set_music_preview_generation_jobs_updated_at on public.music_preview_generation_jobs;
create trigger set_music_preview_generation_jobs_updated_at
  before update on public.music_preview_generation_jobs
  for each row
  execute function public.set_updated_at();
