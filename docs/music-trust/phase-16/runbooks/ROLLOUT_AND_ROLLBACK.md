# Runbook: Rollout and Rollback (Phase 16)

## Rollout (sandbox)

1. Apply migrations locally after audit.
2. Keep all `creator_interop_institution_*` flags off.
3. Enable readiness only in approved sandbox orgs.
4. Never enable production / treaty / privileges / depositary / UN in first slice.

## Rollback

See `PHASE_16_MIGRATION_ROLLBACK.md`. Prefer flag kill switches over schema drops.
