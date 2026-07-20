# Phase 17 Migration Rollback

## Migrations

- `20260718130000_creator_treaty_ops_approval_core.sql`
- `20260718130100_creator_treaty_ops_reviews_protocols.sql`
- `20260718130200_creator_treaty_ops_relationships_funding.sql`
- `20260718130300_creator_treaty_ops_projections_audit_outbox.sql`

## Rollback principle

Additive only. Never reset DB.

1. Disable all `creator_treaty_ops_*` feature flags
2. Stop `music:creator-multilateral-treaty-operations-outbox-worker`
3. Admin ops: `treaty_ops_freeze`, `public_law_claim_stop`
4. Do not drop Phase 14–16 tables
5. Optional drop of treaty_ops tables only after dual-control + backup

## Preserve

`artist_music`, `artist-music`, stream, `resolveMusicAccess`, Jukebox, Phases 1–16 surfaces.
