# Phase 16 Migration Rollback

## Migrations

- `20260718120000_creator_interop_institution_approval_core.sql`
- `20260718120100_creator_interop_institution_protocols_services.sql`
- `20260718120200_creator_interop_institution_funding_oversight.sql`
- `20260718120300_creator_interop_institution_compliance_projections_outbox.sql`

## Rollback principle

Additive only. Never reset DB.

1. Disable all `creator_interop_institution_*` feature flags
2. Stop `music:creator-interoperability-institution-outbox-worker`
3. Admin ops: `institution_freeze`, `public_law_claim_stop`
4. Do not drop Phase 14/15 tables
5. Optional drop of institution tables only after dual-control + backup

## Preserve

`artist_music`, `artist-music`, stream, `resolveMusicAccess`, Jukebox, Phases 1–15 surfaces.
