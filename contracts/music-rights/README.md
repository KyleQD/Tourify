# Tourify Passport Registry (testnet)

Minimal nonfinancial attestation registry for Phase 2 Rights Passports.

## Network

- **Primary:** Ethereum Sepolia testnet
- **Local:** Anvil/Hardhat for development
- **Mainnet:** disabled by default (`music_testnet_anchor_enabled=false`, `MUSIC_RIGHTS_ANCHOR_MAINNET` must never enable production writes without a separate ADR)

Tourify pays test transactions. Artists never connect wallets.

## What is stored on-chain

Only privacy-safe commitments:

- `passport_public_id_hash`
- `passport_version`
- `public_manifest_hash`
- `private_manifest_commitment`
- `credential_hash`
- `schema_version`
- `issuer`
- `issued_at`
- `status`
- `superseded_by_version`
- `reason_hash`

## What must never be on-chain

Audio, names, emails, private shares, agreements, evidence URLs, signatures, wallet addresses of users, or any other PII.

## Roles

OpenZeppelin AccessControl-style roles (see `TourifyPassportRegistry.sol`):

| Role | Intent |
| --- | --- |
| `REGISTRY_ADMIN_ROLE` / admin | Register/revoke issuers; **multisig** in ops |
| `ISSUER_ROLE` | Anchor / supersede commitments |
| `STATUS_OPERATOR_ROLE` | Suspend / reactivate / revoke |
| `EMERGENCY_PAUSER_ROLE` | Pause registry |

Critical administration should be a multisig. Document contract and key roles in an ADR before any mainnet consideration.

## Off-chain validity

Postgres remains the source of operational passport state. Delayed, pending, or failed anchors **do not** invalidate an issued off-chain passport.

## Deployment blockers

- Sepolia RPC URL unset (`MUSIC_RIGHTS_SEPOLIA_RPC_URL`)
- Deployer / issuer key unset (KMS/HSM preferred; never commit keys)
- Multisig admin address unset
- OpenZeppelin dependency not pinned in a Hardhat/Foundry project
- Source verification on explorer not completed

## Related app flags

- `music_testnet_anchor_enabled` (default false)
- Outbox event: `music.rights.anchor.requested`
- Worker: `npm run music:rights-anchor-worker`
