# APIs, Events, Background Jobs, and Partner Integrations

Use route handlers and asynchronous partner adapters. Financial partner calls must not be hidden inside UI components or database triggers.

## Route families

Suggested versioned route families after repository audit:

- `/api/v1/music-marketplace/issuers`
- `/api/v1/music-marketplace/offerings`
- `/api/v1/music-marketplace/disclosures`
- `/api/v1/music-marketplace/investor-account`
- `/api/v1/music-marketplace/subscriptions`
- `/api/v1/music-marketplace/portfolio`
- `/api/v1/music-marketplace/transfers`
- `/api/v1/music-marketplace/orders`
- `/api/v1/music-marketplace/market-data`
- `/api/v1/music-marketplace/documents`
- `/api/v1/admin/music-marketplace/*`
- `/api/webhooks/music-marketplace/[partner]`

## API rules

Use `requireApiUser`, `jsonError`, colocated Zod schemas, idempotency keys, optimistic-version fields, capability checks, audit events, immutable raw partner payloads, and explicit source/status timestamps. Initialize partner SDK clients lazily to remain build-safe.

## Domain events

Publish events such as:

`marketplace.offering.approved`, `offering.launched`, `subscription.accepted`, `offering.closed`, `position.reconciled`, `transfer.requested`, `order.partner_accepted`, `execution.received`, `settlement.confirmed`, `distribution.reconciled`, `market.suspended`, `disclosure.updated`, `issuer.report.overdue`.

## Jobs

Use outbox-backed workers for partner polling, webhook retries, disclosure publication, eligibility expiry, closing reconciliation, transfer-agent reconciliation, market-data staleness, settlement breaks, statements, issuer deadlines, surveillance enrichment, and notification delivery.

## Partner abstraction

Define interfaces for intermediary, investor onboarding, escrow/payment, transfer agent, custody/wallet, ATS/order execution, tax documents, sanctions screening, and communications archive. Keep provider-specific IDs in adapter tables rather than core domain keys.
