set client_min_messages = warning;

-- Baseline capture: booking_requests.artist_user_id existed on the live
-- reference databases but was never captured by a tracked migration.
-- The 20260817224511 recipient-constraint repair depends on it. Guarded,
-- additive, follows the port_missing_tables precedent for out-of-band
-- live-DB columns.

alter table public.booking_requests
  add column if not exists artist_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_booking_requests_artist_user_id
  on public.booking_requests (artist_user_id)
  where artist_user_id is not null;
