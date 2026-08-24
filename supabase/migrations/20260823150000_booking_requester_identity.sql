-- ═══════════════════════════════════════════════════════════════
-- VEN-085 / VEN-050 — requester acting-account identity on booking requests.
--
-- venue_booking_requests keeps requester_id = auth actor (human), and now ALSO
-- records WHICH account acted (artist profile, venue profile, …) exactly like
-- the artist-side booking_requests table already does. Nullable + no FK by
-- design: public/unauthenticated-ish flows may legitimately lack a profile,
-- and account ids span multiple tables.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.venue_booking_requests
  ADD COLUMN IF NOT EXISTS requester_profile_id uuid,
  ADD COLUMN IF NOT EXISTS requester_account_type text;

COMMENT ON COLUMN public.venue_booking_requests.requester_profile_id IS
  'VEN-085/050: acting ACCOUNT id (profile) in addition to the human actor requester_id.';
COMMENT ON COLUMN public.venue_booking_requests.requester_account_type IS
  'VEN-085/050: account type of the acting profile (general/artist/venue/...).';

CREATE INDEX IF NOT EXISTS idx_vbr_requester_profile
  ON public.venue_booking_requests (requester_profile_id)
  WHERE requester_profile_id IS NOT NULL;
