create table if not exists public.epk_telemetry (
  id uuid primary key default gen_random_uuid(),
  epk_slug text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_epk_telemetry_slug_created_at on public.epk_telemetry(epk_slug, created_at desc);
create index if not exists idx_epk_telemetry_event_type on public.epk_telemetry(event_type);

alter table public.epk_telemetry enable row level security;

drop policy if exists "Public can insert epk telemetry" on public.epk_telemetry;
create policy "Public can insert epk telemetry"
on public.epk_telemetry
for insert
with check (true);
