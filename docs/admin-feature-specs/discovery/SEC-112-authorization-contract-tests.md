# SEC-112 — Authorization contract tests

## Acceptance criteria

Endpoint tests cover owner, role, custom role, expired/revoked membership, wrong org, guessed ID, child ID, bulk IDs, share token, and service job.

## Suite

`__tests__/admin/authorization-contract.test.ts`

Uses `ADMIN_FEATURE_FIXTURE` personas/orgs and exercises:

| Case | Coverage |
|------|----------|
| Owner | Full capability invariant |
| Role | tour_manager vs finance.pay |
| Custom role | configured catalog capabilities |
| Revoked membership | empty capabilities |
| Expired grant | ignored |
| Wrong org | `requireEntityAccess` → 404 |
| Guessed ID | `orgScopedUpdate` null match |
| Child ID | parent chain rejection |
| Bulk IDs | each id revalidated; cross-org null |
| Share token / acting headers | org A ≠ org B headers |
| Capability deny | viewer + `tour.delete` → 403 |
| Service job | target org mismatch rejected |

Live DB RLS matrix remains `npm run test:rls-matrix` / admin-rls CI (REL-101).
