# COM-001 — Admin Commerce Route, Redirect, and Navigation Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-001`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: inventory every admin commerce route, redirect, and navigation entry before beginning UI or financial behavior changes.

## Verified Admin Commerce Pages

| Route | File | Current responsibility | Notes |
| --- | --- | --- | --- |
| `/admin/dashboard/marketplace` | `app/admin/dashboard/marketplace/page.tsx` | Marketplace tab workspace for orders, moderation, and payouts. | Client component. Orders tab loads `/api/admin/marketplace/orders?limit=50`; moderation loads `/api/admin/marketplace/moderation`; payouts tab currently derives payout rows from `/api/admin/finances?type=overview`. |
| `/admin/dashboard/marketplace/orders` | `app/admin/dashboard/marketplace/orders/page.tsx` | Dedicated marketplace order list. | Uses shared admin chrome and `/api/admin/marketplace/orders`; filtering/search currently happens client-side after broad load. |
| `/admin/dashboard/marketplace/orders/[id]` | `app/admin/dashboard/marketplace/orders/[id]/page.tsx` | Marketplace order detail, items, payout ledger, and payout retry action. | Calls `/api/admin/marketplace/orders/[id]` and `/api/admin/marketplace/payouts/[id]/retry`. Payout retry is a high-risk action for later hardening. |
| `/admin/dashboard/ticketing` | `app/admin/dashboard/ticketing/page.tsx` | Ticketing sales/campaign/admin workspace. | Loads admin ticketing enhanced APIs, read-model panel, inventory ledger, setup, allocations, admissions, guest approvals, and refund workflow. |
| `/admin/dashboard/ticketing/enhanced` | `app/admin/dashboard/ticketing/enhanced/page.tsx` | Redirect compatibility route. | Preserves query params and redirects to `/admin/dashboard/ticketing`. |
| `/admin/dashboard/finances` | `app/admin/dashboard/finances/page.tsx` | Admin finance overview, transactions, budgets, settlements, reconciliation, expenses, and commitments. | Uses organization-scoped admin capability APIs under `/api/admin/finances/*`. |
| `/admin/dashboard/store` | `app/admin/dashboard/store/page.tsx` | Admin merch/listing store management. | Links to Inventory and calls `/api/admin/store`. |
| `/admin/dashboard/inventory` | `app/admin/dashboard/inventory/page.tsx` | Inventory operations surface. | Listed under Commerce sidebar; includes merch/equipment inventory concerns. |

## Related Admin Commerce Embeds

| Surface | File | Commerce relationship |
| --- | --- | --- |
| Tour detail operations tabs | `app/admin/dashboard/tours/[id]/page.tsx` | Contains `ticketing` and `finances` tab panels and fetches `/api/admin/finances?type=transactions&tour_id=...`. |
| Tour builder finance step | `app/admin/dashboard/tours/builder/page.tsx` | Includes finance/ticketing planning section and links back to `/admin/dashboard/finances`. |
| Tour planner ticketing step | `app/admin/dashboard/tours/planner/components/ticketing-financials-step.tsx` | Collects ticketing and financial inputs during planning. |
| Event detail operations | `app/admin/dashboard/events/[id]/page.tsx` | Loads event finances through `/api/events/[id]/finances` and presents event commerce signals. |
| Event check-in route | `app/admin/dashboard/events/[id]/check-in/page.tsx` | Ticket check-in/admin admissions adjacency. |
| Organization finance settings | `app/admin/dashboard/organization/page.tsx`, `components/admin/organization/org-finance-settings-panel.tsx` | Organization-level finance configuration and links to Finances. |
| Organization ticketing settings | `app/admin/dashboard/organization/page.tsx`, `components/admin/organization/org-ticketing-settings-panel.tsx` | Organization-level ticketing setup and links to Ticketing. |
| Music marketplace ops panel | `app/admin/dashboard/music/page.tsx`, `components/admin/music-marketplace-ops-panel.tsx` | Separate music marketplace operations area that should be mapped in COM-002/COM-003 before consolidation. |

## Admin Redirects

| Redirect route | File | Target |
| --- | --- | --- |
| `/admin` | `app/admin/page.tsx` | `/admin/dashboard`, preserving query params. |
| `/admin/settings` | `app/admin/settings/page.tsx` | `/admin/dashboard/settings`, preserving query params. |
| `/admin/dashboard/ticketing/enhanced` | `app/admin/dashboard/ticketing/enhanced/page.tsx` | `/admin/dashboard/ticketing`, preserving query params. |
| `/admin/(dashboard-shell)/applications` | `app/admin/(dashboard-shell)/applications/page.tsx` | `/admin/dashboard/applications`, preserving query params; not commerce but part of admin redirect baseline. |
| `/admin/(dashboard-shell)/job-postings/new` | `app/admin/(dashboard-shell)/job-postings/new/page.tsx` | `/admin/dashboard/jobs/new`, preserving query params; not commerce but part of admin redirect baseline. |
| `/admin/(dashboard-shell)/teams/[jobId]` | `app/admin/(dashboard-shell)/teams/[jobId]/page.tsx` | `/admin/dashboard/hiring?...`; not commerce but part of admin redirect baseline. |
| `/admin/dashboard/tours/create` | `app/admin/dashboard/tours/create/page.tsx` | `/admin/dashboard/tours/builder`, preserving query params. |
| `/admin/dashboard/tours/planner` | `app/admin/dashboard/tours/planner/page.tsx` | `/admin/dashboard/tours/builder`, preserving query params. |
| `/admin/dashboard/logistics/site-maps-enhanced` | `app/admin/dashboard/logistics/site-maps-enhanced/page.tsx` | Canonical site-map admin route; not commerce but included as redirect baseline. |
| `/admin/dashboard/onboarding` | `app/admin/dashboard/onboarding/page.tsx` | Hiring template routes; not commerce but included as redirect baseline. |

## Sidebar Navigation Entries

Primary admin commerce navigation is declared in `app/admin/dashboard/components/optimized-sidebar.tsx`.

| Navigation label | Href | Notes |
| --- | --- | --- |
| Commerce | `__commerce__` | Parent group only; no route. |
| Ticketing | `/admin/dashboard/ticketing` | Shows `stats.ticketsSold` badge and shortcut `⌘6`. |
| Finances | `/admin/dashboard/finances` | Shows `stats.monthlyRevenue` badge and shortcut `⌘9`. |
| Marketplace | `/admin/dashboard/marketplace` | Described as listings, orders, and payouts. |
| Store | `/admin/dashboard/store` | Merch store management. |
| Inventory | `/admin/dashboard/inventory` | Equipment and merch inventory. |

## Additional Commerce Navigation Links

| Source | Link | Notes |
| --- | --- | --- |
| `components/admin/analytics/data-quality-alerts.tsx` | `/admin/dashboard/finances`, `/admin/dashboard/ticketing` | Data-quality alerts link into finance and ticketing. |
| `app/admin/dashboard/components/dashboard-quick-hub.tsx` | `/admin/dashboard/ticketing`, `/admin/dashboard/finances` | Dashboard quick hub links into commerce surfaces. |
| `app/admin/dashboard/components/optimized-dashboard-client.tsx` | `/admin/dashboard/finances` | Dashboard finance card link. |
| `app/admin/dashboard/finances/page.tsx` | `/admin/dashboard/marketplace/orders` | Finance page links to Marketplace Orders. |
| `app/admin/dashboard/store/page.tsx` | `/admin/dashboard/inventory` | Store page links to Inventory. |
| `components/admin/organization/org-finance-settings-panel.tsx` | `/admin/dashboard/finances` | Organization settings finance link. |
| `components/admin/organization/org-ticketing-settings-panel.tsx` | `/admin/dashboard/ticketing`, `/admin/dashboard/ticketing?tab=admissions` | Organization settings ticketing and admissions links. |
| `components/admin/contextual-navigation.tsx` | `/admin/dashboard/events/[eventId]/ticketing` | Potential mismatch: no matching `app/admin/dashboard/events/[id]/ticketing/page.tsx` route exists today. |
| `app/admin/dashboard/tours/[id]/page.tsx` | `/admin/dashboard/finances` and route-local `ticketing` / `finances` tabs | Tour detail commerce entry points are tabs, not separate routes. |
| `app/admin/dashboard/tours/builder/page.tsx` | `/admin/dashboard/finances` and route-local finance section | Tour builder commerce planning entry point. |

## Known Route and Navigation Gaps

- `components/admin/contextual-navigation.tsx` emits `/admin/dashboard/events/[id]/ticketing`, but no matching page route exists. Existing ticketing functionality appears to live in `/admin/dashboard/ticketing` and event detail panels.
- `/admin/dashboard/marketplace` has an embedded orders list and a dedicated `/admin/dashboard/marketplace/orders` page. Later Commerce HQ work should decide which becomes canonical after parity.
- The marketplace payouts tab is not backed by `/api/admin/marketplace/payouts`; it filters finance overview transactions client-side. COM-002 should classify this API dependency explicitly.
- Existing Commerce sidebar has no single `/admin/dashboard/commerce` route. The planned Commerce Operations HQ can either replace `/admin/dashboard/marketplace` behind `FEATURE_ADMIN_COMMERCE_OPS` or add a new route later, but this program plan currently keeps `/admin/dashboard/marketplace` as the rollout shell.

## Evidence Commands

- `find app/admin -type f \( -name 'page.tsx' -o -name 'route.ts' -o -name 'layout.tsx' \) | sort`
- `find app -path '*marketplace*' -o -path '*ticketing*' -o -path '*finances*' -o -path '*subscriptions*' -o -path '*promotions*' -o -path '*store*' -o -path '*inventory*' | sort`
- `find app -type f \( -name 'page.tsx' -o -name 'route.ts' \) | rg '(/marketplace|/ticketing|/finances|/subscriptions|/promotions|/store|/inventory|/tickets)'`
- `rg -n "Commerce|Marketplace|Ticketing|Finances|Store|Inventory|payout|orders|marketplace|ticketing|finances|store|inventory|redirect\(" app/admin components/admin lib/routing middleware.ts -g '*.tsx' -g '*.ts'`
