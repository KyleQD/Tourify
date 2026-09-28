# Runbook — Treaty Legacy Kill Switches

## Flags (independent, default off)

All `creator_treaty_legacy_*` flags. Hard-disabled family remains false even if DB row is true:

- `creator_treaty_legacy_public_activation_enabled`
- `creator_treaty_legacy_perpetual_authority_enabled`
- `creator_treaty_legacy_future_person_representation_enabled`
- `creator_treaty_legacy_privacy_override_enabled`
- `creator_treaty_legacy_universal_identity_enabled`
- `creator_treaty_legacy_ownership_adjudication_enabled`
- `creator_treaty_legacy_local_exit_block_enabled`
- `creator_treaty_legacy_sensitive_archive_public_dump_enabled`
- `creator_treaty_legacy_century_scale_launch_enabled`
- `creator_treaty_legacy_phase20_handoff_enabled`

## Actions

Admin ops POST `/api/admin/creator-treaty-system-legacy/ops` with:

- `kill_switch_readiness`
- `kill_switch_custody`
- `kill_switch_identifiers`
- `public_law_claim_stop`
- `legacy_freeze`

## Notes

Phase 18 flags never authorize Phase 19. Disabling readiness returns 404 on readiness APIs.
