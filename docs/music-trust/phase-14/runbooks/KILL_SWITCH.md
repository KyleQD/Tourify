# Runbook: Kill Switch (Phase 14)

1. Open admin music dashboard → Interop convention ops (requires `creator_interop_convention_readiness_enabled`).
2. Disable the affected surface (`kill_switch_*`).
3. For broad incident: `convention_freeze`, `treaty_implication_stop`, or `universal_representation_stop`.
4. Confirm `/interop-convention` and APIs return feature_disabled.
5. Stop `npm run music:creator-interoperability-convention-outbox-worker` if needed.
6. Verify Phase 1–13 surfaces unchanged.
