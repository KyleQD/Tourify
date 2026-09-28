-- Add description + is_public for artist event producer saves
alter table public.events
  add column if not exists description text,
  add column if not exists is_public boolean default true;

comment on column public.events.description is 'Artist/public event description for legacy events table';
comment on column public.events.is_public is 'Derived from producer_settings.visibility; unlisted and public are linkable';
