# TOUR-104 — Portfolio query contract

## Acceptance criteria

Cursor pagination, filter grammar, sort allowlist, stable counts, search normalization, and authorization are contract-tested on representative scale.

## Contract

| Param | Rules |
|---|---|
| `status` | `all` or comma-separated `TOUR_LIFECYCLE_STATES` |
| `q` | NFKC + trim + collapse whitespace + lowercase match on name/artist |
| `sort` | allowlist: `start_date`, `end_date`, `name`, `status`, `updated_at`, `created_at` |
| `order` | `asc` \| `desc` |
| `limit` | 1–100 (default 50) |
| `cursor` | opaque base64url `{ sort, order, sortValue, id }`; must match current sort/order |
| `start_from` / `start_to` | inclusive ISO date bounds on `start_date` |

Response adds `page: { totalCount, nextCursor, limit, sort, order, filters }` alongside `tours`.

## Authorization

`listTourPortfolio` requires a resolvable acting org. Rows with a different `org_id` are dropped before paging. `tour.view` remains the HTTP gate.

## Source

- `lib/admin/tour-portfolio-query.ts`
- `AdminTourEventOperationsService.listTourPortfolio`
- `GET /api/admin/tours`

## Verify

`__tests__/admin/tour-portfolio-query.test.ts` (n=500 synthetic org catalog)
