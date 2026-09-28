set client_min_messages = warning;

-- Staff Operations reuses the existing group messaging model. Membership stays
-- explicit and account lookup stays index-backed; no automatic roster sync.
alter table public.group_threads
  drop constraint if exists group_threads_thread_type_check;

alter table public.group_threads
  add constraint group_threads_thread_type_check
  check (thread_type in ('social', 'project', 'tour', 'logistics', 'staff'));

alter table public.thread_members
  add column if not exists last_read_at timestamptz default now();

create index if not exists idx_group_threads_staff_context
  on public.group_threads (context_type, context_id, updated_at desc)
  where thread_type = 'staff';

create index if not exists idx_thread_members_active_thread_user
  on public.thread_members (thread_id, user_id)
  where left_at is null;

create index if not exists idx_thread_members_active_user_thread
  on public.thread_members (user_id, thread_id)
  where left_at is null;

-- Completion/request producers use one stable metadata key. The partial unique
-- index makes retries and concurrent callbacks idempotent without a second log.
create unique index if not exists idx_notifications_workforce_activity_dedupe
  on public.notifications (user_id, ((metadata ->> 'dedupe_key')))
  where metadata ? 'dedupe_key';

create index if not exists idx_notifications_workforce_unread
  on public.notifications (user_id, target_profile_id, created_at desc)
  where is_read = false
    and type in (
      'workflow_task_completed',
      'event_task_completed',
      'task_completed',
      'shift_assignment_response',
      'staff_time_off_request',
      'workforce_availability_request',
      'shift_swap_request',
      'shift_drop_request',
      'shift_pickup_request',
      'workforce_request_submitted'
    );
