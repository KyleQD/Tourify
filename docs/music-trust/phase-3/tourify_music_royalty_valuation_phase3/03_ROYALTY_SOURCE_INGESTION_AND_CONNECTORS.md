# Royalty Source Ingestion and Connector Strategy

## Supported source classes

- distributor and label master statements;
- DSP direct-license or sales/usage statements;
- The MLC mechanical statements;
- SoundExchange statements;
- PRO/CMO performance statements;
- publishing administrator statements;
- sync and direct-license invoices;
- neighboring-rights statements;
- Bandcamp or direct-sale exports;
- Tourify music sales, licenses, tickets, fan subscriptions, and other attributable first-party revenue.

## Import modes

1. Manual CSV/TSV/XLSX upload.
2. DDEX DSR flat-file import.
3. Provider-authorized API connector.
4. Secure SFTP/object delivery for enterprise partners.
5. Internal event ingestion for Tourify-originated revenue.

## Required ingestion controls

- private quarantine bucket;
- content-type and extension allowlists;
- source-file SHA-256;
- malware and decompression safety checks;
- provider, account, currency, timezone, period, and statement-version metadata;
- idempotency key based on provider + account + statement ID + source hash;
- duplicate batch detection;
- parser versioning;
- raw source preservation;
- user authorization and connector revocation;
- explicit data-retention policy;
- parse warnings and rejection reasons.

## Connector principle

Do not scrape provider dashboards. Prefer documented APIs, exports, SFTP, or artist-uploaded files. Store OAuth tokens in server-side secret storage, encrypt refresh tokens, request minimum scopes, and record every synchronization.

## First production formats

Launch with two to four common statement formats selected after the repository and pilot audit. Build a canonical adapter interface so provider-specific parsers emit the same `NormalizedRoyaltyLineDraft` shape. DDEX DSR support should be a first-class adapter, not the only input format.

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
