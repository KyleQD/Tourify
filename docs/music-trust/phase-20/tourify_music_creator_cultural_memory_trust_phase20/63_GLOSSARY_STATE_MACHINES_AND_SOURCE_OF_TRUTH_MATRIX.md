# Phase 20 glossary, state machines and source-of-truth matrix

## Core terms

| Term | Meaning | Does not mean |
|---|---|---|
| Cultural-memory trust | Proposed legal and governance structure for preservation stewardship | Copyright owner, global archive authority or universal representative |
| Deep-time commons | Open specifications, finding aids and shared preservation infrastructure governed for long duration | Unrestricted public domain or compulsory deposit |
| Custodian | Qualified institution holding and preserving packages under an instrument | Rights owner or licensor |
| Cultural authority | Evidenced, exact-scope authority recognized for a community or collection | Automated ethnic classification or global veto |
| Deposit | Voluntary transfer or licence for defined preservation purposes | Ownership assignment or unrestricted reuse |
| Preservation package | Payload, manifests, provenance, representation information and restrictions | Proof that the content is legally true or owned by the depositor |
| Finding aid | Minimal public or restricted discovery projection | Authorization for access or reuse |
| Repatriation | Process considering return, shared custody, correction or other remedy | Automatic adjudication of title |
| Dark archive | Preserved collection with no ordinary access | Secret unaccountable deletion or unrestricted emergency power |
| Tombstone | Durable identifier response explaining that a target is withdrawn, replaced or unavailable | Erasure of historical provenance |

## State machines

### Trust charter

`draft → public_consultation → ratification_pending → approved → effective → suspended | withdrawn | expired | superseded | terminated → archived`

### Participation and deposit

`draft → proposed → authority_review → approved → effective → restricted | suspended | withdrawn | expired | revoked | terminated → archived`

### Custodian qualification

`candidate → due_diligence → sandbox_qualified → independently_tested → approved → active → conditional | suspended | removed | expired`

### Preservation package

`draft → packaging → validation_pending → valid | invalid → custody_proposed → transferred → accepted → preservation_active → migration_due | disputed | restricted | superseded | deaccessioned`

### Access request

`draft → submitted → authority_review → privacy_review → cultural_review → approved | denied → access_active → expired | revoked → closed | appealed`

### Repatriation/remediation

`draft → submitted → provenance_review → authority_review → consultation → remedy_proposed → approved | denied → implementation → reconciled → closed | appealed`

## Source-of-truth matrix

| Domain | Authoritative source | Phase 20 role |
|---|---|---|
| Music catalog | `artist_music` | Reference only |
| Private audio | `artist-music` bucket and current stream/access services | Preserve approved copies; do not replace delivery path |
| Rights Passport | Current Rights Passport record and evidence | Minimal reference and preservation package |
| Licence | Effective Phase 6 licence and external official records | Reference; never issue or amend licences |
| Administration/enforcement | Phase 7 cases and official authorities | Preserve evidence and status references |
| Royalty/payment | Phase 3 ledger and payment provider | Preserve evidence; never change payee instructions |
| Trust legal status | Effective formation and governing instruments | Mirror status with source and freshness |
| Cultural authority | Current approved authority record and supporting evidence | Evaluate exact scope at execution |
| Custody | Effective custody instrument and accepted manifest | Control preservation possession and duties |
| Access/reuse | Current restriction, permission, privacy, legal-hold and community records | Enforce; do not infer from finding aids |
| Public discovery | Approved projection table/view | Publish only minimal fields and status indicators |
| External recognition/certification | Issuing organization or registry | Mirror; never self-issue |

## Historical meaning

Every record retains the policy, schema, profile, jurisdiction, authority, source manifest, effective period and audit event that applied when it was created. Later rules may create a superseding record but never silently reinterpret the old action.
