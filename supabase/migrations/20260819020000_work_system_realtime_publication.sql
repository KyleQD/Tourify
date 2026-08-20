-- P2 reliability: publish only the event-day tables required by the worker
-- read model. Apply after 20260819010000_work_system_p0_security_and_attendance.sql
-- has restricted staff-shift and publication visibility with RLS.
--
-- Postgres Changes still evaluates each subscriber's SELECT/RLS access. This
-- migration does not grant any table privilege or add a policy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'employment_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employment_assignments;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'staff_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'work_mode_publications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_mode_publications;
  END IF;
END $$;

