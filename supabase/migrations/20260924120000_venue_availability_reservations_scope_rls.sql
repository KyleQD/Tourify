-- ═══════════════════════════════════════════════════════════════════════════
-- VENUE-005 — close the venue availability/reservations raw-read boundary
-- (SIM-20260922-VENUE-001 P1, SIM-20260922-DB-002 P0).
--
-- Problem:
--   * public.venue_availability carried "Anyone can view venue availability"
--     FOR SELECT USING (true) (20250814123000_venue_core.sql). The later
--     20260823140000_reservation_conflict_engine.sql REVOKEd SELECT only from
--     anon/PUBLIC, so ANY authenticated user could still enumerate every
--     venue's blocked dates including blocked_reason, notes, booking_id,
--     event_id.
--   * public.venue_reservations carried venue_reservations_public_read
--     FOR SELECT USING (true) with never a REVOKE, so anon AND every
--     authenticated user could read raw reservation rows including source_id
--     and created_by — contradicting the "existence/timing only" comment.
--
-- Fix (additive, forward-only, CP-051):
--   1. REVOKE table-level SELECT on both raw tables from every client role
--      (anon, public, authenticated); service_role retains SELECT.
--   2. Replace both permissive client SELECT policies with explicit
--      service-role-only read policies so the policy inventory itself fails
--      closed for anon/authenticated regardless of grants.
--   3. Leave the write path untouched: venue_reservations_operator (FOR ALL,
--      venue_has_operator_access) and "Venue owners can manage their
--      availability" (FOR ALL) are preserved. The sanitized
--      public_venue_availability view (venue/date/is_available only) remains
--      the public surface; venue operators read raw rows only through the
--      venue-scoped API (/api/venue/availability, /api/venue/reservations)
--      which uses the service-role client after a canManageVenue gate.
--
-- Why the public view still works after the REVOKE:
--   public_venue_availability is created WITH (security_barrier = true) and
--   WITHOUT security_invoker, so PostgreSQL resolves its access to
--   public.venue_availability as the view OWNER, not as the calling role.
--   Revoking table-level SELECT from anon/authenticated therefore does not
--   break the public projection; the contract test asserts the view grant and
--   a resolvable query as a guard against a future security_invoker change.
--
-- Re-run safety (CP-051): every statement is re-runnable. Both new policies are
-- preceded by DROP POLICY IF EXISTS on their own names so an operator retry
-- after a partial apply converges instead of raising a duplicate-policy error.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. venue_availability ────────────────────────────────────────────────────
-- Re-affirm anon/PUBLIC revocation (20260823140000) and close the
-- authenticated leak. service_role keeps SELECT.
revoke select on public.venue_availability from anon, public, authenticated;
grant select on public.venue_availability to service_role;

-- Replace the permissive "Anyone can view venue availability" SELECT policy
-- (USING (true), matched every role) with an explicit service-role-only read
-- policy. No anon/authenticated policy can ever match a raw row now.
drop policy if exists "Anyone can view venue availability" on public.venue_availability;
drop policy if exists venue_availability_service_read on public.venue_availability;
create policy venue_availability_service_read
  on public.venue_availability
  for select
  to service_role
  using (true);

-- ── 2. venue_reservations ────────────────────────────────────────────────────
-- anon/PUBLIC/authenticated never had SELECT revoked; close all three now.
-- service_role keeps SELECT.
revoke select on public.venue_reservations from anon, public, authenticated;
grant select on public.venue_reservations to service_role;

-- Replace venue_reservations_public_read (USING (true)) with an explicit
-- service-role-only read policy. venue_reservations_operator (FOR ALL,
-- venue_has_operator_access) is intentionally preserved for write scoping.
drop policy if exists venue_reservations_public_read on public.venue_reservations;
drop policy if exists venue_reservations_service_read on public.venue_reservations;
create policy venue_reservations_service_read
  on public.venue_reservations
  for select
  to service_role
  using (true);

comment on table public.venue_availability is
  'VENUE-005: raw rows (blocked_reason/notes/booking_id/event_id) readable only via service-role/venue-scoped surfaces; use public_venue_availability for public dates.';
comment on table public.venue_reservations is
  'VENUE-005: raw rows (incl. source_id/created_by/status) readable only via service-role/venue-scoped surfaces; public_venue_availability remains the sanitized public projection.';

commit;