# API, Events, and Background Jobs

## Route conventions

Follow the canonical music guide: route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, RORO helpers, and no client secrets.

Suggested namespaces:

- `/api/artist/music/royalties/imports`
- `/api/artist/music/royalties/imports/[id]`
- `/api/artist/music/royalties/matches`
- `/api/artist/music/royalties/statements`
- `/api/artist/music/payouts/onboarding`
- `/api/artist/music/payouts/status`
- `/api/artist/music/valuation`
- `/api/admin/music/royalties/*`
- `/api/partners/finance/*` only after partner authentication design.

## Domain events

- `music.royalty.import.received`
- `music.royalty.import.normalized`
- `music.royalty.match.review_required`
- `music.royalty.batch.posted`
- `music.royalty.allocation.completed`
- `music.royalty.statement.issued`
- `music.royalty.hold.created`
- `music.payout.instruction.created`
- `music.payout.paid`
- `music.valuation.completed`
- `music.valuation.superseded`
- `music.finance.readiness.changed`

## Jobs

Parsing, normalization, matching, posting, allocation, PDF generation, valuation, payout submission, webhook processing, and reconciliation run asynchronously with idempotency, leases, retries, dead-letter handling, and observability.

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
