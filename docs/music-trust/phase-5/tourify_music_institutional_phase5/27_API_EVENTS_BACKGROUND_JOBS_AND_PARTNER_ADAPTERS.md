# APIs, Events, Background Jobs, and Partner Adapters

## Route conventions

Use Next.js route handlers under `app/api/**`, repository authentication helpers, colocated Zod validation, named exports, RORO helpers, and server-only lazy provider clients.

Suggested route families:

```text
/api/institutional/organizations
/api/institutional/opportunities
/api/institutional/data-rooms
/api/institutional/diligence
/api/institutional/underwriting
/api/institutional/iois
/api/institutional/bids
/api/institutional/transactions
/api/institutional/funds
/api/institutional/nav
/api/institutional/reports
/api/institutional/partners/webhooks/[provider]
```

## Domain events

Examples:

```text
institutional.mandate.created
institutional.classification.approved
institutional.snapshot.frozen
institutional.data_room.access_granted
institutional.diligence.finding_created
institutional.underwriting.approved
institutional.ioi.submitted
institutional.bid.submitted
institutional.transaction.closed
institutional.asset_transfer.confirmed
fund.commitment.accepted
fund.capital_call.issued
fund.nav.finalized
fund.distribution.confirmed
institutional.partner.reconciliation_failed
```

## Background jobs

- snapshot generation and hashing;
- document scanning and watermarking;
- statement and data validation;
- provider synchronization;
- reconciliation and exception generation;
- notification and deadline jobs;
- report generation;
- stale eligibility and credential refresh;
- benchmark and risk snapshot calculation;
- audit export and disaster-recovery validation.

All jobs need idempotency, leases, bounded retries, dead-letter queues, metrics, and operator replay controls.
