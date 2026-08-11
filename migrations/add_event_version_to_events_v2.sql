-- Migration: add event_version optimistic-concurrency column to events_v2
-- EVENT-104 — used by AdminTourEventOperationsService to prevent silent overwrites.
--
-- Run this migration once against your Supabase database.
-- It is safe to run multiple times (IF NOT EXISTS guard on the column,
-- no-op UPDATE if rows already have a value).
--
-- After running, all existing rows get event_version = 1.
-- New rows default to 1 and are incremented by the service on every write.

-- 1. Add the column (nullable first so the ALTER is instantaneous, then backfill)
ALTER TABLE public.events_v2
  ADD COLUMN IF NOT EXISTS event_version integer NOT NULL DEFAULT 1;

-- 2. Backfill any rows that somehow have a null (shouldn't happen with DEFAULT 1 but be safe)
UPDATE public.events_v2
SET event_version = 1
WHERE event_version IS NULL;

-- 3. Confirm
-- SELECT count(*), min(event_version), max(event_version) FROM public.events_v2;
