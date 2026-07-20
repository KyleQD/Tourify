# Platform Audit Remediation Status

**Updated:** 2026-07-18  
**Source:** `PLATFORM_AUDIT_REPORT.md`

## Completed in code

| Sprint | Status | Notes |
|--------|--------|-------|
| 1 Nav quarantine | Done | Dead hrefs remapped in legacy nav trees; Hiring Board linked in `VenueOperationsShell` |
| 2 Missing APIs | Done | Added `/api/search/unified`, `/api/venue/staff-onboarding`, `/api/business/settings`, `/api/onboarding/validate-invitation`, `/api/posts`; retired demo-accounts client usage; invitation router → hire token |
| 3 Surfaces | Done | `/posts/[id]`, `/tickets` → my-tickets, public share allowlist for `/music/verify/*` + `/posts/[id]` |
| 4 Artist gate | Done | Expanded `ARTIST_APP_SEGMENTS`; middleware allows `service` account type |
| 5 Event HQ | Done | 501 branches removed where tables exist; UI shows unavailable toasts; webhook returns 503 when secret unset; contracts CTA quarantined |
| 6 Placeholders | Done | Coming-soon CTAs/tabs quarantined (AUD-0066–0094); feed share re-enabled via `/posts/[id]` |
| 7 Music-trust flags | Done (intentionally off) | Public verify on share allowlist; marketplace link gated; remaining flags stay default-off |
| 8 Wave 5 / PR7 | Done (docs + gates) | Staging matrix `MUSIC_TRUST_STAGING.md`; demo deploy documented (no forced prod ship); AUD-0114 Phase-later + `/org/:slug/dashboard` alias |
| 9 DM + schema lag | Done | Artist trigger hotfix applied (create-path seed works); `/api/messages` passes interaction audit; optional `trust_tier` migration still lagging on Demo REST probe — see `DEMO_SQL_HOTFIXES.md` |

## Ops checklist (manual)

1. Apply Demo SQL hotfixes in Dashboard (see `docs/audits/DEMO_SQL_HOTFIXES.md`):
   - `20260718200000_fix_artist_profiles_owner_user_id_trigger.sql`
   - `20260520222000_dm_trust_model.sql`
2. Redeploy `demo.tourify.live` so `/licensing`, `/institutional`, `/cooperative`, and `/music/verify/*` match local — see `docs/audits/DEMO_DEPLOY.md` (linked Vercel project is `tourify-beta-k2` → `tourify.live`; do not blind `--prod`).
3. Re-run `npm run qa:seed` then `npm run qa:audit:interactions` (messages must pass).
4. Optionally regenerate `docs/audits/*.json` after deploy.
5. Staging-only: enable music-trust cohorts per `docs/audits/MUSIC_TRUST_STAGING.md` (never bulk-enable all 180 in production).

## Explicitly deferred

- Full `/admin` → `/org/{slug}` rename (alias only; see `docs/audits/ADMIN_ORG_RENAME.md`)
- Enabling the full 180 music-trust flags / investor product journeys in production
- Forced production deploy of music-trust pages until demo domain mapping is confirmed
