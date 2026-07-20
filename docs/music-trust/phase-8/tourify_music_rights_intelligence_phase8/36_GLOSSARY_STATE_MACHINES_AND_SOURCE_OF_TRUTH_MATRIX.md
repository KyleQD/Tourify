# Glossary, State Machines and Source-of-Truth Matrix

## Glossary

- **Private insight:** A result visible only to the authorized participant and based on that participant’s own data plus approved aggregate context.
- **Benchmark release:** A versioned aggregate publication that passed privacy, competition, methodology and freshness review.
- **Pseudonymized data:** Data separated from direct identifiers but still potentially attributable using additional information.
- **Anonymous output:** An output approved after documented re-identification assessment; never inferred from pseudonymization alone.
- **Negotiation-readiness group:** A governance workspace with no external representation or bargaining authority.
- **Mandate:** A signed instrument granting a specified representative defined authority.
- **Collective licensing:** Licensing repertoire through an authorized collective entity or mandate structure.

## State machines

### Consent
`draft → presented → accepted → active → partially_withdrawn → expired | revoked`

### Dataset version
`planned → building → quality_review → privacy_review → approved → active → superseded | withdrawn`

### Benchmark release
`draft → methodology_review → privacy_review → competition_review → approved → published → corrected | revoked | superseded`

### Policy alert
`ingested → analyst_review → legal_editorial_review → published → corrected | superseded | expired`

### Negotiation group
`proposed → legal_review → readiness_only → approved_for_simulation → separately_authorized → active → suspended | dissolved`

### Proposal
`draft → topic_screen → counsel_review → open_for_deliberation → voting → adopted_nonbinding | ratified_authorized | rejected | withdrawn`

## Source-of-truth matrix

| Domain | Authoritative source | Tourify role | Prohibited behavior |
|---|---|---|---|
| Music asset | `artist_music` + private storage | Canonical reference | Parallel catalog or public master exposure |
| Rights | Phase 2 passport and executed agreements | Versioned evidence | Infer authority from badge |
| Administration/enforcement | Phase 7 mandate, official partner and case records | Reconciled mirror/workflow | Rewrite official outcomes |
| Consent | Phase 8 signed consent version | Enforcement point | Broad bundled consent |
| Raw intelligence data | Approved dataset version | Restricted computation | Participant-to-participant access |
| Benchmark | Approved release version | Publisher | Unreviewed live query as benchmark |
| Policy | Official source + reviewed Tourify version | Education | Automated legal conclusion |
| Group authority | Executed entity and mandate records | Technical facilitator | Infer from membership or vote |
