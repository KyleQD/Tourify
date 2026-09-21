-- =============================================================================
-- INTG-007 — Encrypted social credential vault: close plaintext surfaces
-- (forward-only, additive; pairs with lib/integrations/token-vault.ts and the
-- organization OAuth callback at app/api/social/oauth/callback/route.ts)
--
-- Threat: organization_social_integrations still stores plaintext
-- access_token / refresh_token columns that org members can SELECT through RLS
-- row policies (venue_social_integrations got column-level revocation in
-- 20260823031000_integration_token_vault.sql; the org table never did).
-- Additionally, the venue vault rows migrated as key_version = 0 still hold
-- plaintext token bytes inside an RLS-off vault table, waiting forever for a
-- server re-encryption pass that INTG-007 now makes moot with fail-closed
-- reads.
--
-- Disposition (CP-051 — authored here, applied manually by Database only):
--   1. Client roles lose column-level SELECT on the org plaintext columns.
--   2. Existing plaintext values are REVOKED (nulled), never migrated: the
--      encryption key is server-only and never touches SQL, so a safe
--      migration would require a server pass; providers are disabled through
--      RELEASE-008, so re-connect through the encrypted callback is the
--      correct forward path.
--   3. Legacy venue plaintext copies (source columns + key_version=0 vault
--      bytes) are nulled; token material lives only in encrypted envelopes.
-- New writes never reach these columns: the vault boundary is encrypted-only.
-- =============================================================================

-- ── 1. Org plaintext columns leave the client-readable surface ──────────────
REVOKE SELECT (access_token) ON public.organization_social_integrations FROM authenticated, anon;
REVOKE SELECT (refresh_token) ON public.organization_social_integrations FROM authenticated, anon;

-- ── 2. Revocation of existing plaintext org credentials ─────────────────────
-- No traffic depends on these columns after the callback writes encrypted-only
-- envelopes; org analytics Edge Functions are disabled through RELEASE-008 and
-- must be moved to decrypting through the server vault boundary first.
UPDATE public.organization_social_integrations
   SET access_token = NULL,
       refresh_token = NULL
 WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- ── 3. Revocation of legacy venue plaintext copies ──────────────────────────
UPDATE public.venue_social_integrations
   SET access_token = NULL,
       refresh_token = NULL
 WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- Vault rows migrated as key_version = 0 embed plaintext bytes; fail-closed
-- reads never decode them, so the copies are retired. The venue surface keeps
-- working through encrypted envelopes written by writeVenueIntegrationSecrets.
UPDATE public.venue_social_integration_secrets
   SET access_token_secret = NULL,
       refresh_token_secret = NULL
 WHERE key_version = 0
   AND (access_token_secret IS NOT NULL OR refresh_token_secret IS NOT NULL);

-- ── Validation probes (run after apply, Database) ───────────────────────────
-- 1. No plaintext remains on the org surface:
--      select count(*) from organization_social_integrations
--      where access_token is not null or refresh_token is not null;      → 0
-- 2. Client roles cannot read the org token columns:
--      set role authenticated;
--      select access_token from organization_social_integrations limit 1; → permission denied
--      reset role;
-- 3. Legacy venue copies retired:
--      select count(*) from venue_social_integrations
--      where access_token is not null or refresh_token is not null;       → 0
--      select count(*) from venue_social_integration_secrets
--      where key_version = 0 and (access_token_secret is not null
--            or refresh_token_secret is not null);                        → 0
--
-- Rollback: re-authorize the columns is NOT the path — the disposition is
-- revocation. Forward fix: any consumer that regresses moves to the server
-- vault boundary (decryptIntegrationSecret/resolveIntegrationAccessToken) and
-- re-connects through the encrypted OAuth callback.
-- =============================================================================