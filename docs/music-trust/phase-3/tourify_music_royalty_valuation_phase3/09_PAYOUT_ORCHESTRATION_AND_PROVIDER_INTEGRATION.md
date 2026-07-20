# Payout Orchestration and Provider Integration

## Payout workflow

1. close an allocation period;
2. calculate payable balance after holds, reserves, minimum threshold, and prior adjustments;
3. create an immutable payout instruction batch;
4. approve the batch under maker-checker controls;
5. send provider transfer or payout request idempotently;
6. ingest signed webhook events;
7. reconcile paid, failed, returned, canceled, or reversed events;
8. notify recipients;
9. issue statements and tax records according to policy.

## Provider abstraction

Create `PayoutProvider` interfaces for onboarding status, recipient capability, transfer creation, transfer reversal, payout event parsing, and reconciliation. Do not hard-code the accounting ledger to Stripe object semantics.

## Webhook rules

- verify provider signature against raw request body;
- deduplicate provider event IDs;
- store the original event and hash;
- process asynchronously;
- use an event state machine;
- do not mark a payout paid on client redirects;
- reconcile webhook and provider API status;
- alert on out-of-order or impossible transitions.

## Funds handling decision

Counsel and accounting must decide whether Tourify is payor, marketplace platform, agent, or software provider for each revenue flow. Charge type, fee responsibility, refunds, reserves, tax forms, and money-transmission analysis depend on that decision.

## Current authoritative references

- DDEX Digital Sales Reporting Message Suite: https://kb.ddex.net/implementing-each-standard/digital-sales-reporting-message-suite-%28dsr%29/
- DDEX DSR Part 6 Royalty Reporting Profile: https://dsr6.ddex.net/digital-sales-report-message-suite%3A-part-6-royalty-reporting-profile/1-introduction/
- DDEX DSR Part 9 Financial Reporting to Record Companies: https://dsr9.ddex.net/digital-sales-report-message-suite%3A-part-9-financial-reporting-to-record-companies-profile/1-introduction/
- The MLC: https://www.themlc.com/
- SoundExchange: https://www.soundexchange.com/
- U.S. Copyright Office music modernization audits: https://www.copyright.gov/music-modernization/audits/
- SEC 2026 crypto-asset interpretation: https://www.sec.gov/rules-regulations/2026/03/s7-2026-09
- SEC statement on tokenized securities: https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC offering pathways: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/offering-pathways
- FinCEN virtual-currency guidance: https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering
- IRS Form 1099-DA instructions: https://www.irs.gov/instructions/i1099da
- IRS Form 1099-MISC: https://www.irs.gov/forms-pubs/about-form-1099-misc
- OFAC digital-currency compliance FAQ: https://ofac.treasury.gov/faqs/560
- IVS effective January 31, 2025, including IVS 210 Intangible Assets: https://ivsc.org/standards/
- Stripe Connect onboarding and payouts: https://docs.stripe.com/connect/onboarding and https://docs.stripe.com/connect/payouts-connected-accounts
