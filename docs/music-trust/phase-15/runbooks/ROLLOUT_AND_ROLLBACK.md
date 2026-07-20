# Runbook: Rollout and Rollback (Phase 15)

## Rollout (sandbox)

1. Apply migrations locally after audit.
2. Keep all `creator_interop_org_*` flags off.
3. Enable readiness flag only in approved sandbox orgs.
4. Never enable production / treaty / privileges / UN flags in first slice.

## Rollback

See `PHASE_15_MIGRATION_ROLLBACK.md`. Prefer flag kill switches over schema drops.
