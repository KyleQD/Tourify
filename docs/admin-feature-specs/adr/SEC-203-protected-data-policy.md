# SEC-203 — Field-level protected-data policy

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`  
**Depends on:** SEC-003 capability matrix, FIN-102 / VEND-103 / WORK-102 projections

## Decision

### Protected data classes

| Class | Examples | Minimum read capability | Default ops audience |
|---|---|---|---|
| `traveler_contact` | passenger email, phone, member_email | `logistics.manage` | Tour/production logistics |
| `traveler_identity` | passport, government_id, date_of_birth, nationality | `logistics.sensitive` | Owner/admin/tour_manager (not viewer) |
| `accessibility_dietary` | dietary_restrictions, accessibility_needs, catering dietary detail | `logistics.manage` **or** `workforce.manage` **or** `advance.manage` | Ops + advancing |
| `financial_details` | payment refs, bank last4, rates | FIN-102 (`finance.manage` / pay / approve) | Finance |
| `contract_terms` | full terms, commercial clauses | `contract.manage` | Contract managers |
| `contract_signature` | signature blobs, signed PDFs | `contract.sign` **or** `contract.manage` | Signatories |
| `credentials` | ticket credential tokens, scan secrets | `ticketing.manage` (scan sees presence only via `ticketing.scan`) | Ticketing |
| `incidents` | incident narrative, PII in reports | `event.live_ops` **or** `audit.view` | Live ops / audit |
| `vendor_sensitive` | tax/payment/contacts | VEND-103 (`vendor.sensitive`) | Finance + admins |
| `workforce_sensitive` | emergency/dietary/SSN | WORK-102 classes | Workforce/hiring/finance |

Operational fields (names, roles, status, schedule windows) remain visible with domain `.view` capabilities.

### Capability addition

- `logistics.sensitive` — traveler identity documents and government IDs. Granted to **owner**, **admin**, and **tour_manager** defaults. **Not** granted to viewer/production/ticketing by default.

### Enforcement

1. Platform registry: `lib/admin/protected-data-policy.ts` (class → capability gates + domain projectors).
2. Domain projectors remain authoritative for their tables; new travel/lodging/catering reads use traveler + accessibility helpers.
3. UI never expands access; redacted fields may set `__redacted` / `field__redacted` markers.
4. Writes of identity/sensitive fields require the same elevated capability as reads.

### Retention (policy constants)

| Class | Retention note |
|---|---|
| Traveler identity | Purge/soft-clear 90 days after tour archive unless legal hold |
| Accessibility/dietary | Keep while tour active + 1 year; legal hold blocks purge |
| Financial / contract | Align FIN-001 / CONT retention (typically 7 years) |
| Credentials | Revoke on transfer/void; token material not logged |
| Incidents | Align audit retention (ADR-009); narratives may contain PII |

## Consequences

SEC-204 delegated access must only grant named classes explicitly. Calendar (CAL-102) and vendor/workforce projectors stay in place and are registered under this policy.
