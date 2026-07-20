# Runbook — Rights Intelligence Kill Switch

## When
Any privacy, competition, or product incident involving intelligence outputs, groups, or public publish.

## Actions
1. Open Admin → Music → Rights intelligence ops (requires `music_rights_intelligence_admin_ops_enabled`).
2. Prefer module-scoped kills (`kill_switch_benchmarks`, `kill_switch_groups`, etc.).
3. Use `competition_stop` to disable benchmarks, groups, external negotiation, collective licensing, and public publish together.
4. Confirm `feature_flags` rows for `music_rights_intelligence_*` show `enabled=false`.
5. Verify creator/enterprise routes return 404/feature_disabled.
6. Record audit event and incident ticket.

## Rollback
Re-enable only after dual-control approval; never treat a flag as counsel authority.
