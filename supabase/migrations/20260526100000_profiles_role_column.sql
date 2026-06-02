-- Adds a real `profiles.role` column so messaging (and other capability gates) have a
-- reliable source of truth instead of probing `account_type` (which only ever holds
-- general/artist/venue/organization). Default 'member' preserves existing behavior;
-- 'viewer' is the explicit read-only tier surfaced to the messaging API.
set client_min_messages = warning;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('member','viewer','admin'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
