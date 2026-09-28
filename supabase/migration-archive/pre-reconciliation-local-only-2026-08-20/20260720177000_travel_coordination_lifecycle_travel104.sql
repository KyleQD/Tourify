-- TRAVEL-104: coordination lifecycle vocabulary on travel_groups.coordination_status
-- Additive: keep legacy values; add suggestion/review/request/hold/confirmed.

ALTER TABLE public.travel_groups
  DROP CONSTRAINT IF EXISTS travel_groups_coordination_status_check;

ALTER TABLE public.travel_groups
  ADD CONSTRAINT travel_groups_coordination_status_check
  CHECK (
    coordination_status IN (
      'pending',
      'flights_booked',
      'hotels_booked',
      'transport_arranged',
      'complete',
      'suggestion',
      'review',
      'request',
      'hold',
      'confirmed'
    )
  );

COMMENT ON COLUMN public.travel_groups.coordination_status IS
  'TRAVEL-104 lifecycle: suggestion|review|request|hold|confirmed (legacy pending/flights_booked/hotels_booked/transport_arranged/complete still valid).';
