# Commerce Context, Authorization, and RLS

## Canonical Commerce Context

```ts
export interface CommerceContext {
  actor: {
    userId: string
    profileId: string | null
  }
  scope: {
    type: "platform" | "organization" | "venue" | "artist" | "event" | "seller"
    id: string | null
  }
  permissions: CommercePermissionSet
  display: {
    name: string
    timezone: string
    defaultCurrency: string
  }
}
```

## Resolution Rules

1. Authenticate user.
2. Resolve acting account.
3. Resolve explicit requested scope.
4. Validate membership or platform role.
5. Load commerce permissions.
6. Validate child Event, seller, or storefront scope.
7. Hydrate display data.
8. Construct server-trusted context.

Never trust:

- client-provided admin role,
- editable user metadata,
- URL seller ID,
- URL Event ID,
- client-provided financial permission,
- displayed account name.

## Suggested Permissions

```text
commerce.view
commerce.view_customers
commerce.view_seller_pii
commerce.manage_orders
commerce.manage_fulfillment
commerce.manage_listings
commerce.manage_sellers
commerce.manage_cases
commerce.issue_refunds
commerce.manage_disputes
commerce.view_financials
commerce.retry_payouts
commerce.manage_payouts
commerce.manage_settlements
commerce.manage_fees
commerce.manage_subscriptions
commerce.export
commerce.view_audit
ticketing.view_financials
ticketing.manage_refunds
```

## Separation of Duties

Recommended role separation:

- Support: view orders, annotate, contact, escalate.
- Moderation: manage policy and dispute cases.
- Finance: refunds, payouts, settlements, reconciliation.
- Seller Operations: seller readiness and restrictions.
- Super Admin: providers, fee rules, high-risk overrides.
- Auditor: read-only evidence.

Large or unusual financial actions may require dual approval.

## Authorization Matrix

Each route must specify:

- authentication requirement,
- scope requirement,
- permission,
- field-level PII permission,
- financial threshold approval,
- audit requirement,
- provider-state requirement.

## RLS Requirements

- RLS on every exposed commerce table.
- Scope marketplace seller records to appropriate owner and admins.
- Scope organization and Event records to membership.
- Protect platform-only moderation and financial data.
- Use `USING` and `WITH CHECK` for updates.
- Do not rely only on `TO authenticated`.
- Use security-invoker views.
- Keep privileged functions restricted.
- Revoke public execution where needed.
- Never expose provider secrets.

## Cross-Scope Tests

Test:

1. Platform finance admin can view permitted platform transactions.
2. Support agent cannot retry payouts.
3. Moderator cannot view unnecessary payout destination data.
4. Organization manager sees only organization commerce.
5. Event manager sees only permitted Event ticketing financials.
6. Artist seller sees only own seller records.
7. User cannot change seller scope in URL to read another seller.
8. Export enforces current scope and fields.
9. Aggregates do not leak counts.
10. Realtime or subscriptions do not leak changes.

## High-Risk Reauthentication

Consider recent-authentication checks for:

- large refunds,
- payout release,
- manual balance adjustment,
- provider configuration,
- fee-rule changes,
- seller payout destination changes.
