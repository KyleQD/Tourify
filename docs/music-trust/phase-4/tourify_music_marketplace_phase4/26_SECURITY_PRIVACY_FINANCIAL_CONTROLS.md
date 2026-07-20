# Security, Privacy, and Financial Controls

Phase 4 is a high-value target. Security controls must assume account takeover, insider abuse, webhook forgery, partner compromise, wallet theft, and financial-record tampering.

## Authentication and authorization

Require strong MFA or passkeys for issuer and investor financial actions, reauthentication for subscriptions/transfers/wallet changes, session risk checks, capability-based authorization, device and IP anomaly monitoring, and emergency session revocation.

## Financial controls

- immutable raw partner events;
- double-entry or balanced operational subledgers where Tourify records monetary obligations;
- maker-checker approvals;
- daily cash, position, and distribution reconciliations;
- no direct row edits for posted events;
- compensating entries and correction reasons;
- threshold and velocity controls;
- segregation of production duties and secrets.

## Partner and supply-chain security

Perform security, SOC/report, incident, key-management, business-continuity, subcontractor, data-location, insurance, and termination reviews. Pin SDK versions and commit lockfiles. Verify webhook signatures and rotate secrets.

## Privacy

Minimize investor and identity data, document purposes and retention, encrypt restricted fields, restrict employee access, log all reads, support legal holds, and design deletion/anonymization around securities and tax retention duties.

## Smart-contract security

Independent audits, fuzz and invariant tests, multisig, timelocks where appropriate, pause and migration procedures, chain monitoring, admin-key inventory, and prewritten incident communications are required before mainnet use.
