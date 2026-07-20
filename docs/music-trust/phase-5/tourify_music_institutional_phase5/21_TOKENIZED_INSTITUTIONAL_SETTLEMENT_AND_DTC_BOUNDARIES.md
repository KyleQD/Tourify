# Tokenized Institutional Settlement and DTC Boundaries

## Principle

Tokenization changes record format and settlement mechanics; it does not change the legal character of the instrument or remove intermediary, custody, recordkeeping, transfer, or investor-protection obligations.

## Supported models

### Official on-chain record

The issuer or transfer agent integrates the approved ledger into the master securityholder file. Only the approved recordkeeper can authorize the model.

### Synchronized token representation

The official ownership record remains off-chain. A token mirrors or initiates approved instructions but cannot independently create ownership.

### Depository entitlement model

A depository or participant system records tokenized entitlements according to its approved program and participant rules.

## Controls

- allowlisted issuers, instruments, wallets, custodians, and participants;
- transfer-agent or depository approval;
- default-deny transfer restrictions;
- mint/burn/supply reconciliation;
- wallet recovery and legal-owner continuity;
- corporate action synchronization;
- chain outage and reorganization handling;
- key compromise and emergency pause;
- privacy-preserving ownership design;
- independent smart-contract audit.

## Prohibitions

No bridge, wrapped security, DeFi collateral, permissionless AMM, anonymous wallet, direct self-custody promise, or cross-chain transfer without a separate approved architecture.
