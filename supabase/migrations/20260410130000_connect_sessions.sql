create table if not exists public.connect_sessions (
  id uuid primary key,
  sharer_user_id uuid not null references auth.users(id) on delete cascade,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  token_hash text not null unique,
  handshake_method text not null check (handshake_method in ('nfc_ble')),
  one_time_claim boolean not null default true,
  status text not null default 'active' check (status in ('active', 'claimed', 'confirmed', 'revoked', 'expired')),
  profile_preview jsonb not null default '{}'::jsonb,
  last_transport_proof jsonb,
  last_device_context jsonb,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_connect_sessions_sharer_user_id
  on public.connect_sessions (sharer_user_id);

create index if not exists idx_connect_sessions_claimed_by_user_id
  on public.connect_sessions (claimed_by_user_id);

create index if not exists idx_connect_sessions_expires_at
  on public.connect_sessions (expires_at);

create index if not exists idx_connect_sessions_status
  on public.connect_sessions (status);

alter table public.connect_sessions enable row level security;

create policy "connect_sessions_select_involved_users"
  on public.connect_sessions
  for select
  using (
    auth.uid() = sharer_user_id
    or auth.uid() = claimed_by_user_id
  );

create policy "connect_sessions_insert_owner"
  on public.connect_sessions
  for insert
  with check (auth.uid() = sharer_user_id);

create policy "connect_sessions_update_claim_or_owner"
  on public.connect_sessions
  for update
  using (
    auth.uid() = sharer_user_id
    or auth.uid() = claimed_by_user_id
    or claimed_by_user_id is null
  )
  with check (
    auth.uid() = sharer_user_id
    or auth.uid() = claimed_by_user_id
  );
