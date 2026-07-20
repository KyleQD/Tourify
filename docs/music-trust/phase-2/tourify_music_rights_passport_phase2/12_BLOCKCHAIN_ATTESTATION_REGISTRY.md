# Blockchain Attestation Registry

## Purpose

Anchor privacy-safe commitments for issued passport versions. The registry is not an NFT, ownership token, royalty contract, or copyright office.

## Launch mode

- local development and testnet first;
- mainnet disabled by default;
- no user wallet requirement;
- Tourify pays test transactions;
- off-chain passport remains valid if anchoring is delayed.

## Contract data

Store only:

```text
passport_public_id_hash
passport_version
public_manifest_hash
private_manifest_commitment
credential_hash
schema_version
issuer
issued_at
status
superseded_by_version
reason_hash
```

Do not store audio, names, private shares, contracts, PII, evidence URLs, or signatures.

## Contract functions

- `anchorPassport`
- `supersedePassport`
- `suspendPassport`
- `reactivatePassport`
- `revokePassport`
- `registerIssuer`
- `revokeIssuer`
- `getPassportStatus`
- `getLatestVersion`

## Access control

Use audited, pinned OpenZeppelin libraries after verifying the current compatible version.

Roles:

- registry administrator;
- issuer;
- status operator;
- emergency pauser.

Critical administration should be a multisig. Contract and key roles must be documented in an ADR.

## Immutability strategy

Prefer a small immutable V1 registry and new contract versions for material changes. Keep a registry directory mapping supported versions. Avoid proxy complexity unless a specific requirement justifies it.

## Outbox

1. Passport commits in Postgres.
2. `passport.anchor.requested` outbox event is created transactionally.
3. Worker submits idempotently.
4. Transaction is monitored.
5. confirmations are stored;
6. reorg or replacement is handled;
7. UI displays pending/confirmed/failed;
8. retries never duplicate the logical anchor.

## Chain selection ADR

Compare:

- EVM compatibility;
- cost;
- finality;
- uptime;
- explorer/indexer quality;
- multisig support;
- source verification;
- ecosystem longevity;
- privacy;
- migration;
- vendor and legal risk.

The database must support more than one anchor per version.


## Primary references

- DDEX standards and current specifications: https://kb.ddex.net/reference-material/standards-specifications/
- DDEX standards overview: https://ddex.net/standards/
- C2PA Technical Specification 2.4: https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model/
- W3C Bitstring Status List 1.0: https://www.w3.org/TR/vc-bitstring-status-list/
- U.S. Copyright Office AI initiative and reports: https://www.copyright.gov/ai/
- 17 U.S.C. § 204, signed writing for copyright transfers: https://www.law.cornell.edu/uscode/text/17/204
- 15 U.S.C. § 7001, electronic records and signatures: https://www.law.cornell.edu/uscode/text/15/7001
- IFPI ISRC guidance: https://isrc.ifpi.org/
- ISWC official service: https://www.iswc.org/iswc
- OpenZeppelin Contracts access control: https://docs.openzeppelin.com/contracts/5.x/access-control
