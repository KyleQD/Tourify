# Runbook — Licensing Kill Switches

## Flags (independent, default off)

- `music_licensing_availability_enabled`
- `music_licensing_briefs_enabled`
- `music_licensing_requests_enabled`
- `music_licensing_quotes_enabled`
- `music_licensing_agreements_enabled`
- `music_licensing_delivery_enabled`
- `music_licensing_cues_usage_enabled`
- `music_licensing_payments_enabled`
- `music_licensing_ai_enabled`
- `music_licensing_ddex_enabled`
- `music_licensing_admin_ops_enabled`
- `music_licensing_automated_pricing_enabled` (separate approval)
- `music_licensing_multi_territory_direct_enabled` (separate approval)
- `music_licensing_self_service_enabled` (separate approval)

## Procedure

1. Scope the incident (availability, quotes, agreements, delivery, payments, AI, DDEX).
2. `POST /api/admin/licensing/ops` with matching `kill_switch_*`, or set `feature_flags.enabled=false`.
3. Dual-control review via `music_licensing_audit_events`.
4. Confirm APIs return `feature_disabled`; do not treat held deliveries or quotes as licences.
5. Notify signature/payment/CMO partners as applicable.
