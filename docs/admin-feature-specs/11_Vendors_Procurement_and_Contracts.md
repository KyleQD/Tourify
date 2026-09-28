# Vendors, sourcing, procurement, contracts, obligations, and invoices

## Outcome

Build one connected commercial lifecycle from organization vendor master and tour/event requirement through sourcing/quotes, compliance, engagement, contract, purchase order, delivery, invoice/payment-status handoff, obligations, and performance. The existing Admin contracts shell must become an operational workspace rather than an isolated placeholder.

## Current baseline and gaps

- Tour vendors/jobs/team panels and APIs are real but use legacy authorization patterns.
- Vendor master, requests, bids, insurance/compliance, contracts, POs, invoices, payment state, and performance are not one lifecycle.
- Admin contracts is explicitly incomplete; unrelated hiring/artist contract helpers do not provide tour operations contract management.
- Budget/finance and vendor records are weakly connected and some UIs use raw IDs.
- Missing template/version, counterparty/contacts, internal approval, signature provider boundary, obligation/milestone tracking, renewal/termination, document access, and closeout.

## Domain model

### Vendor and engagement

- `vendors`: organization-scoped legal/display name, type/categories, contacts, tax/payment external references, status, risk/compliance summary; sensitive details separated.
- `vendor_documents`: insurance, permits, certifications, tax forms, policy type, issue/expiry, verification, restricted file.
- `vendor_engagements`: vendor + tour/event/stop/domain, requirement/scope, owner, status, budget/category, dates, selected quote, contract/PO/invoice references.
- `sourcing_requests`/RFPs, invited vendors, questions, due dates, requirements, attachments.
- `vendor_quotes`: versioned lines, currency/tax, assumptions/exclusions, validity, attachments, compare/decision history.

### Contract

- `contract_templates` and template versions/clauses owned by organization.
- `contracts`: organization, engagement, type, parties/counterparties, owner, state, effective/expiry/termination, governing metadata, value/currency, access class.
- `contract_versions`: source/template, rendered file/checksum, structured fields, author, change summary.
- `contract_approvals`, `signatories`, `signature_envelopes/events`.
- `contract_obligations`: deliverable/payment/notice/insurance/option/renewal/milestone, responsible party, due date, status, evidence, escalation.
- Documents are immutable versions in scanned, org-scoped storage. Legal interpretation remains human responsibility.

## Lifecycle

Vendor: prospective → invited → evaluating → approved/preferred/restricted/inactive.  
Engagement: requested → sourcing → selected → contracting → ordered → active/delivered → invoiced → closed/cancelled.  
Contract: draft → internal review → counterparty review → approved → signature pending → executed → active → amended/expired/terminated/archived.

State transitions are commands with capability, prerequisites, reason, version, audit, and side effects. Email/uploaded signed-document flows and provider e-sign integrations use the same canonical contract state.

## Detailed task plan

### Phase 1–2 — access and canonical relationship

| ID | Task | Acceptance criteria |
|---|---|---|
| VEND-101 | Migrate vendor/team/job routes to canonical tour access | Authorized organization/tour collaborators get consistent results; all mutations verify vendor/engagement/tour/event org and capability. |
| VEND-102 | Define vendor identity/deduplication | Legal/display name, locations, contacts, category, external accounting ID, duplicate detection, merge and retained alias/history rules are approved. |
| VEND-103 | Add protected vendor-data policy | Tax/payment/compliance documents and personal contacts have explicit fields/capabilities/retention; operational users receive least data. |
| CONT-101 | Approve contract lifecycle/provider ADR | Contract types/states, template/version, approval, signature modes, executed definition, amendment, obligation, retention and provider boundary are decided. |

### Phase 5 — vendor master and sourcing

| ID | Task | Acceptance criteria |
|---|---|---|
| VEND-501 | Build vendor master | Scoped search/create/edit/category/contact/status/risk/compliance and merge workflow work without raw IDs; audit and field access apply. |
| VEND-502 | Build compliance document workflow | Requirement by category/jurisdiction, secure upload/scan, verification, issue/expiry, reminder/escalation, waiver reason/approver, and access log are complete. |
| VEND-503 | Build requirement/engagement workflow | Tour/event/stop/domain scope, deliverables, dates, quantities, budget, owner, sourcing method, status and downstream links are required as configured. |
| VEND-504 | Build RFP/invitation flow | Versioned requirement package, selected vendors, question period, due date/time zone, secure vendor response and delivery audit are implemented. |
| VEND-505 | Build quote submission/versioning | Structured lines/currency/tax/fees/assumptions/exclusions/validity/files; vendor revisions retain history and cannot see competitors. |
| VEND-506 | Build quote comparison/decision | Normalize totals/currency and non-price criteria; reviewer scores/comments/conflicts, approval, decision reason, and notification are audited. |
| VEND-507 | Create vendor performance closeout | Timeliness, quality, variance, incidents, compliance, reviewer/evidence, response, and approved aggregate feed future sourcing without exposing sensitive notes. |

### Phase 5 — contracts and obligations

| ID | Task | Acceptance criteria |
|---|---|---|
| CONT-501 | Build versioned template library | Template/clauses, types, variables, owner, approval, effective state and immutable versions are permissioned and tested. |
| CONT-502 | Build contract draft workspace | Engagement/parties/template/structured terms/value/dates/files are validated; generated document references exact template/input/version/checksum. |
| CONT-503 | Add internal review/approval | Required reviewers by type/value/risk, comments/change requests, legal/finance/business approvals, delegation and separation are audited. |
| CONT-504 | Add counterparty negotiation versions | Upload/send/receive revisions, compare text/structured fields, comment/decision, and selected final version without overwriting history. |
| CONT-505 | Build signature adapter | Manual-upload and provider modes verify signatories/sequence, provider signatures/webhooks/replay, executed file/checksum, timestamps, failure/retry, and access. |
| CONT-506 | Add amendment/termination/renewal | New version/linked agreement preserves executed original; authority, reason, notice date, obligations, and downstream budget/PO/publication impact are shown. |
| CONT-507 | Build obligation tracker | Extract/enter deliverable/payment/notice/insurance/option/renewal milestones with owner/due/status/evidence/reminder/escalation and event/tour visibility. |
| CONT-508 | Connect contract to PO/invoice/settlement | Contract value/terms/obligations link finance records; mismatch/stale version is visible; finance posting remains in finance service. |

### Phase 6 — assurance and release

| ID | Task | Acceptance criteria |
|---|---|---|
| VEND-601 | Vendor/contract observability | Alerts cover expiring compliance/contracts, unanswered RFP, expired quotes, stalled approvals/signatures, overdue obligations, delivery/invoice variance, and provider failure. |
| CONT-601 | Document security review | Tests cover cross-org file IDs, signed URL expiry, malware/type spoof, token/provider webhook, redaction/projection, deleted member, and retention/legal hold. |
| CONT-602 | Migration and contract-shell cutover | Existing vendor/contract-like records map or remain explicitly legacy; Admin contracts route uses canonical workspace; no placeholder or orphan write remains. |

## UX requirements

- Commercial IDs are human-friendly references; internal UUIDs never require manual input.
- Status, owner, next action, due date, value/currency, required approval/compliance, and source version are visible.
- Quote comparison separates comparable totals from assumptions/exclusions and discloses FX freshness.
- Contract previews show version/checksum/state and clearly distinguish draft, partially signed, and executed.
- Legal/compliance language avoids claiming automated legal validation; exceptions and approvals remain explicit.

## Test requirements

- Vendor merge, category/compliance expiry, RFP visibility, quote version/compare/FX, engagement state, contract version/approval/signature webhook/obligation/amendment tests.
- Org/field/file/external-vendor/signatory authorization and token tests.
- E2E: requirement → RFP → quote/selection → contract approval/signature → PO/delivery/invoice → obligation/performance closeout.

## Deployment readiness

- Vendor, engagement, contract, PO, invoice, budget, and event/tour references form one traceable graph.
- Executed contracts/files are immutable, checksummed, access-controlled, retained, and amendable only through new records.
- Compliance and obligations have accountable owners, reminders, evidence, escalation, and audit.
- External vendors/signatories cannot enumerate organization data or other bids/contracts.
- Provider/manual signature and finance handoffs are idempotent, reconciled, and observable.
