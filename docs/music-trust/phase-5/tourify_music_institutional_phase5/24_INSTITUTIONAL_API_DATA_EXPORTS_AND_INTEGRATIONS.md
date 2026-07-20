# Institutional APIs, Data Exports, and Integrations

## API principles

- partner- and organization-scoped credentials;
- OAuth or signed service credentials;
- least-privilege scopes;
- explicit field-level contracts;
- versioning and deprecation policy;
- rate limits and abuse detection;
- idempotency for mutations;
- immutable audit logs;
- no direct exposure of storage paths or private documents;
- no secret or privileged data in client bundles.

## Export families

- catalog and Rights Passport snapshot;
- royalty and reconciliation history;
- underwriting and valuation inputs;
- diligence status and approved findings;
- bids and transaction terms where authorized;
- fund holdings, NAV, capital activity, and distributions;
- positions, transfers, and settlement status;
- risk, concentration, and scenario snapshots;
- reporting-calendar and disclosure status.

## Formats

Support JSON and CSV initially, with signed manifests and schema versions. Add SFTP, object-delivery, webhooks, or standards-based messages only after partner need and security review.

## Data licensing

Every export enforces seller/issuer permissions, NDA scope, partner contract, data-source licensing, and purpose limitation. Exported data cannot be used to train external models unless separately authorized.

## Webhooks

Institutional outbound webhooks require signed payloads, event IDs, schema versions, retry policy, delivery log, and replay endpoint.
