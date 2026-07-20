# Runbook — Institutional Kill Switches

## Flags (independent, default off)

- `music_institutional_orgs_enabled`
- `music_institutional_deals_enabled`
- `music_institutional_dataroom_enabled`
- `music_institutional_diligence_enabled`
- `music_institutional_underwriting_enabled`
- `music_institutional_bids_auctions_enabled`
- `music_institutional_closings_enabled`
- `music_institutional_funds_enabled`
- `music_institutional_nav_enabled`
- `music_institutional_secondaries_enabled`
- `music_institutional_tokenization_enabled`
- `music_institutional_cross_border_enabled`
- `music_institutional_admin_ops_enabled`

## Procedure

1. Scope the incident (deals, funds, NAV, secondaries, tokenization, cross-border).
2. `POST /api/admin/institutional/ops` with matching `kill_switch_*`, or set `feature_flags.enabled=false`.
3. Dual-control review via `music_institutional_admin_actions`.
4. Confirm APIs return `feature_disabled`; do not invent official NAV/ownership state.
5. Notify fund admin / intermediary / TA partners as applicable.
