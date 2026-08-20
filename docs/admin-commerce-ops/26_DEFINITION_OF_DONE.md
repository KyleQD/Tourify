# Definition of Done

The Commerce Operations program is complete only when all requirements below are satisfied.

## Scope and Security

1. Every Commerce route uses one server-trusted CommerceContext.
2. Platform, organization, venue, artist, Event, and seller scope are validated.
3. Broad role-string checks are replaced by explicit permissions.
4. Cross-scope API and RLS tests pass.
5. Buyer and seller PII is masked, permissioned, and audited.
6. Provider secrets are not exposed.
7. Webhooks are signed, replay-protected, idempotent, and auditable.

## Money and Transactions

8. Money uses currency-aware minor units.
9. Mixed-currency totals are not silently combined.
10. Marketplace, ticketing, subscriptions, services, merchandise, and promotions are visible through canonical transaction contracts.
11. Party and fee snapshots preserve historical truth.
12. Every captured payment can be traced to an order or approved adjustment.
13. Every order can be traced to payment, fulfillment, fees, refunds, payouts, and settlement.

## Overview and Ledger

14. Commerce Overview shows sales, revenue, liabilities, and operational risk.
15. Needs Attention explains amount, cause, owner, due date, and next action.
16. Unified Transaction Ledger supports server search, filters, sort, pagination, saved views, and export.
17. API failures cannot appear as legitimate empty data.

## Orders and Fulfillment

18. Order lists expose payment, fulfillment, refund, payout, and risk state.
19. Line count and total quantity are distinct.
20. Order detail contains a complete timeline.
21. Customer and seller are presented as useful parties, not raw IDs.
22. Paid orders remain visible until fulfillment is complete or resolved.
23. Physical, digital, ticket, service, and external fulfillment are represented.
24. Ticket paid-versus-issued reconciliation exists.

## Payments and Refunds

25. Payment attempts and provider events are visible.
26. Refunds are idempotent, permissioned, previewed, and audited.
27. Partial refunds update items, fees, seller balance, and fulfillment correctly.
28. Chargebacks and disputes have deadlines, evidence, ownership, and outcomes.
29. Duplicate charge detection and support workflow exist.

## Payouts and Settlement

30. Seller balances reconcile.
31. Payout readiness is explicit.
32. Payout retry verifies provider state and duplicate risk.
33. Unknown provider state cannot be retried as a failure.
34. Holds and releases are permissioned and audited.
35. Settlement reports reconcile gross, fees, refunds, adjustments, and seller payable.
36. Event ticket settlement is supported.

## Products, Sellers, and Risk

37. Products and listings have distinct ownership.
38. Listing lifecycle, inventory, and moderation are visible.
39. External listings have health checks.
40. Seller profile includes readiness, balance, payouts, listings, orders, performance, and restrictions.
41. Moderation uses typed cases with owner, priority, SLA, evidence, and resolution category.
42. Queue KPIs reflect the full dataset, not one page.

## Ticketing, Subscriptions, Fees, and Promotions

43. Ticket financials integrate without replacing Event ticket operations.
44. Subscription payment and entitlement state reconcile.
45. Fee rules are versioned and completed transactions retain snapshots.
46. Promotion payment and activation reconcile.

## Quality and Rollout

47. Existing data is preserved.
48. Migrations are additive.
49. Backfills are idempotent.
50. Unit, service, API, RLS, migration, E2E, accessibility, and performance tests pass.
51. Amount and count parity is verified during shadow mode.
52. Feature flags and rollback procedures exist.
53. Support and repair runbooks exist.
54. Legacy routes are not removed before approved parity and dependency review.
55. Every completed task in `progress-checklist.json` contains evidence.
