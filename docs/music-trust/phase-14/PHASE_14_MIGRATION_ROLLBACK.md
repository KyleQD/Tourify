# Phase 14 Migration Rollback

## Migrations

1. `20260718100000_creator_interop_approval_packages_networks.sql`
2. `20260718100100_creator_interop_recognitions_profiles_decisions.sql`
3. `20260718100200_creator_interop_projections_incidents_audit_outbox.sql`

## Rollback

1. Disable all `creator_interop_convention_*` / `creator_interop_*` flags via admin ops.
2. Stop `npm run music:creator-interoperability-convention-outbox-worker`.
3. Confirm `/interop-convention` and APIs return feature_disabled.
4. Leave schema in place; never reset DB.
5. Verify Phase 1–13 surfaces unchanged.
