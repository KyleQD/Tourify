-- Add tour_id to staff_shift_assignments so tour-level roster assignments
-- recorded via /api/hiring/roster/:memberId/assignment are queryable.
-- Previously tour-only assignments were inserted with event_id/shift_id null
-- and the tour context was dropped, making the member invisible in
-- tour-scoped roster listings.

alter table if exists public.staff_shift_assignments
  add column if not exists tour_id uuid;

create index if not exists idx_staff_shift_assignments_tour
  on public.staff_shift_assignments (tour_id)
  where tour_id is not null;

create index if not exists idx_staff_shift_assignments_event
  on public.staff_shift_assignments (event_id)
  where event_id is not null;
