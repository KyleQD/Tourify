# Glossary, State Machines and Source-of-Truth Matrix

## Purpose

Define shared terminology, durable states and authoritative systems so commons records never override creator or rights sources of truth.

## Core terms

| Term | Meaning | Does not mean |
|---|---|---|
| Commons steward | Independent entity responsible for public-purpose governance and asset stewardship | Owner of creator copyrights or universal representative |
| Operator | Approved provider running a scoped technical service | Source of legal authority merely because it is online |
| Custodian | Party holding an asset, credential or key under documented terms | Unrestricted beneficial owner |
| Public projection | Minimal purpose-approved view derived from an authoritative source | Raw source table or conclusive ownership record |
| Protocol profile | Versioned implementation agreement selecting standards and constraints | A law or automatic legal mandate |
| Conformance result | Evidence that an implementation passed published tests for a scope and version | Guarantee of security, legal compliance or rights ownership |
| Identifier | Portable reference controlled under a specified method | Copyright registration or identity proof for every purpose |
| Credential | Signed claim from an issuer | Automatic authority to license, collect or represent |
| Rights reference | Link to a versioned authoritative rights source | Universal rights registry |
| Asset escrow | Controlled custody/release arrangement for critical assets | Immediate transfer or public-domain dedication |
| Step-in | Contractual right to temporarily or permanently replace an operator | Right to rewrite creator records |

## State machines

### Stewardship program

`draft → diligence → public_review → approved → sandbox → limited_production → production → suspended → transition → retired`

Any state may move to `rejected`; high-risk states can move to `suspended`. Retirement preserves public history and export materials.

### Asset transfer

`discovered → classified → title_review → restricted | transferable → proposal → public_review → approved → escrowed → dual_control → transferred → accepted`

Compensating states: `paused`, `challenged`, `rolled_back`, `replacement_transfer`.

### Protocol change

`idea → proposal → impact_review → draft → public_comment → candidate → ratified → implemented → deprecated → retired`

Emergency branch: `emergency_patch → temporary_effect → retrospective_review → ratified | reverted`.

### Registry entry

`submitted → evidence_review → active → suspended → active | revoked | superseded | expired | disputed`.

### Operator

`applicant → diligence → sandbox → accredited → active → restricted → suspended → replaced | revoked | expired`.

### Participation

`none → invited | applied → verified → active → suspended → withdrawn | terminated`.

Withdrawal does not delete immutable audit, revocation or legal records.

## Source-of-truth matrix

| Domain | Authoritative source | Phase 12 role |
|---|---|---|
| Uploaded audio/catalog | `artist_music` and private storage | Reference only |
| Playback entitlement | `resolveMusicAccess` and existing commerce/library records | No mutation |
| Composition/master claims | Rights Passport and executed agreements | Minimal versioned reference |
| Licences | Executed Phase 6 licence records and external agreements | Status link only |
| Administration/enforcement | Phase 7 cases and official providers | Status link only |
| Royalties/payments | Phase 3 ledger and payout providers | No public projection by default |
| Federation decisions | Phase 10 governed decisions | Input, not override |
| Public-infrastructure participation | Phase 11 participant records | Versioned input |
| Commons participation | Phase 12 participation record | Authoritative only for commons services |
| Protocol version | Ratified protocol registry | Authoritative for compatibility scope |
| Registry entry | Registry source event plus current status | Authoritative only for listed registry claim |
| Credential validity | Proof verification + issuer trust + status + source record | Evidence, not mandate |
| Asset ownership | Executed legal documents and official registrations | Verified mirror and asset register |
| Operator status | Steward accreditation decision | Authoritative for service scope |

## Authorization rule

High-impact actions must resolve authority from the current domain source, not a public projection or cached credential. The commons may prove that an issuer or service is recognized, but it cannot convert recognition into rights ownership, payment authority or representation.
