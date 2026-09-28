set client_min_messages = warning;

-- Participant identity and lifecycle data for public artist booking requests.
alter table public.booking_requests
  add column if not exists requester_id uuid references public.profiles(id) on delete set null,
  add column if not exists requester_profile_id uuid,
  add column if not exists requester_account_type text,
  add column if not exists artist_profile_id uuid references public.artist_profiles(id) on delete set null,
  add column if not exists recipient_account_type text,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists details_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_requests_requester_account_type_check'
  ) then
    alter table public.booking_requests
      add constraint booking_requests_requester_account_type_check
      check (
        requester_account_type is null
        or requester_account_type in (
          'general', 'artist', 'service', 'venue', 'organization', 'admin', 'staff'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_requests_recipient_account_type_check'
  ) then
    alter table public.booking_requests
      add constraint booking_requests_recipient_account_type_check
      check (
        recipient_account_type is null
        or recipient_account_type in ('artist', 'service')
      );
  end if;
end
$$;

-- Existing rows can recover their artist-profile identity only when the owner
-- has a single unambiguous artist profile. Ambiguous historical rows remain
-- recipient-user-only instead of being assigned to the wrong account.
with unique_artist_profiles as (
  select user_id, (array_agg(id order by id))[1] as id
  from public.artist_profiles
  where user_id is not null
  group by user_id
  having count(*) = 1
)
update public.booking_requests request
set
  artist_profile_id = artist.id,
  recipient_account_type = coalesce(request.recipient_account_type, 'artist')
from unique_artist_profiles artist
where request.artist_id = artist.user_id
  and request.artist_profile_id is null;

update public.booking_requests
set recipient_account_type = 'artist'
where artist_profile_id is not null
  and recipient_account_type is null;

create index if not exists booking_requests_artist_scope_status_idx
  on public.booking_requests (artist_id, artist_profile_id, status, created_at desc);

create index if not exists booking_requests_requester_scope_status_idx
  on public.booking_requests (
    requester_id,
    requester_profile_id,
    requester_account_type,
    status,
    created_at desc
  );

-- A booking has its own conversation so separate bookings between the same pair
-- never leak into or merge with the general direct-message thread.
create table if not exists public.booking_request_messages (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint booking_request_messages_content_check
    check (char_length(btrim(content)) between 1 and 2000)
);

create index if not exists booking_request_messages_request_created_idx
  on public.booking_request_messages (booking_request_id, created_at asc);

alter table public.booking_requests enable row level security;
alter table public.booking_request_messages enable row level security;

-- Remove the legacy blanket authenticated read and recipient-wide mutation rules.
drop policy if exists booking_requests_own on public.booking_requests;
drop policy if exists booking_requests_read_auth on public.booking_requests;
drop policy if exists "Users can manage their own booking requests" on public.booking_requests;
drop policy if exists booking_requests_participants_read on public.booking_requests;

create policy booking_requests_participants_read
  on public.booking_requests
  for select
  to authenticated
  using (
    (select auth.uid()) = artist_id
    or (select auth.uid()) = requester_id
  );

revoke insert, update, delete on public.booking_requests from anon, authenticated;
grant select on public.booking_requests to authenticated;

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
        and request.status = 'accepted'
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
        and request.status = 'accepted'
        and (
          request.artist_id = (select auth.uid())
          or request.requester_id = (select auth.uid())
        )
    )
  );

revoke update, delete on public.booking_request_messages from anon, authenticated;
grant select, insert on public.booking_request_messages to authenticated;

-- Notification fanout stays in the same transaction as the lifecycle event.
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
    and new.status in ('accepted', 'declined') and new.requester_id is not null then
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
      case when new.status = 'accepted' then 'booking_accepted' else 'booking_declined' end,
      case when new.status = 'accepted' then 'Booking accepted' else 'Booking declined' end,
      case
        when new.status = 'accepted' then 'Your booking request was accepted. The shared booking workspace is now open.'
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

drop trigger if exists trg_notify_artist_booking_change on public.booking_requests;
create trigger trg_notify_artist_booking_change
after insert or update on public.booking_requests
for each row execute function private.notify_artist_booking_change();

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

  if request.id is null or request.status <> 'accepted' then
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
      'New booking message',
      left(new.content, 140),
      recipient_profile_id,
      recipient_account_type,
      jsonb_build_object(
        'booking_request_id', request.id,
        'message_id', new.id,
        'link', '/bookings/requests/' || request.id::text
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_artist_booking_message() from public;

drop trigger if exists trg_notify_artist_booking_message on public.booking_request_messages;
create trigger trg_notify_artist_booking_message
after insert on public.booking_request_messages
for each row execute function private.notify_artist_booking_message();
