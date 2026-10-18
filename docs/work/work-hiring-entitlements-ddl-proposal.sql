-- Tourify Work 2.0 — reviewed DDL PROPOSAL ONLY
-- THIS FILE IS NOT AN APPLIED MIGRATION. It lives under docs/work intentionally.
-- Convert to a versioned Supabase migration using the project CLI on the chosen
-- canonical environment only after schema-diff/RLS/Stripe-impact review.
-- DO NOT run directly on production.
--
-- Binding model:
-- public.accounts.id = professional account ID (owner_user_id = personal owner).
-- subscriptions.user_id = personal owner, NOT the employer account.
-- subscriptions.stripe_subscription_id is UNIQUE.
-- Do not confer employer approval using the editable accounts.is_verified or
-- the legacy verification_requests.status.

BEGIN;

CREATE TABLE IF NOT EXISTS public.work_employer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  approval_type text NOT NULL DEFAULT 'employer' CHECK (approval_type = 'employer'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  review_notes text, -- never include in public payloads
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_employer_approvals_one_per_account UNIQUE(account_id, approval_type),
  CONSTRAINT work_employer_approved_reviewer_required
    CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND revoked_at IS NULL)),
  CONSTRAINT work_employer_revocation_consistent
    CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.work_hiring_plans (
  stripe_price_id text PRIMARY KEY CHECK (length(stripe_price_id) > 6),
  allowed_account_types text[] NOT NULL CHECK (cardinality(allowed_account_types) > 0),
  active_listing_limit integer NOT NULL CHECK (active_listing_limit >= 0),
  max_recruiter_seats integer NOT NULL DEFAULT 1 CHECK (max_recruiter_seats >= 1),
  enabled boolean NOT NULL DEFAULT false, -- explicitly enabled by operator
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_hiring_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL REFERENCES public.subscriptions(stripe_subscription_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One paid subscription can authorize only one professional employer account.
  CONSTRAINT work_hiring_entitlements_unique_subscription UNIQUE(stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS work_employer_approvals_active_idx
  ON public.work_employer_approvals(account_id, expires_at)
  WHERE status='approved' AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS work_hiring_entitlements_account_idx
  ON public.work_hiring_entitlements(account_id)
  WHERE revoked_at IS NULL;

-- No public/client role may create, approve, or self-assign hiring access.
ALTER TABLE public.work_employer_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_hiring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_hiring_entitlements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_employer_approvals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.work_hiring_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.work_hiring_entitlements FROM PUBLIC, anon, authenticated;

-- Service-role access is server-only. Never expose SUPABASE_SERVICE_ROLE_KEY
-- or these records to a browser/Next public environment variable.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_employer_approvals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hiring_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hiring_entitlements TO service_role;

COMMIT;

-- REQUIRED BEFORE ACTIVATING ANY PAID PUBLISHING:
-- 1. Review account grants: own-row accounts.is_verified is currently editable.
--    Introduce separate security migration protecting legacy verification
--    attributes and initial verification_requests status without breaking UI.
-- 2. Build an ADMIN-ONLY approval workflow that uses protected service role,
--    requires authenticated reviewer identity, and records append-only audit.
-- 3. From SIGNATURE-VERIFIED Stripe events, validate subscription owner and
--    explicit price entitlements. Subscription status must be read fresh and
--    matched against accounts.owner_user_id at authorization time.
-- 4. Ensure work_hiring_plans.allowed_account_types contains the target type.
-- 5. Enforce concurrent publish quota transactionally, including artist-jobs,
--    employer templates, duplicates/reposts and any imported sources.
-- 6. Ensure SQL grants and RLS checks cover anon/authenticated/service roles,
--    including access to views and RPCs. Avoid SECURITY DEFINER in public.
-- 7. Populate ZERO rows by default. Never auto-approve existing is_verified.
-- 8. Reconcile Demo/Staging schema parity; don't apply this design blindly.
