# Primary Offering Workflow

Primary offerings should be orchestrated through a state machine whose authoritative transitions are signed by the regulated partner.

## Lifecycle

`draft → preflight → partner_due_diligence → filing_preparation → filed → qualified_or_live → accepting_subscriptions → minimum_met → closing_pending → closed → active_reporting → matured_or_terminated`

Additional terminal or exceptional states: `withdrawn`, `rejected`, `suspended`, `cancelled`, `failed_minimum`, `rescission_review`.

## Launch controls

- Partner-approved offering ID and pathway decision.
- Approved disclosure version and marketing library.
- Verified issuer, bank/escrow, transfer agent, and tax configuration.
- Investment limits and jurisdiction rules loaded from partner.
- Opening and closing times synchronized.
- Minimum/maximum raise and oversubscription policy fixed.
- No local Tourify override of partner suspension or rejection.

## Subscription visibility

Tourify may show partner-supplied aggregate progress after defining whether the value is committed, funded, cleared, accepted, or closed. Never mix these categories. Do not expose investor identities or imply that indications of interest are completed investments.

## Closing outputs

Persist partner receipts for accepted subscriptions, rejected/refunded subscriptions, final allocation, official position creation, funds release, fee deductions, issuer proceeds, investor confirmations, and opening securityholder reconciliation.
