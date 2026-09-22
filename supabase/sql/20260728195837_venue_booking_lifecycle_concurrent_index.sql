-- Run this file by itself after the Venue booking lifecycle migration succeeds.
-- Do not combine it with BEGIN/COMMIT or any other SQL statement.

create index concurrently if not exists venue_booking_requests_lifecycle_queue_idx
  on public.venue_booking_requests (venue_id, lifecycle_status, lifecycle_due_at)
  where lifecycle_status is not null;
