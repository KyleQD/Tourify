# Phase 15 Migration Rollback

## Migrations

- `20260718110000_creator_interop_org_approval_orgs_instruments.sql`
- `20260718110100_creator_interop_org_organs_hq_privileges.sql`
- `20260718110200_creator_interop_org_budget_oversight_relationships.sql`
- `20260718110300_creator_interop_org_projections_audit_outbox.sql`

## Rollback principle

Additive only. Never reset DB. Compensating actions:

1. Disable all `creator_interop_org_*` feature flags
2. Stop `music:creator-interoperability-organization-outbox-worker`
3. Freeze via admin ops (`organization_freeze`, public-law stops)
4. Do not drop Phase 14 `creator_interop_*` tables
5. Optional: leave `creator_interop_org_*` tables in place (orphan-safe) or drop only after dual-control approval and backup

## Preserve

`artist_music`, `artist-music` bucket, stream, `resolveMusicAccess`, Jukebox, Phase 1–14 music trust surfaces.
