# Phase 19 Migration Rollback

## Migrations

- `20260720220000_creator_treaty_legacy_approval_core.sql`
- `20260720220100_creator_treaty_legacy_custody_strategy.sql`
- `20260720220200_creator_treaty_legacy_identifiers_ethics.sql`
- `20260720220300_creator_treaty_legacy_projections_audit_outbox.sql`

## Rollback posture

Additive only. Prefer flag kill switches over DROP.

1. Disable all `creator_treaty_legacy_%` feature flags (admin ops / SQL).
2. Stop worker `music:creator-treaty-system-legacy-outbox-worker`.
3. Leave tables in place; do not DROP in production without dual-control ops ticket.
4. Do not touch Phase 14–18 tables or music SoT.

## Emergency

Use runbooks `KILL_SWITCH.md` and `ROLLOUT_AND_ROLLBACK.md`.
