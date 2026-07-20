# Runbook — Rollout and Rollback

## Rollout (educational pilot only)
1. Apply additive migrations `20260718040000`–`40300`.
2. Keep all `music_rights_intelligence_*` flags off until privacy + competition counsel + pilot approvals.
3. Enable consent → education → private diagnostics first.
4. Cohorts/metrics/benchmarks only after aggregation + privacy gates evidenced.
5. Groups stay `readiness_only` / `external_action_enabled=false`.
6. Public publish and external/collective/representation remain separately gated and default-deny.

## Rollback
1. Disable all intelligence flags (admin kill switches).
2. Leave schema in place (additive; do not drop).
3. Stop outbox worker if needed.
4. Confirm Phase 1–7 surfaces unchanged (`artist_music`, stream, passports, licensing, rights-admin).

## Never
- Reset the database
- Rewrite Phase 2–7 source-of-truth rows from intelligence code
- Treat feature flags as legal authority for representation or collective licensing
