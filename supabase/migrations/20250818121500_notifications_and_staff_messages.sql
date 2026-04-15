set client_min_messages = warning;

-- Minimal notifications and staff_messages as per product definitions
create extension if not exists pgcrypto;

-- Notifications (generic)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  content text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
drop policy if exists notif_read_own on notifications;
create policy notif_read_own on notifications for select using (user_id = auth.uid());
drop policy if exists notif_write_own on notifications;
create policy notif_write_own on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Staff messages: integral staff communications (pre/post event planning)
create table if not exists staff_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  recipients uuid[] not null default '{}'::uuid[],
  subject text not null,
  content text not null,
  message_type text not null default 'internal',
  priority text not null default 'normal',
  read_by uuid[] not null default '{}'::uuid[],
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table staff_messages enable row level security;
drop policy if exists staff_messages_all on staff_messages;
create policy staff_messages_all on staff_messages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


