# Settlement, Reconciliation, and Corporate Actions

Execution is not final ownership. Phase 4 must reconcile the full path from order through settlement and official position update.

## Settlement states

`execution_received → obligations_calculated → cash_pending → asset_pending → matched → settled → transfer_agent_confirmed → portfolio_reconciled`

Exceptions: `failed`, `reversed`, `buy_in_or_remediation`, `manual_review`, `chain_reorg_review`, `cash_break`, `position_break`.

## Atomic versus conventional settlement

Do not assume blockchain settlement is legally final or operationally atomic. Capture whether cash and asset legs settle on partner books, banking rails, stablecoin rails, or chain, and which event establishes legal finality.

## Corporate actions

Support governed workflows for distributions, maturity, redemption, issuer repurchase, consent requests, amendments, splits/consolidations, security identifier changes, catalog sale, rights replacement, dispute suspension, and termination. Eligibility is based on an official record date.

## Reconciliation controls

Use independent expected-versus-actual comparisons, immutable adjustments, maker-checker approval, aged-break queues, daily control totals, and signed partner statements. Never delete an execution or distribution to repair a mismatch.
