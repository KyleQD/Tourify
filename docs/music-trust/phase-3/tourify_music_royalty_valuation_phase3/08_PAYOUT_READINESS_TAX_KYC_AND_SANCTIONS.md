# Payout Readiness, Tax, KYC, and Sanctions

## Non-custodial launch posture

Use a regulated payment provider such as Stripe Connect or another approved provider to collect identity, business, bank, and payout information. Tourify stores provider IDs, statuses, requirements, and audit references—not raw bank account numbers or identity documents unless strictly required.

## Payee readiness states

- not invited;
- onboarding started;
- information required;
- verification pending;
- tax information required;
- sanctions review required;
- payout enabled;
- restricted;
- disabled;
- legal hold.

## Controls

- confirm the party is authorized to receive the specific interest;
- collect W-9/W-8 or provider-equivalent tax data where applicable;
- sanctions and restricted-party screening;
- age and guardian handling;
- country and currency eligibility;
- beneficial-owner and business verification;
- payout threshold and reserve settings;
- duplicate payee prevention;
- account-change cooling period and step-up authentication;
- manual review for high-risk changes.

## Tax separation

Royalty income and digital-asset disposition reporting are different. IRS instructions currently call for Form 1099-MISC for qualifying royalty payments and Form 1099-DA for reportable digital-asset broker transactions. Tourify must obtain tax advice on its role and configure reporting by product, payer, recipient, transaction, and year rather than assuming one form covers all Phase 3 activity.

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
