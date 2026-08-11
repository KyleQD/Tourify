# CONT-101 — Contract lifecycle / provider ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`  
**Related:** ADR-008, ADR-009

## Decision

### Canonical scope and types

Canonical Admin contracts are organization-owned records for `vendor`, `artist`, `venue`, `sponsorship`, `employment`, `nda`, `service`, and explicitly classified `other` agreements. They may reference an engagement, tour, event, vendor, procurement record, PO, invoice, or settlement, but parent references never select or override the acting organization. Legacy `artist_contracts`, offer/signature JSON, and hiring helpers are compatibility adapters, not the canonical Admin write model.

### Templates, versions, and lifecycle

- A template header owns identity/type; immutable template versions move `draft → under_review → approved → active → archived`. Activating one approved version archives the prior active version without changing it.
- A contract pins the exact template version, structured input values, rendered artifact, projection/access policy, and checksum. Any negotiated content change creates another immutable negotiation/document version and invalidates approvals/signatures bound to the older checksum.
- Canonical contract states are `draft → internal_review → counterparty_review → approved → signature_pending → executed → active`, with terminal/history branches `amended`, `expired`, `terminated`, and `archived`. Commands enforce allowed transitions, expected version, organization ownership, capability, reason where required, idempotency, and audit.
- `executed` means the selected approved version has every required signatory completed in the configured order (or verified manual/wet-ink evidence), an immutable organization-scoped executed artifact is stored, its checksum is verified, and `executed_at` plus evidence IDs are committed atomically. A provider `completed` status alone is insufficient. `active` additionally requires the effective-date and activation policy.

### Approval and signatures

- Organization policy selects required `legal`, `finance`, `business`, and delegated approval roles by type/value/risk. Approvals bind to a document version/checksum. Changes requested block approval; content/signatory/value changes invalidate prior approval. Configured separation of duties prevents the drafter or counterparty from satisfying their own required approval, with only an explicit reasoned/audited emergency policy override.
- Signature modes are `manual_upload`, `e_signature`, and `wet_ink`. Provider is a separate configured value: `internal`, `docusign`, `dropboxsign`, or `pandadoc`. Unconfigured/disabled external providers fail closed as unavailable and never silently produce an internal signing URL or claim `sent`.
- The adapter contract covers create/send/void/status/artifact retrieval, provider/envelope/signatory IDs, provider request IDs, retryability, and observable failures. Secrets remain server-side. Webhooks require signature verification, organization/envelope ownership, event idempotency, replay/out-of-order handling, raw payload hash/evidence retention, and quarantine for unmatched events. Manual and provider flows converge on the same executed-artifact/checksum rules.

### Amendments, termination, renewal, and obligations

- Amendment, termination, and renewal create a linked successor/change record and preserve the original executed agreement. Each records authority, reason, notice/effective dates, structured before/after, downstream PO/invoice/settlement/publication impacts, and whether reapproval/re-signature is required. No command overwrites an executed artifact.
- Obligations are pinned to the executed contract version and typed as `deliverable`, `payment`, `notice`, `insurance`, `option`, `renewal`, or `milestone`. Each has an owning party/user, due/local-time context, state (`pending`, `in_progress`, `complete`, `overdue`, `waived`, `disputed`, `cancelled`), evidence references, reminder/escalation policy, and audited waiver/dispute/correction. Overdue and unavailable evidence surfaces in command-center health without becoming zero.

### Retention and boundaries

- Executed/amended/terminated/expired contracts, artifacts, signatures, envelopes/events, approvals, obligations/evidence, provider evidence, finance links, and audit history follow ADR-009 legal hold and a minimum seven-year operational retention policy unless a longer organization/jurisdiction policy applies. Draft purge is allowed only through the previewed, authorized, audited retention job when no hold/reference exists.
- Hard delete is never available for executed/history evidence. Archive changes discoverability, not retention or authorization history.
- PO/invoice/settlement links are explicit (`CONT-508`); contract workspace production writes wait on tenant/RLS/command gates and finance RLS. Provider integration does not transfer Tourify's authority over version selection, approval, execution, access, or retention.

## Consequences

`CONT-501`–`CONT-508` implement templates, persistence, workspace, approvals, negotiation, adapters, amendments, obligations, and finance links. `CONT-601/602` own operational/security review. The current pure domain helpers and hiring provider helper remain backend contracts/compatibility code until those persistence, API, UI, RLS, webhook, and acceptance-test tasks are complete.
