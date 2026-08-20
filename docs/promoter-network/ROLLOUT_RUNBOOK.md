# Event Promoter Network rollout runbook

## Guardrails

Keep every `event_promoter_*` flag disabled until the preceding stage's checks
are complete. Disabling a flag stops new behavior; it never deletes attribution,
commission, payout, risk, or audit evidence.

Automatic promoter payouts are not approved. The current profile-level Stripe
Connect identifier does not establish promoter KYC, tax, sanctions, or payout
readiness. Settlement remains finance-controlled `manual_review` until an
approved readiness contract and a separate implementation are available.

## Stages

| Stage | Enable | Exit criteria |
| --- | --- | --- |
| 0. Internal | none | Migrations, focused tests, RLS contract, and advisor review are complete. |
| 1. Program configuration | `event_promoter_program_enabled` | Authorized organizer can create/open/pause a program; unrelated organizer is denied. |
| 2. Applications | plus `event_promoter_applications_enabled` | Application, approval, invite, suspension, and revocation personas pass. |
| 3. Shadow attribution | plus capture and shadow flags | Link, code, and native-post attribution match expected sales without payable entries. |
| 4. Ledger pilot | plus `event_promoter_payable_commissions_enabled` | Paid/refund/chargeback/retry reconciliation passes for a limited event cohort. |
| 5. Settlement pilot | plus `event_promoter_payouts_enabled` | Verified finance staff can allocate, hold, fail/retry, and confirm manual batches with external settlement references. |
| 6. General availability | staged percentage expansion | Refund ratio, failed batches, risk investigations, authorization denials, and reconciliation mismatches remain within approved operating thresholds. |

## Before enabling a stage

1. Run `supabase/tests/promoter_network_rls_regression.sql` in the isolated project.
2. Review Supabase Security and Performance Advisors; record unrelated legacy notices separately.
3. Test promoter A, promoter B, organizer A, organizer B, finance manager, finance payer, and anonymous personas.
4. Use the event investigation route and payout audit route to inspect ledger lineage, holds, risks, and batches.
5. Export the event reconciliation CSV and reconcile earned, reversals, reinstatements, allocations, and paid settlements.

## Incident response

- Attribution/commission defect: disable payable commissions, preserve evidence, replay only the verified finalizer after a forward fix.
- Suspicious activity: create a high/critical risk flag and place an explicit commission hold before allocation.
- Payout failure: mark the batch failed with a reason, investigate, then retry the same batch. Never create a second allocation for the same earned entry.
- Settlement discrepancy: disable payouts, compare the event investigation CSV to the payout reconciliation, and record an audited finance resolution.
- Data-access concern: disable the applicable feature flag, revoke any accidental grant, capture the request correlation ID, and review the RLS contract before re-enabling.

## Required evidence per pilot event

- event ID and rollout flags/percentages;
- persona test results and timestamps;
- reconciliation export checksum/location;
- finance operator, settlement reference, and batch ID;
- open high/critical risks and their disposition;
- advisor results and approved exceptions.
