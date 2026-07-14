# Phase 8 Implementation Notes

## What this package adds

This package creates the universal application review UI for real Tourify hiring data.

It includes:

- typed application review models
- query string helpers
- filters
- empty state
- bulk action bar
- application detail dialog
- universal `ApplicationReviewPanel`
- admin route mount examples

## What this package intentionally does not do

- It does not create candidates from the client.
- It does not create staff members from the client.
- It does not create employment assignments from the client.
- It does not add fake application data.
- It does not replace backend approval bridge logic.

## Dependencies from prior phases

Phase 8 assumes these already exist:

```txt
types/hiring-entity.ts
lib/hiring/employer-search-params.ts
components/hiring/hiring-missing-scope.tsx
/api/hiring/applications
/api/hiring/applications/[id]
```

If any are missing, add the relevant files from Phases 2, 4, and 6 first.

## Merge warnings

If your repo already has `app/admin/(dashboard-shell)/applications/page.tsx`, merge this page carefully. Preserve existing shell/layout logic and swap the inner application UI to `ApplicationReviewPanel`.

If your API returns snake_case fields, map them in the API route to the camelCase UI contract instead of making the UI handle every DB shape.

## Validation checklist

- Load applications for a venue scope.
- Load applications for an organization scope.
- Load applications for an artist scope.
- Filter by status.
- Search by applicant or position.
- Approve one application and confirm candidate/token bridge occurs server-side.
- Reject one application and confirm no candidate is created.
- Shortlist one application.
- Waitlist one application.
- Confirm no mock applications appear when API returns empty results.
