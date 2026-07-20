# Tokenized Instrument and Smart-Contract Lifecycle

Tokenization is optional. The marketplace must function with ordinary book-entry positions. When a token is used, it represents or mirrors a legally executed instrument; it does not create rights by itself.

## Contract responsibilities

A narrowly scoped contract may support:

- instrument and disclosure-version references;
- permissioned mint, burn, freeze, pause, and forced transfer;
- wallet eligibility checks;
- transfer-agent or issuer-authorized role controls;
- holding-period and jurisdiction restrictions;
- corporate-action snapshots;
- immutable event commitments.

Do not encode mutable economic logic that conflicts with the legal agreement or official ledger.

## Lifecycle

`configured → audited → deployed → registered_with_partner → issuance_enabled → active → paused → matured_or_redeemed → archived`

Every deployment must record bytecode hash, compiler settings, chain ID, contract address, implementation version, administrator roles, multisig policy, audit report, incident controls, and legal-instrument mapping.

## Transfer validation

Transfers should require both smart-contract checks and off-chain partner/transfer-agent authorization where applicable. A successful blockchain transaction is not enough if the official ownership record does not recognize it.

## Upgrade and recovery

Prefer minimal immutable contracts or tightly governed upgrades. Define pause, key compromise, chain outage, fork, reissuance, wallet loss, forced transfer, and migration procedures before issuance. Critical actions require multisig and dual control.
