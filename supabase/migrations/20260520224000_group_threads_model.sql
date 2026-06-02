set client_min_messages = warning;

create table if not exists group_threads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  thread_type text not null default 'social' check (thread_type in ('social', 'project', 'tour')),
  created_by uuid not null references auth.users(id) on delete cascade,
  last_message_id uuid,
  context_type text,
  context_id uuid,
  is_admin_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists thread_members (
  thread_id uuid not null references group_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  muted_until timestamptz,
  left_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references group_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  message_type text not null default 'text',
  mentions uuid[] not null default '{}',
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_group_threads_updated_at on group_threads(updated_at desc);
create index if not exists idx_thread_members_user on thread_members(user_id) where left_at is null;
create index if not exists idx_group_messages_thread_created on group_messages(thread_id, created_at desc);

alter table group_threads enable row level security;
alter table thread_members enable row level security;
alter table group_messages enable row level security;

drop policy if exists group_threads_select_members on group_threads;
create policy group_threads_select_members on group_threads
for select using (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = group_threads.id
      and tm.user_id = auth.uid()
      and tm.left_at is null
  )
);

drop policy if exists group_threads_insert_creator on group_threads;
create policy group_threads_insert_creator on group_threads
for insert with check (created_by = auth.uid());

drop policy if exists group_threads_update_admin on group_threads;
create policy group_threads_update_admin on group_threads
for update using (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = group_threads.id
      and tm.user_id = auth.uid()
      and tm.left_at is null
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = group_threads.id
      and tm.user_id = auth.uid()
      and tm.left_at is null
      and tm.role in ('owner', 'admin')
  )
);

drop policy if exists thread_members_select_members on thread_members;
create policy thread_members_select_members on thread_members
for select using (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = thread_members.thread_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
  )
);

drop policy if exists thread_members_manage_admin on thread_members;
create policy thread_members_manage_admin on thread_members
for all using (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = thread_members.thread_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = thread_members.thread_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
      and tm.role in ('owner', 'admin')
  )
);

drop policy if exists group_messages_select_members on group_messages;
create policy group_messages_select_members on group_messages
for select using (
  exists (
    select 1
    from thread_members tm
    where tm.thread_id = group_messages.thread_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
  )
);

drop policy if exists group_messages_insert_members on group_messages;
create policy group_messages_insert_members on group_messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from thread_members tm
    where tm.thread_id = group_messages.thread_id
      and tm.user_id = auth.uid()
      and tm.left_at is null
  )
);

create or replace function update_group_thread_on_message()
returns trigger
language plpgsql
as $$
begin
  update group_threads
  set last_message_id = new.id,
      updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_group_thread_last_message on group_messages;
create trigger trg_group_thread_last_message
after insert on group_messages
for each row execute function update_group_thread_on_message();

create or replace function notify_group_message_recipients()
returns trigger
language plpgsql
as $$
declare
  recipient_row record;
begin
  for recipient_row in
    select tm.user_id
    from thread_members tm
    where tm.thread_id = new.thread_id
      and tm.left_at is null
      and tm.user_id <> new.sender_id
  loop
    if should_send_notification(recipient_row.user_id, 'group_message') then
      insert into notifications(
        user_id,
        related_user_id,
        type,
        title,
        content,
        metadata,
        created_at
      ) values (
        recipient_row.user_id,
        new.sender_id,
        'group_message',
        'New group message',
        left(new.content, 140),
        jsonb_build_object(
          'thread_id', new.thread_id,
          'message_id', new.id
        ),
        now()
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_group_message_notifications on group_messages;
create trigger trg_group_message_notifications
after insert on group_messages
for each row execute function notify_group_message_recipients();
