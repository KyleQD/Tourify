# Runbook: Rollout and Rollback (Phase 17)

## Rollout (sandbox)

1. Apply migrations locally after audit.
2. Keep all `creator_treaty_ops_*` flags off.
3. Enable readiness/periodic_review only in approved sandbox orgs.
4. Never enable external_public_activation / depositary / competence_change in first slice.

## Rollback

See `PHASE_17_MIGRATION_ROLLBACK.md`. Prefer flag kill switches over schema drops.
