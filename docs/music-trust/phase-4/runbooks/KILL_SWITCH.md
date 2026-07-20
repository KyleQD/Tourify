# Runbook — Marketplace Kill Switches

## Flags (independent, default off)

- `music_marketplace_offerings_enabled`
- `music_marketplace_investor_portal_enabled`
- `music_marketplace_subscriptions_enabled`
- `music_marketplace_transfers_enabled`
- `music_marketplace_secondary_sync_enabled`
- `music_marketplace_tokenization_enabled`
- `music_marketplace_admin_ops_enabled`

## Procedure

1. Confirm incident scope (offerings, subscriptions, secondary sync, transfers).
2. Use admin ops `POST /api/admin/music-marketplace/ops` with the matching `kill_switch_*` action, or set `feature_flags.enabled = false` and `rollout_percentage = 0`.
3. Dual-control: second admin reviews `music_marketplace_admin_actions`.
4. Verify APIs return `feature_disabled` (404) and UI surfaces unavailable states.
5. Notify regulated partners; do not invent Tourify-side cancellations of legal positions.
6. Record incident timeline in complaints/incidents runbook.

## Restore

Only after counsel/compliance/executive approval. Re-enable one flag at a time with limited rollout.
