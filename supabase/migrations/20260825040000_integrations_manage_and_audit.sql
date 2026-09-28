-- =============================================================================
-- VEN-269 / VEN-275 / VEN-016(artists) — Integrations authority, audit trail
-- and artist token vault (additive, idempotent)
-- =============================================================================

-- ── 1. integrations.manage authority in the canonical catalog (VEN-269) ─────
INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('manage_integrations', 'Manage integrations', 'integrations',
   'Connect, refresh and revoke provider integrations for the venue account')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r, public.rbac_permissions p
WHERE r.name = 'Venue Owner' AND r.is_system = true AND r.scope_type = 'entity'
  AND p.name = 'manage_integrations'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── 2. Integration audit log (VEN-275) — connect/refresh/revoke history ──────
CREATE TABLE IF NOT EXISTS public.integration_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID REFERENCES public.venue_profiles(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('connect','disconnect','refresh','scope_change','sync_failed')),
  platform    TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_audit_venue
  ON public.integration_audit_log (venue_id, created_at DESC);

ALTER TABLE public.integration_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_audit_owner_read ON public.integration_audit_log;
CREATE POLICY integration_audit_owner_read
  ON public.integration_audit_log
  FOR SELECT
  USING (
    venue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.venue_profiles vp
      WHERE vp.id = venue_id
        AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
    )
  );
-- Writes: service-role only (server routes audit through the service client).

COMMENT ON TABLE public.integration_audit_log IS
  'VEN-275: auditable connect/disconnect/refresh/scope-change/sync-failure events per venue account.';

-- ── 3. Artist token vault (VEN-016 parity — the venue table was hardened in
--      20260823031000 but artist_social_integrations still exposed raw tokens)
CREATE TABLE IF NOT EXISTS public.artist_social_integration_secrets (
  integration_id     UUID PRIMARY KEY REFERENCES public.artist_social_integrations(id) ON DELETE CASCADE,
  access_token_secret  BYTEA,
  refresh_token_secret BYTEA,
  key_version        INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.artist_social_integration_secrets ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies; access is service-role only.
REVOKE ALL ON public.artist_social_integration_secrets FROM PUBLIC, anon, authenticated;

-- Copy existing raw tokens into the vault (key_version 0 marks legacy plaintext).
INSERT INTO public.artist_social_integration_secrets (integration_id, access_token_secret, refresh_token_secret, key_version)
SELECT id, convert_to(access_token, 'UTF8'), convert_to(refresh_token, 'UTF8'), 0
FROM public.artist_social_integrations
WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL
ON CONFLICT (integration_id) DO NOTHING;

REVOKE SELECT (access_token) ON public.artist_social_integrations FROM authenticated, anon;
REVOKE SELECT (refresh_token) ON public.artist_social_integrations FROM authenticated, anon;
