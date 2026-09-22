-- Recognition system: allow achievement/badge/endorsement notification types,
-- gate them via preferences, and seed a curated badge catalog.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1) Notification type constraint — additive only
-- Existing rows may use types introduced after the constraint was dropped
-- (20260416000323). Remap unknowns to 'general' before re-adding CHECK.
-- ---------------------------------------------------------------------------
alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

-- Canonical allowlist used by app notification writers + recognition types.
-- Keep in sync with OptimizedNotificationService / hiring / logistics routes.
do $normalize$
declare
  allowed text[] := array[
    'like', 'comment', 'share', 'follow', 'follow_request', 'follow_accepted', 'unfollow', 'mention', 'tag',
    'message', 'message_request', 'group_message', 'team_communication', 'team_announcement',
    'event_invite', 'event_reminder', 'event_invitation', 'booking_request', 'booking_accepted', 'booking_declined',
    'post_created', 'content_approved', 'content_rejected',
    'achievement', 'achievement_unlocked', 'badge_granted', 'endorsement_received',
    'system_alert', 'maintenance', 'feature_update', 'security_alert', 'admin_broadcast',
    'job_application', 'job_offer', 'collaboration_request', 'collaboration_invite', 'partnership_invite',
    'hiring_application_approved', 'hiring_application_approved_actor', 'hiring_application_status_updated',
    'hiring_onboarding_invite', 'hiring_onboarding_changes_requested', 'hiring_roster_added',
    'hiring_evidence_requested', 'artist_application_status_updated', 'onboarding_completed',
    'shift_assignment_invite', 'shift_assignment_updated', 'shift_assignment_cancelled', 'shift_assignment_response',
    'venue_booking', 'artist_booking', 'performance_reminder', 'soundcheck_reminder',
    'payment_received', 'payment_failed', 'refund_processed', 'subscription_renewal',
    'ticket', 'task_assigned', 'hq_bulletin', 'communication',
    'site_map_task_assigned', 'site_map_task_completed', 'site_map_shared',
    'logistics_comms', 'equipment', 'backline', 'catering', 'transportation', 'transport_assigned',
    'test', 'general', 'announcement'
  ];
begin
  if to_regclass('public.notifications') is null then
    return;
  end if;

  update public.notifications
  set type = 'general'
  where type is null
     or type <> all (allowed);
end
$normalize$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'comment', 'share', 'follow', 'follow_request', 'follow_accepted', 'unfollow', 'mention', 'tag',
    'message', 'message_request', 'group_message', 'team_communication', 'team_announcement',
    'event_invite', 'event_reminder', 'event_invitation', 'booking_request', 'booking_accepted', 'booking_declined',
    'post_created', 'content_approved', 'content_rejected',
    'achievement', 'achievement_unlocked', 'badge_granted', 'endorsement_received',
    'system_alert', 'maintenance', 'feature_update', 'security_alert', 'admin_broadcast',
    'job_application', 'job_offer', 'collaboration_request', 'collaboration_invite', 'partnership_invite',
    'hiring_application_approved', 'hiring_application_approved_actor', 'hiring_application_status_updated',
    'hiring_onboarding_invite', 'hiring_onboarding_changes_requested', 'hiring_roster_added',
    'hiring_evidence_requested', 'artist_application_status_updated', 'onboarding_completed',
    'shift_assignment_invite', 'shift_assignment_updated', 'shift_assignment_cancelled', 'shift_assignment_response',
    'venue_booking', 'artist_booking', 'performance_reminder', 'soundcheck_reminder',
    'payment_received', 'payment_failed', 'refund_processed', 'subscription_renewal',
    'ticket', 'task_assigned', 'hq_bulletin', 'communication',
    'site_map_task_assigned', 'site_map_task_completed', 'site_map_shared',
    'logistics_comms', 'equipment', 'backline', 'catering', 'transportation', 'transport_assigned',
    'test', 'general', 'announcement'
  ));

-- ---------------------------------------------------------------------------
-- 2) Preference gate for recognition events
-- ---------------------------------------------------------------------------
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
  elsif p_notification_type in ('achievement_unlocked', 'badge_granted', 'endorsement_received') then
    category_enabled := coalesce(
      (prefs->>'enable_achievements')::boolean,
      (prefs->'preferences'->'achievement_unlocked'->>'push')::boolean,
      true
    );
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

-- Optional preference column for recognition toggles (additive)
alter table if exists public.notification_preferences
  add column if not exists enable_achievements boolean default true;

-- ---------------------------------------------------------------------------
-- 3) Curated badge catalog (stable names; upsert by unique name)
-- ---------------------------------------------------------------------------
insert into public.badges (
  name, description, category, subcategory, icon, color, level, rarity,
  is_verification_badge, is_auto_granted, requirements, display_order, metadata
)
values
  ('Artist Profile Complete', 'Completed artist profile setup', 'verification', 'profile', 'user-check', '#10b981', 1, 'common', false, true, '{"profile_type":"artist"}'::jsonb, 10, '{"source":"tourify_seed"}'::jsonb),
  ('Venue Profile Complete', 'Completed venue profile setup', 'verification', 'profile', 'building', '#3b82f6', 1, 'common', false, true, '{"profile_type":"venue"}'::jsonb, 11, '{"source":"tourify_seed"}'::jsonb),
  ('Identity Verified', 'Platform-verified identity credentials', 'verification', 'identity', 'shield-check', '#06b6d4', 1, 'rare', true, false, '{}'::jsonb, 12, '{"source":"tourify_seed"}'::jsonb),
  ('Trusted Crew', 'Recognized as reliable crew by managers', 'recognition', 'crew', 'shield', '#10b981', 1, 'rare', false, false, '{}'::jsonb, 20, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Rising Star', 'Emerging talent with strong early work', 'recognition', 'emerging', 'star', '#f59e0b', 1, 'uncommon', false, false, '{}'::jsonb, 21, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Stage Pro', 'Excellence in live stage operations', 'expertise', 'stage', 'mic', '#ef4444', 1, 'rare', false, false, '{}'::jsonb, 30, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Audio Pro', 'Excellence in audio and live sound', 'expertise', 'audio', 'volume-2', '#8b5cf6', 1, 'rare', false, false, '{}'::jsonb, 31, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Production Pro', 'Excellence in production coordination', 'expertise', 'production', 'settings', '#06b6d4', 1, 'rare', false, false, '{}'::jsonb, 32, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Tour Ready', 'Proven readiness for touring work', 'milestone', 'tour', 'calendar-check', '#10b981', 1, 'uncommon', false, false, '{}'::jsonb, 40, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Community Builder', 'Active contributor who lifts others up', 'community', 'leadership', 'users', '#14b8a6', 1, 'rare', false, false, '{}'::jsonb, 50, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Work Excellence', 'Outstanding performance on a job or tour', 'award', 'work', 'award', '#f43f5e', 1, 'epic', false, false, '{}'::jsonb, 60, '{"source":"tourify_seed","grantable":true}'::jsonb),
  ('Early Adopter', 'Joined Tourify during early access', 'partnership', 'early', 'zap', '#fbbf24', 1, 'rare', false, false, '{"early_adopter":true}'::jsonb, 70, '{"source":"tourify_seed"}'::jsonb)
on conflict (name) do update set
  description = excluded.description,
  category = excluded.category,
  subcategory = excluded.subcategory,
  icon = excluded.icon,
  color = excluded.color,
  level = excluded.level,
  rarity = excluded.rarity,
  is_verification_badge = excluded.is_verification_badge,
  is_auto_granted = excluded.is_auto_granted,
  requirements = excluded.requirements,
  display_order = excluded.display_order,
  metadata = coalesce(public.badges.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now(),
  is_active = true;
