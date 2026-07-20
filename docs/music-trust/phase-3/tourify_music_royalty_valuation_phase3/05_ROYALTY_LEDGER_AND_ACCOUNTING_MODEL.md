# Royalty Ledger and Accounting Model

## Ledger design

Use an append-only, double-entry or balanced subledger. Every financial event must have debits equal credits in the same currency and accounting unit.

Recommended accounts include:

- gross royalties receivable;
- cash/provider clearing;
- artist payable;
- collaborator payable;
- platform fee revenue;
- withholding payable;
- reserve liability;
- recoupment balance;
- dispute hold liability;
- refund/chargeback reserve;
- foreign-exchange gain/loss;
- unidentified or unmatched suspense.

## Posting lifecycle

`imported → normalized → matched → reviewed → accepted → posted`

Only accepted lines post. Rejections and unresolved lines remain outside the ledger. Corrections create reversing entries and replacement entries with links to the original posting.

## Required invariants

- balanced journals;
- immutable posted entries;
- deterministic journal generation;
- one source economic event posted once;
- explicit currency on every line;
- no negative unsigned money values;
- no payout in excess of available payable balance;
- total allocated amount plus suspense/rounding equals distributable amount;
- disputes move amounts to holds, not delete earnings.

## Period close

Support soft close, review close, and locked close. Reopening a closed period requires a privileged capability, reason, audit event, and compensating adjustments.

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
