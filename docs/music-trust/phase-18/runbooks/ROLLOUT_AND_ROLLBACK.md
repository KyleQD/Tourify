# Runbook: Rollout and Rollback (Phase 18)

## Rollout (sandbox)

1. Apply migrations locally after audit.
2. Keep all `creator_treaty_renewal_*` flags off.
3. Enable readiness only in approved sandbox orgs.
4. Never enable public_activation / privileges / dissolution / phase19 ship in first slice.

## Rollback

See `PHASE_18_MIGRATION_ROLLBACK.md`. Prefer flag kill switches over schema drops.
