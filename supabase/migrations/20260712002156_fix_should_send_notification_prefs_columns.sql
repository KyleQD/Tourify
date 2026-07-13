-- Fix should_send_notification for the live notification_preferences schema.
-- Live table uses channel/quiet-hour columns + preferences JSONB, not enable_* booleans.
-- Accessing missing record fields (e.g. prefs.enable_follows) raised 42703 and
-- aborted follow-request accept updates via create_follow_acceptance_notification.

set client_min_messages = warning;

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
  prefs jsonb;
  at_time time;
  quiet_enabled boolean;
  quiet_start time;
  quiet_end time;
  category_enabled boolean;
begin
  select to_jsonb(np.*)
  into prefs
  from public.notification_preferences np
  where np.user_id = p_user_id;

  if prefs is null then
    return true;
  end if;

  -- Prefer legacy enable_* columns when present; otherwise allow (JSONB missing key => null).
  if p_notification_type = 'like' then
    category_enabled := coalesce((prefs->>'enable_likes')::boolean, true);
  elsif p_notification_type = 'comment' then
    category_enabled := coalesce((prefs->>'enable_comments')::boolean, true);
  elsif p_notification_type = 'share' then
    category_enabled := coalesce((prefs->>'enable_shares')::boolean, true);
  elsif p_notification_type in ('follow', 'follow_request', 'follow_accepted', 'unfollow') then
    category_enabled := coalesce((prefs->>'enable_follows')::boolean, true);
  elsif p_notification_type in ('message', 'message_request', 'group_message', 'team_communication', 'team_announcement') then
    category_enabled := coalesce((prefs->>'enable_messages')::boolean, true);
  elsif p_notification_type in ('event_invite', 'event_reminder', 'booking_request', 'booking_accepted', 'booking_declined') then
    category_enabled := coalesce((prefs->>'enable_events')::boolean, true);
  elsif p_notification_type in ('system_alert', 'maintenance', 'feature_update', 'security_alert', 'admin_broadcast') then
    category_enabled := coalesce((prefs->>'enable_system')::boolean, true);
  else
    category_enabled := true;
  end if;

  if category_enabled is false then
    return false;
  end if;

  quiet_enabled := coalesce((prefs->>'quiet_hours_enabled')::boolean, false);
  if quiet_enabled and coalesce(p_priority, 'normal') = 'normal' then
    begin
      quiet_start := nullif(prefs->>'quiet_hours_start', '')::time;
      quiet_end := nullif(prefs->>'quiet_hours_end', '')::time;
    exception
      when others then
        quiet_start := null;
        quiet_end := null;
    end;

    if quiet_start is not null and quiet_end is not null then
      at_time := current_time;
      if quiet_start > quiet_end then
        if at_time >= quiet_start or at_time <= quiet_end then
          return false;
        end if;
      else
        if at_time >= quiet_start and at_time <= quiet_end then
          return false;
        end if;
      end if;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.should_send_notification(uuid, text, text) to authenticated, service_role;
