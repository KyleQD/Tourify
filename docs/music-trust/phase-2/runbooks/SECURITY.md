# Rights Passport — Security Runbook

## Scope

Signing-key, blockchain-key, reviewer-account, and evidence-leakage incidents for Phase 2 protection/attestation.

## Key hierarchy (never in client bundles)

- C2PA signing key
- VC issuer key
- Blockchain transaction key (Sepolia testnet only by default)
- Contract admin multisig
- Webhook secrets

## Incidents

### Signing-key compromise

1. Pause C2PA and credential issuance (`music_c2pa_derivatives_enabled=false` if needed).
2. Revoke issuer on registry (testnet) and update status list.
3. Rotate KMS/HSM material; reissue only after ADR.
4. Do not rewrite archival masters.

### Blockchain-key compromise

1. Pause anchor worker; disable `music_testnet_anchor_enabled`.
2. Transfer/revoke ISSUER_ROLE via multisig; pause contract if required.
3. Off-chain passports remain valid; mark anchors `failed`/`replaced` as needed.
4. Never enable mainnet without separate approval.

### Compromised reviewer account

1. Disable session and RBAC grants immediately.
2. Audit recent `music_rights_review_decisions` and dispute actions.
3. Re-review any suspend/revoke decisions by that actor.

### Leaked unreleased master

1. Revoke promotional delivery links; freeze derivatives.
2. Preserve forensic watermark IDs if present (opaque payloads only).
3. Hand off to LEGAL/DMCA without public accusation automation.

## Hard rules

- No PII on-chain
- No user wallets
- No adversarial/unlearnable audio in production
- Clean master remains immutable/private
