-- =============================================================================
-- VEN-016 — Provider secrets leave the browser-readable surface
-- (additive, idempotent; pairs with ADR-0001 method)
--
-- Threat: venue_social_integrations stores access_token / refresh_token inline.
-- The owner-ALL policy means the owner's browser session can SELECT raw provider
-- secrets via PostgREST — any XSS or over-scoped query exfiltrates them.
--
-- Fix, in two layers:
--  1. Column-level revocation: authenticated/anon lose SELECT on the token
--     columns of the legacy table immediately (row policies unchanged).
--  2. Server-only vault: venue_social_integration_secrets holds migrated secret
--     material with RLS enabled and ZERO client policies → reachable ONLY by
--     service-role/server code. Existing values are copied idempotently; source
--     columns stay populated during the migration window (dual-read), retirement
--     happens after the provider-adapter wave (VEN-265+) verifies parity.
--
-- Encryption: writes to the vault go through the server secret-store using
-- ENCRYPTION_KEY (see lib/config environment contract); rows carry key_version so
-- a later re-encryption pass can rotate without downtime.
-- =============================================================================

-- ── 1. Immediate column-level hardening on the legacy table ─────────────────
REVOKE SELECT (access_token) ON public.venue_social_integrations FROM authenticated, anon;
REVOKE SELECT (refresh_token) ON public.venue_social_integrations FROM authenticated, anon;

-- ── 2. Server-only vault ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_social_integration_secrets (
  integration_id        UUID PRIMARY KEY
                        REFERENCES public.venue_social_integrations(id) ON DELETE CASCADE,
  access_token_secret   BYTEA,
  refresh_token_secret  BYTEA,
  key_version           INTEGER NOT NULL DEFAULT 1,
  -- 0 marks rows migrated as plaintext before the first server re-encryption pass.
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.venue_social_integration_secrets IS
  'Server-only provider secret vault (VEN-016). RLS enabled with no client policies: service_role bypasses RLS, no browser session can read or write.';

ALTER TABLE public.venue_social_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Deliberately NO policies. Force safety net even if someone later flips RLS off.
REVOKE ALL ON public.venue_social_integration_secrets FROM PUBLIC, anon, authenticated;

-- ── 3. Idempotent one-time copy of existing material ────────────────────────
INSERT INTO public.venue_social_integration_secrets
  (integration_id, access_token_secret, refresh_token_secret, key_version)
SELECT
  vsi.id,
  convert_to(vsi.access_token, 'UTF8'),
  convert_to(vsi.refresh_token, 'UTF8'),
  0
FROM public.venue_social_integrations vsi
WHERE (vsi.access_token IS NOT NULL OR vsi.refresh_token IS NOT NULL)
ON CONFLICT (integration_id) DO NOTHING;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Vault unreachable by clients:
--      set role authenticated; select * from venue_social_integration_secrets; → permission denied
--      reset role;
-- 2. Token columns hidden from clients:
--      set role authenticated; select id, platform from venue_social_integrations limit 1;        → ok
--      select access_token from venue_social_integrations limit 1;                                 → permission denied
--      reset role;
-- 3. Coverage: every integration holding tokens has a vault row:
--      select count(*) from venue_social_integrations vsi
--      where (access_token is not null or refresh_token is not null)
--        and not exists (select 1 from venue_social_integration_secrets s where s.integration_id = vsi.id);
--
-- Rollback: GRANT back the column SELECTs; drop the vault table (source columns
-- were never cleared during the migration window).
