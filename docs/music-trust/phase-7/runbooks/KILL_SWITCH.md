# Runbook — Rights Admin Kill Switches

## Flags (independent, default off)

- `music_rights_admin_mandates_enabled`
- `music_rights_admin_cases_enabled`
- `music_rights_admin_registration_enabled`
- `music_rights_admin_matching_enabled`
- `music_rights_admin_usage_enabled`
- `music_rights_admin_claims_enabled`
- `music_rights_admin_mechanical_enabled`
- `music_rights_admin_neighboring_enabled`
- `music_rights_admin_platform_claims_enabled`
- `music_rights_admin_enforcement_enabled`
- `music_rights_admin_dmca_enabled`
- `music_rights_admin_settlements_enabled`
- `music_rights_admin_partners_enabled`
- `music_rights_admin_admin_ops_enabled`
- `music_rights_admin_automated_submission_enabled` (separate approval)
- `music_rights_admin_auto_takedown_enabled` (must stay off without counsel)
- `music_rights_admin_litigation_enabled` (separate approval)

## Procedure

1. Scope the incident (registration, claims, DMCA, enforcement, settlements, automation).
2. `POST /api/admin/rights-admin/ops` with matching `kill_switch_*`, or set `feature_flags.enabled=false`.
3. Dual-control review via `music_rights_admin_audit_events`.
4. Confirm APIs return `feature_disabled`; do not delete evidence or outbox history.
5. Notify registry/platform/counsel partners as applicable.
