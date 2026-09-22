set client_min_messages = warning;

-- Keep standalone artist requests compatible with both legacy and current
-- recipient identity columns while allowing contact-based legacy requests.
alter table public.booking_requests
  drop constraint if exists booking_request_recipient_check;

alter table public.booking_requests
  add constraint booking_request_recipient_check
  check (
    artist_id is not null
    or artist_user_id is not null
    or email is not null
    or phone is not null
  );
