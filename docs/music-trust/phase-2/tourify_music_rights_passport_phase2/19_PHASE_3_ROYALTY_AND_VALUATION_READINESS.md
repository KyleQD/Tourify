# Phase 3 Royalty and Valuation Readiness

Phase 2 must make Phase 3 possible without implementing it.

## Required event boundaries

Phase 3 may consume:

- `music.rights.passport.issued`;
- `music.rights.passport.superseded`;
- `music.rights.claim.accepted`;
- `music.rights.agreement.signed`;
- `music.rights.dispute.opened`;
- `music.rights.passport.suspended`.

It must not infer rights by reading incomplete drafts.

## Future royalty ledger prerequisites

- exact claim scopes;
- income-participation terms;
- territory and date;
- gross/net basis;
- permitted deductions;
- recoupment position;
- payment recipient;
- tax and payout readiness;
- statement source;
- reconciliation rules;
- dispute freeze.

## Future valuation prerequisites

- verified net revenue;
- rights percentage;
- contract term;
- recoupment balance;
- ownership confidence;
- platform concentration;
- revenue history;
- disputes and restrictions;
- versioned valuation model.

Phase 2 should not calculate a “token value.”

## Future regulated participation

Keep financial offerings in a separate bounded context with securities, money-transmission, custody, tax, and market-operator counsel. A Rights Passport may be a prerequisite, not the offering itself.

## Data contracts

Publish stable, versioned read models rather than exposing internal rights tables to future services. Examples:

- `IssuedPassportSnapshotV1`;
- `RoyaltyEligibleInterestV1`;
- `CatalogRiskSnapshotV1`;
- `RightsDisputeStatusV1`.

## Freeze rules

Future payout or financing systems must freeze affected interests when:

- claim disputed;
- passport suspended;
- agreement superseded;
- authority revoked;
- legal hold received.

## No premature coupling

Do not add:

- wallet address as required party identity;
- token IDs to core claim tables;
- market price to passport;
- blockchain state as the source of legal truth;
- payout logic inside the attestation contract.
