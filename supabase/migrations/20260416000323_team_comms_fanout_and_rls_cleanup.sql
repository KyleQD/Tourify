set client_min_messages = warning;

-- Allow newer notification types used by APIs (endorsements, hiring, logistics, broadcasts, etc.).
alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

-- Extend preference gate for team comms + admin broadcasts (aligns with app delivery).
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
    when 'team_communication', 'team_announcement' then
      if not prefs.enable_messages then return false; end if;
    when 'event_invite', 'event_reminder', 'booking_request', 'booking_accepted', 'booking_declined' then
      if not prefs.enable_events then return false; end if;
    when 'system_alert', 'maintenance', 'feature_update', 'security_alert', 'admin_broadcast' then
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

-- Fan-out in-app notifications to explicit recipients (push/email still via app services).
create or replace function public.notify_team_communication_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  prio text;
begin
  if new.recipients is null or cardinality(new.recipients) = 0 then
    return new;
  end if;

  prio := coalesce(nullif(trim(new.priority), ''), 'normal');

  foreach rid in array new.recipients
  loop
    if rid is null or rid = new.sender_id then
      continue;
    end if;

    if not public.should_send_notification(rid, 'team_communication', prio) then
      continue;
    end if;

    insert into public.notifications (
      user_id,
      type,
      title,
      content,
      summary,
      metadata,
      priority,
      is_read
    ) values (
      rid,
      'team_communication',
      new.subject,
      left(new.content, 4000),
      left(new.subject, 240),
      jsonb_build_object(
        'team_communication_id', new.id,
        'venue_id', new.venue_id,
        'sender_id', new.sender_id,
        'message_type', new.message_type
      ),
      prio,
      false
    );
  end loop;

  return new;
end;
$$;

do $tr$
begin
  if to_regclass('public.team_communications') is not null then
    execute 'drop trigger if exists tr_notify_team_communication_recipients on public.team_communications';
    execute 'create trigger tr_notify_team_communication_recipients
      after insert on public.team_communications
      for each row
      execute function public.notify_team_communication_recipients()';
  end if;
end $tr$;

-- Remove legacy permissive policies so entity-scoped rules are effective.
do $pol$
begin
  if to_regclass('public.team_communications') is not null then
    execute 'drop policy if exists read_all_comms on public.team_communications';
    execute 'drop policy if exists insert_comms on public.team_communications';
    execute 'drop policy if exists update_comms on public.team_communications';
  end if;
end $pol$;
