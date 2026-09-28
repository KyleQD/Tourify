# SEC-110 — Organization predicates on mutations

## Acceptance criteria

Update/delete queries include target ID and acting `org_id`; child mutations validate the parent chain inside the same transaction.

## Implementation

| Piece | Path |
|-------|------|
| Helpers | `lib/admin/org-scoped-mutation.ts` |
| SQL RPC | `admin_assert_child_parent_org_chain` in `20260720153400_admin_org_scoped_mutation_sec110.sql` |

### Parent mutations

`orgScopedUpdate` / `orgScopedDelete` always apply:

`.eq('id', targetId).eq('org_id', actingOrgId)`

Wired into:

- Tour update/delete (`tour-event-operations.service.ts`)
- Ground transport PATCH
- Lodging booking update/delete
- Finance already followed this pattern (documented)

### Child mutations

`assertChildParentOrgChain` → prefer SQL RPC (single transactional check) → fallback dual read.

Then mutate with `.eq('id', childId).eq(parentFk, parentId)`.

Wired into lodging guest/payment/calendar update + delete.
