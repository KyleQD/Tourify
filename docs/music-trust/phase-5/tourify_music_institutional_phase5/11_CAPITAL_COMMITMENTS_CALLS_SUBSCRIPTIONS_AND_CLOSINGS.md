# Capital Commitments, Calls, Subscriptions, and Closings

## Commitment model

Store synchronized records for:

- investor/limited partner;
- vehicle and share class;
- committed, called, funded, distributed, recalled, and remaining amounts;
- currency and precision;
- commitment date;
- eligibility and subscription status;
- side-letter tags;
- excuse/exclusion status;
- default status;
- official fund-admin reference.

## Capital calls

Tourify may display and notify capital calls generated or approved by the designated administrator. It must not originate wiring instructions outside the approved bank/admin system.

Each call includes notice version, due date, amount, purpose, bank/portal reference, allocation basis, investor-specific amount, status, and reconciliation result.

## Subscriptions

Subscription acceptance, investor eligibility, AML/KYC, tax forms, source of funds, signatures, and funds receipt remain controlled by approved partners. Tourify stores status and references, not raw sensitive documents unless contractually required and placed in restricted storage.

## Closing

Support initial, rolling, and final closings with:

- cut-off times;
- accepted commitments;
- rejected or pending subscriptions;
- equalization/true-up inputs;
- executed-document confirmation;
- bank/admin confirmation;
- official ownership record synchronization;
- exception and refund workflow.

All updates must be idempotent and reconciled against the official administrator or transfer-agent record.
