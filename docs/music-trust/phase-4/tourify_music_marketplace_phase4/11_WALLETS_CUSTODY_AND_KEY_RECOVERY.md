# Wallets, Custody, and Key Recovery

Wallet design is a legal, custody, security, and user-support decision—not just an authentication feature.

## Supported models

Evaluate separately:

- partner-custodied omnibus or fully disclosed accounts;
- partner-custodied individual wallets;
- embedded managed wallets with recovery;
- external self-custody wallets approved and whitelisted;
- no-wallet book-entry positions.

The pilot should default to the partner's supported custody model and avoid Tourify custody.

## Wallet linking

Require authenticated partner ownership proof, challenge signing where relevant, chain and contract validation, sanctions/blockchain-risk screening by the responsible partner, cooling-off for address changes, and notifications to all trusted channels.

## Recovery and loss

Document whether legal ownership can be restored when a key is lost, who can freeze or force transfer, what evidence is required, and how the official holder record controls recovery. Never market a security as irretrievably lost when the legal record permits reissuance.

## Security controls

No private keys or seed phrases in Tourify. Use managed HSM/KMS for platform signing, environment separation, withdrawal/transfer allowlists, rate limits, anomaly detection, device reauthentication, and emergency disable switches.
