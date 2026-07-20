# Testing, Pilot, and Rollout

Phase 4 should launch through a closed pilot using simulated and partner-sandbox transactions before any live offering.

## Test layers

- unit tests for state transitions, eligibility read models, restrictions, money, quantity, fees, and staleness;
- RLS and capability tests for every investor/issuer/admin role;
- contract tests against partner sandboxes;
- webhook replay, reordering, duplication, and signature tests;
- closing, refund, oversubscription, partial fill, cancellation, settlement-fail, and reconciliation tests;
- smart-contract invariants and external audit;
- accessibility, performance, mobile, and partner-embed tests;
- disaster recovery and provider-exit drills.

## Pilot sequence

1. synthetic offerings and positions;
2. employee/internal sandbox with no money;
3. one issuer data-room pilot;
4. partner sandbox subscriptions;
5. counsel-approved limited primary offering;
6. distributions and reporting cycle;
7. transfer-request pilot;
8. limited partner ATS access only after restriction and surveillance validation.

## Go-live gates

No critical security issues; complete role map; signed partner contracts; approved offering documents; successful reconciliation; tested refunds and incident response; current tax/OFAC/KYC configuration; completed staff training; verified feature flags and kill switches; executive, legal, compliance, and security sign-off.

## Rollback

Feature flags must disable discovery, new subscriptions, transfers, orders, and partner calls independently while preserving portfolio access, documents, statements, and support. Never rollback by deleting financial or securityholder records.
