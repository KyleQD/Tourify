-- Travel change notifications + lodging assignee / confirmation search support.
-- Additive only — never resets data.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1) Lodging guest assigned user + confirmation index
-- ---------------------------------------------------------------------------
alter table if exists public.lodging_guest_assignments
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_lodging_guest_assignments_assigned_user
  on public.lodging_guest_assignments(assigned_user_id);

create index if not exists idx_lodging_bookings_confirmation_number
  on public.lodging_bookings(confirmation_number);

-- Optional denormalized passenger display name on flight assignments
alter table if exists public.flight_passenger_assignments
  add column if not exists passenger_name text;

-- ---------------------------------------------------------------------------
-- 2) Notification type allowlist — add travel change types
-- ---------------------------------------------------------------------------
alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

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
    'flight_changed', 'flight_delayed', 'flight_cancelled',
    'lodging_changed', 'lodging_cancelled', 'transport_changed',
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
    'flight_changed', 'flight_delayed', 'flight_cancelled',
    'lodging_changed', 'lodging_cancelled', 'transport_changed',
    'test', 'general', 'announcement'
  ));
