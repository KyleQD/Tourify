-- Notification ecosystem: sms_enabled, should_send_notification semantics,
-- trigger preference checks, tight notifications INSERT RLS, delivery log table.
-- Verify in production: Realtime publication for public.notifications (Dashboard → Replication).

set client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- 1) notification_preferences.sms_enabled
-- -----------------------------------------------------------------------------
alter table if exists public.notification_preferences
  add column if not exists sms_enabled boolean not null default false;

comment on column public.notification_preferences.sms_enabled is
  'User opt-in for SMS; outbound delivery must also check per-type preferences JSON.';

-- -----------------------------------------------------------------------------
-- 2) notification_delivery_log (used by OptimizedNotificationService metrics)
-- -----------------------------------------------------------------------------
create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  channels jsonb not null default '{}'::jsonb,
  status text default 'pending'
);

create index if not exists idx_notification_delivery_log_notification_id
  on public.notification_delivery_log (notification_id);

create index if not exists idx_notification_delivery_log_user_id
  on public.notification_delivery_log (user_id, created_at desc);

alter table public.notification_delivery_log enable row level security;

drop policy if exists notification_delivery_log_select_own on public.notification_delivery_log;
create policy notification_delivery_log_select_own on public.notification_delivery_log
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notification_delivery_log_insert_service on public.notification_delivery_log;
create policy notification_delivery_log_insert_service on public.notification_delivery_log
  for insert to service_role
  with check (true);

grant select on public.notification_delivery_log to authenticated;
grant all on public.notification_delivery_log to service_role;

-- -----------------------------------------------------------------------------
-- 3) should_send_notification — type + quiet hours only (not in_app_enabled).
--    In-app feed visibility is enforced in application queries when in_app_enabled is false.
-- -----------------------------------------------------------------------------
create or replace function public.should_send_notification(
  p_user_id uuid,
  p_notification_type text,
  p_priority text default 'normal'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  prefs record;
  at_time time;
begin
  select * into prefs
  from public.notification_preferences
  where user_id = p_user_id;

  if prefs is null then
    return true;
  end if;

  case p_notification_type
    when 'like' then
      if not prefs.enable_likes then return false; end if;
    when 'comment' then
      if not prefs.enable_comments then return false; end if;
    when 'share' then
      if not prefs.enable_shares then return false; end if;
    when 'follow', 'follow_request', 'follow_accepted', 'unfollow' then
      if not prefs.enable_follows then return false; end if;
    when 'message', 'message_request', 'group_message' then
      if not prefs.enable_messages then return false; end if;
    when 'event_invite', 'event_reminder', 'booking_request', 'booking_accepted', 'booking_declined' then
      if not prefs.enable_events then return false; end if;
    when 'system_alert', 'maintenance', 'feature_update', 'security_alert' then
      if not prefs.enable_system then return false; end if;
    else
      null;
  end case;

  if prefs.quiet_hours_enabled and coalesce(p_priority, 'normal') = 'normal' then
    at_time := current_time;
    if prefs.quiet_hours_start > prefs.quiet_hours_end then
      if at_time >= prefs.quiet_hours_start or at_time <= prefs.quiet_hours_end then
        return false;
      end if;
    else
      if at_time >= prefs.quiet_hours_start and at_time <= prefs.quiet_hours_end then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.should_send_notification(uuid, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4) Social + follow triggers respect should_send_notification
-- -----------------------------------------------------------------------------
create or replace function public.create_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  liker_profile record;
  post_content_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'like',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into liker_profile
  from public.profiles where id = new.user_id;

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read
    ) values (
      post_author_id, 'like', 'New Like',
      coalesce(liker_profile.full_name, liker_profile.username, 'Someone')
        || ' liked your post: "' || post_content_preview || '"',
      'New like received',
      new.user_id, new.post_id, 'post',
      'normal', false
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  commenter_profile record;
  post_content_preview text;
  comment_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'comment',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into commenter_profile
  from public.profiles where id = new.user_id;

  comment_preview := left(new.content, 50);

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata
    ) values (
      post_author_id, 'comment', 'New Comment',
      coalesce(commenter_profile.full_name, commenter_profile.username, 'Someone')
        || ' commented on your post: "' || comment_preview || '"',
      'New comment received',
      new.user_id, new.post_id, 'post',
      'normal', false,
      jsonb_build_object(
        'post_content', post_content_preview,
        'comment_id', new.id,
        'comment_preview', comment_preview
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_share_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  sharer_profile record;
  post_content_preview text;
begin
  if not public.should_send_notification(
    (select user_id from public.posts where id = new.post_id),
    'share',
    'normal'
  ) then
    return new;
  end if;

  select user_id, left(content, 100) into post_author_id, post_content_preview
  from public.posts where id = new.post_id;

  select full_name, username into sharer_profile
  from public.profiles where id = new.user_id;

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (
      user_id, type, title, content, summary,
      related_user_id, related_content_id, related_content_type,
      priority, is_read, metadata
    ) values (
      post_author_id, 'share', 'Post Shared',
      coalesce(sharer_profile.full_name, sharer_profile.username, 'Someone')
        || ' shared your post: "' || post_content_preview || '"',
      'Post shared',
      new.user_id, new.post_id, 'post',
      'normal', false,
      jsonb_build_object(
        'post_content', post_content_preview,
        'shared_to', coalesce(new.shared_to, 'feed')
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_follow_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_profile record;
begin
  if not public.should_send_notification(new.target_id, 'follow_request', 'normal') then
    return new;
  end if;

  select full_name, username into requester_profile
  from public.profiles
  where id = new.requester_id
  limit 1;

  insert into public.notifications (
    user_id, type, title, content, summary, related_user_id, priority, is_read
  ) values (
    new.target_id,
    'follow_request',
    'New Follow Request',
    coalesce(requester_profile.full_name, requester_profile.username, 'Someone') || ' wants to follow you',
    'New follow request',
    new.requester_id,
    'normal',
    false
  );

  return new;
end;
$$;

create or replace function public.create_follow_acceptance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile record;
begin
  if new.status = 'accepted' and (old.status is null or old.status <> 'accepted') then
    if not public.should_send_notification(new.requester_id, 'follow_accepted', 'normal') then
      return new;
    end if;

    select full_name, username into target_profile
    from public.profiles
    where id = new.target_id
    limit 1;

    insert into public.notifications (
      user_id, type, title, content, summary, related_user_id, priority, is_read
    ) values (
      new.requester_id,
      'follow_accepted',
      'Follow Request Accepted',
      coalesce(target_profile.full_name, target_profile.username, 'User') || ' accepted your follow request',
      'Follow request accepted',
      new.target_id,
      'normal',
      false
    );
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) Tighten notifications INSERT for authenticated clients (triggers bypass RLS)
-- -----------------------------------------------------------------------------
drop policy if exists notifications_insert on public.notifications;

create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (user_id = (select auth.uid()));
