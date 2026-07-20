# Phase 13 Migration Rollback

## Migrations

1. `20260718090000_creator_protocol_constitution_entities_compacts_ratifications.sql`
2. `20260718090100_creator_protocol_constitution_powers_amendments_decisions_appeals.sql`
3. `20260718090200_creator_protocol_constitution_assets_operators_forks_succession.sql`
4. `20260718090300_creator_protocol_constitution_incidents_audit_public_projections_outbox.sql`

## Rollback

1. Disable all `creator_protocol_*` flags via admin ops.
2. Stop `npm run music:creator-protocol-constitution-outbox-worker`.
3. Confirm `/protocol-constitution` and APIs return feature_disabled.
4. Leave schema in place; never reset DB.
5. Verify Phase 1–12 surfaces unchanged.
