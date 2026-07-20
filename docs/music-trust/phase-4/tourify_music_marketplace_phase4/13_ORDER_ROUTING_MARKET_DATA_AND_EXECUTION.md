# Order Routing, Market Data, and Execution

Order and market-data displays are high-risk financial interfaces. Every field needs provenance, timestamp, venue, and status.

## Order state machine

`draft_local → submitted_to_partner → partner_received → accepted → open → partially_filled → filled`

Exception states: `rejected`, `cancel_pending`, `cancelled`, `expired`, `suspended`, `compliance_hold`, `settlement_failed`. Local draft orders must never appear as market interest.

## Execution controls

The regulated partner owns order validation, market-access controls, buying power, position checks, fat-finger limits, restricted-list checks, routing, execution quality, trade corrections, and cancellation. Tourify displays receipts and does not rewrite fills.

## Market data labels

Differentiate:

- indicative issuer valuation;
- last executed trade;
- current partner bid/ask;
- delayed market data;
- net asset or cash-flow estimate;
- subscription price;
- distribution yield calculated from historical data.

Never combine these into one “current token value.”

## Staleness

Every price carries venue, timestamp, delay status, currency, unit, and session state. Hide or label stale quotes. Market data outages must not silently display the last value as current.
