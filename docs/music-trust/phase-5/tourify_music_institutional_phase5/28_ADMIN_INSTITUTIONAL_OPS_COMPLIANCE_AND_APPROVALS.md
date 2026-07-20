# Admin Institutional Operations, Compliance, and Approvals

## Admin queues

- organization and authority review;
- catalog eligibility exceptions;
- transaction classification approvals;
- data-room and clean-team access;
- diligence red flags;
- underwriting and valuation exceptions;
- bid/auction incidents;
- partner onboarding and health;
- fund-admin/NAV reconciliation;
- transfer and settlement exceptions;
- sanctions/KYC/eligibility expirations;
- complaints, disputes, legal holds, and incidents.

## Separation of duties

No single Tourify operator should be able to approve an institution, change a financial record, release a restricted document, override eligibility, and mark settlement complete. Configure maker-checker controls for high-risk actions.

## Approvals

Approvals must record role, scope, evidence, decision, conditions, expiration, and audit event. Legal or compliance approval references should not expose privileged advice.

## Operational dashboards

Show queue age, SLA breaches, provider outages, reconciliation breaks, stale snapshots, failed webhooks, unresolved rights disputes, data-room anomalies, settlement exceptions, and incident status.

## Impersonation

Avoid broad admin impersonation. Where support access is essential, use time-limited, approved, read-only or narrowly scoped sessions with explicit banners and audit logs.
