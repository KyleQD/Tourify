# Runbook: Asset Custody

1. Trigger `asset_custody_stop` via admin ops.
2. Freeze asset register and escrow flags.
3. Review `creator_commons_assets` transfer_status; do not mark `transferred` without counsel package.
4. Irreversible transfer remains hard-disabled — never enable via ops shortcut.
5. Engage steward counsel before re-enablement.
