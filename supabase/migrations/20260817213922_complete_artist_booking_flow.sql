set client_min_messages = warning;

alter table public.booking_requests
  drop constraint if exists booking_request_target_check,
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'needs_info', 'accepted', 'declined', 'expired', 'cancelled', 'approved', 'rejected'));

alter table public.booking_requests
  add column if not exists event_collaboration_status text
    check (event_collaboration_status is null or event_collaboration_status in ('not_linked', 'linked', 'failed')),
  add column if not exists event_collaboration_updated_at timestamptz;

alter table public.booking_request_messages
  add column if not exists message_type text not null default 'message'
    check (message_type in ('message', 'info_request', 'info_response'));

alter table if exists public.event_participants
  add column if not exists status text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if to_regclass('public.event_collaborators') is not null then
    alter table public.event_collaborators
      drop constraint if exists event_collaborators_event_table_check,
      drop constraint if exists event_collaborators_role_check;

    alter table public.event_collaborators
      add constraint event_collaborators_event_table_check
      check (event_table in ('artist_events', 'events', 'events_v2')),
      add constraint event_collaborators_role_check
      check (role in ('admin', 'editor', 'moderator', 'artist'));

    create unique index if not exists event_collaborators_event_user_table_key
      on public.event_collaborators(event_id, user_id, event_table);
  end if;
end
$$;

drop policy if exists booking_request_messages_participants_read
  on public.booking_request_messages;
drop policy if exists booking_request_messages_participants_insert
  on public.booking_request_messages;

create policy booking_request_messages_participants_read
  on public.booking_request_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.booking_requests request
      where request.id = booking_request_id
        and request.status in ('pending', 'needs_info', 'accepted')
        and (
          request.artist_id = (select auth.uid())
          or request.requester_id = (select auth.uid())
        )
    )
  );

create policy booking_request_messages_participants_insert
  on public.booking_request_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.booking_requests request
      where request.id = booking_request_id
        and request.status in ('pending', 'needs_info', 'accepted')
        and (
          request.artist_id = (select auth.uid())
          or request.requester_id = (select auth.uid())
        )
    )
  );

create schema if not exists private;

create or replace function private.notify_artist_booking_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  notification_link text := '/bookings/requests/' || new.id::text;
begin
  if tg_op = 'INSERT' and new.requester_id is not null and new.artist_id is not null then
    insert into public.notifications (
      user_id,
      related_user_id,
      type,
      title,
      content,
      target_profile_id,
      target_account_type,
      metadata
    ) values (
      new.artist_id,
      new.requester_id,
      'booking_request',
      'New booking request',
      'A new booking request is ready for your review.',
      new.artist_profile_id,
      coalesce(new.recipient_account_type, 'artist'),
      jsonb_build_object(
        'booking_request_id', new.id,
        'status', new.status,
        'link', notification_link
      )
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status
    and new.status in ('needs_info', 'accepted', 'declined') and new.requester_id is not null then
    insert into public.notifications (
      user_id,
      related_user_id,
      type,
      title,
      content,
      target_profile_id,
      target_account_type,
      metadata
    ) values (
      new.requester_id,
      new.artist_id,
      case
        when new.status = 'accepted' then 'booking_accepted'
        when new.status = 'needs_info' then 'booking_request'
        else 'booking_declined'
      end,
      case
        when new.status = 'accepted' then 'Booking accepted'
        when new.status = 'needs_info' then 'More booking information requested'
        else 'Booking declined'
      end,
      case
        when new.status = 'accepted' then 'Your booking request was accepted. The shared booking workspace is now open.'
        when new.status = 'needs_info' then 'The artist asked for more information before deciding.'
        when nullif(btrim(coalesce(new.response_message, '')), '') is not null
          then 'Your booking request was declined: ' || new.response_message
        else 'Your booking request was declined.'
      end,
      new.requester_profile_id,
      coalesce(new.requester_account_type, 'general'),
      jsonb_build_object(
        'booking_request_id', new.id,
        'status', new.status,
        'response_message', new.response_message,
        'link', notification_link
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_artist_booking_change() from public;

create or replace function private.notify_artist_booking_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.booking_requests%rowtype;
  recipient_id uuid;
  recipient_profile_id uuid;
  recipient_account_type text;
begin
  select * into request
  from public.booking_requests
  where id = new.booking_request_id;

  if request.id is null or request.status not in ('pending', 'needs_info', 'accepted') then
    return new;
  end if;

  if new.sender_id = request.requester_id then
    recipient_id := request.artist_id;
    recipient_profile_id := request.artist_profile_id;
    recipient_account_type := coalesce(request.recipient_account_type, 'artist');
  else
    recipient_id := request.requester_id;
    recipient_profile_id := request.requester_profile_id;
    recipient_account_type := coalesce(request.requester_account_type, 'general');
  end if;

  if recipient_id is not null and recipient_id <> new.sender_id then
    insert into public.notifications (
      user_id,
      related_user_id,
      type,
      title,
      content,
      target_profile_id,
      target_account_type,
      metadata
    ) values (
      recipient_id,
      new.sender_id,
      'message',
      case
        when new.message_type = 'info_request' then 'Booking information requested'
        when new.message_type = 'info_response' then 'Booking information received'
        else 'New booking message'
      end,
      left(new.content, 140),
      recipient_profile_id,
      recipient_account_type,
      jsonb_build_object(
        'booking_request_id', request.id,
        'message_id', new.id,
        'message_type', new.message_type,
        'link', '/bookings/requests/' || request.id::text
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_artist_booking_message() from public;
