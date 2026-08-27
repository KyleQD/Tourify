# Ticketing Permissions Matrix

All UI checks are advisory. Server commands, repository queries, and database policies enforce verified organization/event parentage and the narrow capability.

| Capability | Read/command scope |
| --- | --- |
| `ticketing.view` | Organization portfolio and permitted event overview |
| `ticketing.setup.manage` | Configure event readiness and setup |
| `ticketing.inventory.manage` | Products, pricing, allocations, holds, inventory corrections |
| `ticketing.orders.view` | Orders and non-sensitive attendee fields |
| `ticketing.attendees.view` | Attendee and holder operations |
| `ticketing.attendee_pii.view` | Contact fields and PII-bearing exports |
| `ticketing.refund` | Refund preview and execution |
| `ticketing.admissions.operate` | Scan, lookup, check-out, and re-entry |
| `ticketing.admissions.override` | Reasoned overrides and reversals |
| `ticketing.promotions.manage` | Programs, links, codes, and distribution operations |
| `ticketing.analytics.view` | Governed ticketing reports |
| `ticketing.finance.view` | Read-only operational Finance projections |
| `ticketing.settings.manage` | Event ticketing settings |
| `ticketing.grants.manage` | Event-level ticketing access grants |

`ticketing.manage` and `ticketing.scan` are deprecated aliases. They map server-side to explicit capability sets during rollout; database policy and new application code do not broaden access based on aliases.

