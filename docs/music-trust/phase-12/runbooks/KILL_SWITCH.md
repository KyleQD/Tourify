# Runbook: Kill Switch (Phase 12)

1. Open admin music dashboard → Creator digital commons ops (requires `creator_digital_commons_readiness_enabled`).
2. Disable the affected surface (`kill_switch_*`).
3. For broad incident: run `asset_custody_stop`, `operator_failover_stop`, or `tourify_exit_freeze`.
4. Confirm `/creator-commons` and APIs return feature_disabled.
5. Stop `npm run music:creator-digital-commons-outbox-worker` if processing sensitive events.
6. Record incident in `creator_commons_incidents` / audit events.
7. Verify Phase 1–11 music surfaces unchanged.
