# Database Compatibility Map

This map records observed authority. Exact columns, policies, grants, and retirement evidence are completed by `TKT-0201` before repository cutover.

| Domain | Canonical / reused | Compatibility inputs | Known drift or gate |
| --- | --- | --- | --- |
| Event parent | `events_v2` | `events`, `events_old` | Every legacy reference must resolve through authorized parentage |
| Setup | `event_ticketing_config` | legacy event flags | Plural `event_ticketing_configs` is not deployed |
| Products | `ticket_types`; planned immutable versions | `event_ticket_types` | Counters are compatibility anchors, not final authority |
| Sales/tickets | `tickets`; planned canonical order/payment/refund projections | `ticket_sales` | Import references preserve source IDs |
| Inventory | reservations, allocations, planned movements/snapshot | bridge counters | `ticketing_inventory_ledger` is not deployed |
| Admissions | `ticket_checkins`, credentials, guest-list/invite structures | legacy check-in fields | Scanner/offline package schema is additive |
| Promotions | live promotion program, membership, link, attribution, commission, risk, and payout tables | `promo_codes`, `event_promo_codes`, `ticket_campaigns` | Active checked-in migration parity is missing |
| Finance | `financial_transactions`, `settlements`, versioned handoffs | legacy sale totals | Finance retains accounting authority |
| Analytics | governed ticketing events/read models | legacy aggregates | Partial legacy attribution remains explicit |
| Cutover | planned reconciliation runs/issues/approvals/decisions | comparison helpers | Persistence tables are not deployed |

## Verified nonexistent references in current Admin APIs

- `event_ticketing_configs`
- `ticketing_inventory_ledger`
- `scanner_devices`
- `admissions_scans`
- `comp_requests`

These references must be removed behind compatibility repositories; similarly named parallel tables must not be introduced to preserve broken queries.

## Security baseline

The connected schema exposes callable security-definer inventory functions, overlapping permissive policies, missing ticketing/promoter relationship indexes, and duplicate promo/campaign indexes. Phase 0 uses additive privilege and policy reconciliation. Tightened boundaries are not rolled back to permissive access.

