# Runbook — Creator Cooperative Kill Switch

## When
Any privacy, research misconduct, membership, or collective-action incident.

## Actions
1. Open Admin → Music → Creator cooperative ops (`creator_cooperative_admin_ops_enabled`).
2. Prefer module kills (membership, research, vault, collective).
3. Use `privacy_incident_stop` or `research_misconduct_stop` for broad freezes.
4. Confirm flags `enabled=false`.
5. Verify `/cooperative` and APIs return feature_disabled.
6. Record audit event.

## Note
Flags are never legal authority for representation or entity launch.
