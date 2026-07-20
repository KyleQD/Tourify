# Phase 12 Migration Rollback

## Migrations

1. `20260718080000_creator_commons_stewards_participation_assets.sql`
2. `20260718080100_creator_commons_protocols_registries_conformance.sql`
3. `20260718080200_creator_commons_operators_funding_transition.sql`
4. `20260718080300_creator_commons_governance_incidents_audit_outbox.sql`

## Rollback

1. Disable all `creator_digital_commons_*` flags via admin ops.
2. Stop `npm run music:creator-digital-commons-outbox-worker`.
3. Confirm `/creator-commons` and APIs return feature_disabled.
4. Leave schema in place; never reset DB.
5. Verify Phase 1–11 surfaces unchanged.
