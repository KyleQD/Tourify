# Runbook — Perpetual Authority Claims

Phase 19 must never claim perpetual legal authority by software default.

1. Confirm `creator_treaty_legacy_perpetual_authority_enabled` is hard-disabled.
2. Deny activation packages that set `claims_perpetuity=true` for production authority.
3. Use `public_law_claim_stop` / `legacy_freeze` if surfaces imply perpetual institution.
4. Document incident in audit events; leave historical records read-only.
