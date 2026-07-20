# Phase 9 Migration Rollback

## Principle

Additive only. Never `DROP` production tables in emergency rollback — disable flags and stop workers.

## Migrations

1. `20260718050000_creator_cooperative_entity_membership_governance.sql`
2. `20260718050100_creator_cooperative_data_contributions_lineage_vault.sql`
3. `20260718050200_creator_cooperative_research_exchange_ethics_outputs.sql`
4. `20260718050300_creator_cooperative_policy_standards_benefits_collective.sql`

## Rollback procedure

1. Disable all `creator_cooperative_*`, `creator_data_*`, `research_*`, `policy_*`, `standards_*`, `collective_*`, `member_benefit_*`, `cooperative_token_*`, `cross_border_*`, `public_policy_*` flags via admin ops / SQL.
2. Stop `npm run music:creator-cooperative-outbox-worker`.
3. Confirm `/cooperative` and `/api/creator-cooperative/**` return feature_disabled.
4. Leave schema in place; do not reset database.
5. Verify Phase 1–8 surfaces unchanged.

## Forward fix

Ship compensating migrations only; never rewrite Phase 1–8 source rows.
