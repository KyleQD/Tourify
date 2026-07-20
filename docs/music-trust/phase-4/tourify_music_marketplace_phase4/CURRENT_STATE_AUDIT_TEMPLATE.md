# Phase 4 Current-State Audit Results

Complete this file before creating production migrations or enabling any marketplace feature.

## Repository identity

- Branch:
- Commit:
- Package manager and lockfile:
- Next.js/React versions:
- Supabase CLI and project status:

## Phase 1 music baseline

- Canonical `artist_music` schema and ID types:
- Upload and storage paths:
- Stream and access control:
- Existing marketplace purchase/listing integration:
- Web and mobile playback regression tests:

## Phase 2 rights baseline

- Rights Passport tables and schema:
- Issued snapshot format:
- Parties, claims, agreements, disputes:
- Credential and blockchain status:

## Phase 3 finance baseline

- Royalty source/ledger tables:
- Allocation snapshot model:
- Payout provider and KYC/tax ownership:
- Valuation runs and governance:
- Existing regulated-finance pilot code:

## Existing Tourify marketplace and payments

- Marketplace listing/order tables:
- Stripe or other provider setup:
- Seller payout readiness:
- Webhooks and idempotency:
- Financial/admin permissions:

## Partner and regulatory map

For each role, state `selected`, `candidate`, or `unresolved`, plus contract/status:

- securities counsel:
- intermediary/broker-dealer/funding portal:
- ATS:
- transfer agent:
- custody/wallet provider:
- escrow/payment provider:
- KYC/AML/sanctions provider:
- tax reporting provider:
- smart-contract auditor:

## Security and data inventory

- Auth/MFA/passkey capabilities:
- Capability/role source:
- RLS patterns and exposed schemas:
- Storage buckets and retention:
- Audit-event infrastructure:
- Outbox/jobs/queues:
- KMS/HSM/multisig:
- Incident response and observability:

## Conflicts and assumptions

List every conflict between the documents and repository. The repository wins for current structure; update the plan while preserving Phase 4 boundaries.

## Required ADRs

- regulatory role and partner architecture;
- official securityholder source of truth;
- offering pathway support;
- custody/wallet model;
- secondary-liquidity integration mode;
- tokenization decision;
- financial record and reconciliation model;
- feature flags and rollout.

## Regression baseline

Record commands and results for lint, typecheck, tests, build, music upload, stream, jukebox, marketplace purchase, Phase 2 issuance, Phase 3 allocation, mobile, and RLS tests.
