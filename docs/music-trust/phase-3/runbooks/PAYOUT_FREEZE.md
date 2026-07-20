# Phase 3 Payout Freeze Runbook

Stops royalty money movement without deleting ledger history.

## When to freeze

- Suspected payout redirection, webhook forgery, or maker-checker bypass.
- Provider reconciliation variance that cannot be explained same-day.
- Sanctions/tax/KYC hold requiring global stop.
- Key compromise (Stripe, service role, connector secrets).
- Counsel or finance directive.

## Freeze procedure (order matters)

1. **Hard stop:** set `music_payouts_enabled` → `false`, `rollout_percentage=0`.
2. **Stop new batches:** pause creation/approval of `music_royalties_payout_batches` (admin ops: disable `music_royalties_admin_ops_enabled` if needed).
3. **Do not reverse posted journals** for a freeze — use holds (`music_royalties_holds` types: `sanctions`, `kyc`, `legal`, `manual`) on open allocations/instructions.
4. **Provider side:** pause Stripe Connect transfers/payouts for the royalty program in the Stripe dashboard if in-flight instructions exist.
5. **Statements stay read-only:** leave `music_royalties_statements_enabled` unless disclosure itself is the incident; ingestion/ledger may remain on for shadow calc (`music_royalties_ingestion_enabled` / `music_royalties_ledger_enabled`).
6. Notify finance + compliance; open incident per `INCIDENTS.md`.

## In-flight instruction states

| State | Action |
|---|---|
| Draft / pending approval | Cancel; do not approve |
| Submitted to provider | Mark held; reconcile webhook; do not auto-retry |
| Paid / settled | Reconcile only; clawback is provider+counsel process |
| Failed | Leave failed; no auto-resubmit until unfreeze |

## Unfreeze checklist

1. Reconciliation closed (`music_royalties_payout_reconciliations` status `matched` or accepted `variance` with owner sign-off).
2. Payee readiness clean (`music_royalties_payout_readiness`: tax/sanctions not blocked).
3. Webhook signature verification and idempotency re-verified in staging.
4. Maker-checker path exercised on a **sandbox** batch.
5. Re-enable `music_payouts_enabled` at low rollout; first real batch dual-approved.

Shadow mode (calc + statements, no money) = `music_payouts_enabled=false` with ledger/statements flags as approved for the pilot.
