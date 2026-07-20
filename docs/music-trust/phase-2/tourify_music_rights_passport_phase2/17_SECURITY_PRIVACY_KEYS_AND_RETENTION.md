# Security, Privacy, Keys, and Retention

## Threat model

Protect against:

- unauthorized catalog claims;
- cross-artist access;
- invitation theft;
- evidence leakage;
- agreement tampering;
- signature replay;
- malicious uploads;
- insider abuse;
- credential forgery;
- signing-key compromise;
- blockchain admin compromise;
- public endpoint enumeration;
- mass scraping;
- audit-log deletion.

## Data classes

### Public

Public artist/title, authorized credits, selected identifiers, verification status, manifest hash, public issuer data.

### Confidential

Private shares, agreements, external registration evidence, contributor contact, review results.

### Highly restricted

Identity documents, signature evidence, IP addresses, minors' information, legal notices, tax data, key material.

## Authorization

- RLS on all exposed tables;
- explicit ownership/capability predicates;
- separate service-role workers;
- short-lived signed storage URLs;
- invitation scope and expiration;
- reauthentication for signing;
- session checks for high-risk operations;
- no user metadata authorization.

## Key hierarchy

- database/storage keys managed by provider;
- credential issuer key;
- C2PA signing key;
- blockchain transaction key;
- contract admin multisig;
- webhook secrets;
- encryption keys for restricted fields if used.

Keep signing and transaction keys out of application source and client bundles. Prefer managed KMS/HSM-compatible storage.

## Rotation

Document:

- routine rotation;
- emergency revocation;
- public key publication;
- retired-key verification;
- reissuance thresholds;
- status-list update;
- contract issuer revocation;
- incident communication.

## Retention

Define by category:

- archival masters while account/service agreement permits;
- signed agreements for required legal period;
- identity evidence only as long as necessary;
- audit events according to legal/security needs;
- rejected evidence with minimization;
- deleted-account workflow that preserves legally necessary records while removing unnecessary PII.

## Privacy principles

- data minimization;
- purpose limitation;
- no private data on-chain;
- no model training on artist uploads without separate opt-in;
- vendor DPAs;
- export and access requests;
- deletion exceptions documented;
- privacy review for channel-specific watermarking.

## Security gates

- threat model approved;
- RLS tests;
- storage-policy tests;
- dependency audit;
- upload fuzzing;
- signature replay tests;
- public endpoint rate limits;
- secret scan;
- incident tabletop;
- backup and restore.
