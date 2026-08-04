# Phase 18 Migration Rollback

## Migrations

- `20260719340000_creator_treaty_renewal_approval_core.sql`
- `20260719340100_creator_treaty_renewal_impacts_sunsets.sql`
- `20260719340200_creator_treaty_renewal_archives_continuity.sql`
- `20260719340300_creator_treaty_renewal_projections_audit_outbox.sql`

## Rollback principle

Additive only. Never reset DB.

1. Disable all `creator_treaty_renewal_*` feature flags
2. Stop `music:creator-treaty-system-renewal-outbox-worker`
3. Admin ops: `renewal_freeze`, `public_law_claim_stop`
4. Do not drop Phase 14–17 tables
5. Optional drop of renewal tables only after dual-control + backup

## Preserve

`artist_music`, `artist-music`, stream, `resolveMusicAccess`, Jukebox, Phases 1–17 surfaces.
