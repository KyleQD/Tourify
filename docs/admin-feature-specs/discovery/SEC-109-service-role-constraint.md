# SEC-109 — Constrain service-role use

## Acceptance criteria

Service role exists only in named internal modules/jobs; every call supplies verified org and reason; client-supplied org/target values are revalidated.

## Implementation

| Piece | Path |
|-------|------|
| Job wrapper | `lib/supabase/service-role-job.ts` (`executeServiceRoleJob`) |
| Module allowlist | `lib/supabase/service-role-allowlist.ts` |
| Legacy inventory | `lib/supabase/service-role-legacy-imports.json` |
| CI gate | `npm run check:service-role-allowlist` |

### Contract

```ts
await executeServiceRoleJob(
  {
    orgId,                 // verified acting org
    reason,                // non-empty operator reason
    moduleId,              // allowlisted module
    target: { eventId, tourId, saleId }, // optional; revalidated vs orgId
  },
  async (client) => { /* privileged work */ },
)
```

### Pilot migration

`app/api/admin/ticketing/refund/route.ts` uses the job wrapper (removed from legacy inventory).

### Legacy path

Existing bare `createServiceRoleClient` imports remain listed in the JSON inventory. CI fails on **new** bare imports. Prefer migrating high-risk Admin jobs next (comms, calendar token, logistics public link).
