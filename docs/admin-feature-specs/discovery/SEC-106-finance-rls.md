# SEC-106 — Replace finance RLS

## Acceptance criteria

Blanket authenticated policies are dropped; select/insert/update/delete require effective organization relationship and suitable capability/service function.

## Migration

`supabase/migrations/20260720075248_admin_finance_rls_sec106.sql`

### Dropped legacy policies

Explicitly dropped (including historical blanket names):

- `fin_tx_all`, `budgets_all`, `settlements_write`, `settlements_org_isolation`
- Prior `financial_transactions_*`, `budgets_*`, `settlements_*`, `financial_audit_log_*` / `audit_log_select`

### Replacement

| Table | Access |
|-------|--------|
| `financial_transactions` | `can_finance` view/manage; pay required for paid/refunded writes |
| `budgets` | view/manage; null `org_id` denied |
| `settlements` | view/manage; approve for finalize; pay for paid; delete draft-only |
| `financial_audit_log` | select via audit.view or finance.view/manage; **no** authenticated writes |

Helper: `public.can_finance(uid, org_id, perm)` = membership + `has_perm`.

`FORCE ROW LEVEL SECURITY` enabled on all four tables. Anon revoked. Audit log grants select-only to authenticated.

`get_finance_overview` raises `42501` when the caller lacks finance.view/manage (fail closed).
