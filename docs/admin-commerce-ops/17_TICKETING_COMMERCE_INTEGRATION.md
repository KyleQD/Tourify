# Ticketing Commerce Integration

## Objective

Integrate ticketing financial oversight into Commerce Operations while preserving Event-level ticket operations.

## Event Workspace Ownership

Event workspaces retain:

- ticket types,
- pricing,
- inventory,
- promo codes,
- guest lists,
- Event check-in,
- Event-specific sales analytics.

## Commerce Operations Ownership

Commerce owns:

- cross-Event ticket transactions,
- payment health,
- ticket issuance reconciliation,
- refunds,
- chargebacks,
- platform ticket fees,
- seller or Event payable,
- settlement,
- provider reconciliation.

## Ticket Transaction Read Model

Include:

- Event,
- ticket type,
- quantity,
- customer,
- gross,
- discount,
- fee,
- tax,
- payment state,
- tickets reserved,
- tickets issued,
- tickets delivered,
- tickets transferred,
- tickets checked in,
- refund state,
- settlement state.

## Critical Reconciliation Rules

- Paid ticket order without tickets issued.
- Tickets issued without captured payment.
- Refund completed without ticket void or revocation.
- Ticket transfer after refund.
- Check-in after ticket void.
- Inventory reservation not released after failed payment.
- Promo-code discount mismatch.
- Event settlement missing.

## Event Settlement

Show:

- ticket gross,
- discounts,
- refunds,
- platform ticket fee,
- processor fee,
- Event or organizer net,
- payout state,
- settlement status.

## Ticket Refund Workflow

Must coordinate:

- payment refund,
- ticket revocation,
- inventory return,
- transfer state,
- Event capacity,
- customer notification,
- settlement recalculation.

## External Ticketing Integrations

Where applicable, track:

- provider,
- imported sales,
- settlement status,
- sync health,
- webhook or polling status,
- reconciliation differences.
