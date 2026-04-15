set client_min_messages = warning;

-- Option B: parallel Connect columns — legacy Express (v1) vs V2 core accounts.
-- Existing sellers keep stripe_connect_account_id + kind v1_express; new onboarding uses v2 column + kind v2.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_v2_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_kind TEXT;

COMMENT ON COLUMN profiles.stripe_connect_account_id IS 'Connect account id from legacy V1 Express onboarding (stripe.accounts.create type express).';
COMMENT ON COLUMN profiles.stripe_connect_v2_account_id IS 'Connect account id from V2 core accounts API (stripeClient.v2.core.accounts.create).';
COMMENT ON COLUMN profiles.stripe_connect_account_kind IS 'Active integration: v1_express | v2 | NULL (NULL treated as v1 when stripe_connect_account_id is set).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_stripe_connect_account_kind_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_stripe_connect_account_kind_check
      CHECK (
        stripe_connect_account_kind IS NULL
        OR stripe_connect_account_kind IN ('v1_express', 'v2')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_v2
  ON profiles (stripe_connect_v2_account_id)
  WHERE stripe_connect_v2_account_id IS NOT NULL;

-- Mark everyone who already has a legacy Express id as v1 (dual-run / migration clarity).
UPDATE profiles
SET stripe_connect_account_kind = 'v1_express'
WHERE stripe_connect_account_id IS NOT NULL
  AND stripe_connect_account_kind IS NULL;
