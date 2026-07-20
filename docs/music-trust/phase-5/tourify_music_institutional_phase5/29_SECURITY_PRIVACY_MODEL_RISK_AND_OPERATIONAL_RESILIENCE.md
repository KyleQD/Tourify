# Security, Privacy, Model Risk, and Operational Resilience

## Threat priorities

- unreleased music and confidential catalog theft;
- data-room exfiltration;
- bidder collusion or bid leakage;
- insider trading and material nonpublic information misuse;
- account takeover and signer fraud;
- forged partner webhooks;
- financial-record tampering;
- model manipulation and poisoned revenue data;
- wallet/key compromise;
- supply-chain compromise;
- cross-tenant data access;
- business-email and wire fraud.

## Required controls

- phishing-resistant MFA for institutional and admin users;
- step-up authentication for signatures, bids, exports, and approvals;
- organization SSO/SAML where justified;
- device/session risk controls;
- scoped secrets and managed key systems;
- encryption and restricted storage;
- append-only audit events;
- DLP and export monitoring;
- segregation of duties;
- code review and protected deployments;
- dependency pinning and secret scanning;
- penetration tests and partner security review;
- incident tabletop and recovery tests.

## MNPI and clean teams

Support restricted lists, wall-crossing records, access groups, clean-team rooms, communication logging, and revocation. Tourify must not use confidential transaction data in public feeds, recommendation systems, or model training.

## Resilience

Define RTO/RPO, provider failover, reconciliation after outages, signed backups, restore tests, chain/provider degradation behavior, and manual operating procedures.

## Model risk

Protect valuation, risk, matching, fraud, and benchmark models from unauthorized changes. Record versions, approvals, data lineage, drift, overrides, and independent validation.
