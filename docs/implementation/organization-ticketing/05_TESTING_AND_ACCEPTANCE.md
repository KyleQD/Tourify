# Testing and Acceptance

## Per-task evidence

Every manifest task records the exact command, result, artifact, and relevant environment. A phase does not pass on documentation or unit tests alone when its gate requires deployed-schema, RLS, authenticated E2E, concurrency, accessibility, or performance evidence.

## Required suites

- Domain contracts, state machines, repositories, compatibility identifiers, and migration replay.
- Live RLS personas: owner, admin, ticketing manager, finance, promoter, door staff, attendee, revoked member, and foreign-organization user.
- Organization A/B account switching and guessed event/order/ticket IDs.
- Inventory concurrency: final ticket, oversell, expiry, release, refund restoration, duplicate idempotency keys, lock order, and replay.
- Full authenticated configure → price → allocate → sell/comp → transfer/refund → promote → scan online/offline → settle flow.
- Provider/webhook/refund/attribution replay and recovery.
- Keyboard, focus, screen-reader, contrast, dialogs, tables, scanner fallback, and responsive layouts.
- Dashboard/workspace query and response budgets, cursor pagination, sale throughput, and scans per second.

## Global assertions

- No false-zero metric conversions.
- No customer migration/debug language.
- No cross-organization response or cached-data flash.
- No oversell and no hidden partial financial success.
- Freshness, completeness, and source errors remain visible.

