# Tourify Music Rights Passport — Phase 2

This package continues the Phase 1 **Music Trust Ecosystem** and turns safe artist uploads into a complete, evidence-backed rights and provenance workflow.

Phase 2 must extend the existing Tourify music architecture described in `source/MUSIC_ECOSYSTEM_INTEGRATION_GUIDE.md`. It must not create a parallel catalog, player, storage, or entitlement system.

## Phase 2 outcome

An artist can:

1. Import or select an existing `artist_music` track.
2. Link the sound recording to its underlying musical work.
3. document credits, parties, identifiers, ownership, administration, licenses, and income participation;
4. invite contributors and authorized representatives;
5. resolve conflicts and sign versioned agreements;
6. submit evidence for Human-Origin certification;
7. issue a versioned Tourify Rights Passport and public verification credential;
8. generate C2PA-enabled protected derivatives;
9. reserve AI-training rights and add traceability controls;
10. optionally anchor privacy-safe commitments to a testnet attestation registry;
11. suspend, dispute, amend, supersede, or revoke records without erasing history.

## Phase 2 launch boundary

Phase 2 includes rights documentation, certification, provenance, protection, operations, and attestation.

It does **not** include:

- royalty-bearing tokens;
- catalog investment products;
- automated royalty distributions;
- catalog valuation;
- custodial wallets;
- secondary trading;
- securities offerings;
- production deployment of adversarial “unlearnable audio” perturbations;
- any statement that Tourify legally adjudicates copyright ownership.

## Canonical implementation order

1. `00_PHASE_2_SCOPE_AND_DEPENDENCIES.md`
2. `01_PRODUCT_MODEL_AND_ARTIST_JOURNEYS.md`
3. `02_RIGHTS_DOMAIN_AND_TERMINOLOGY.md`
4. `03_EXISTING_CATALOG_IMPORT_AND_MATCHING.md`
5. `04_PARTIES_IDENTITIES_AND_AUTHORITY.md`
6. `05_CREDITS_CLAIMS_SPLITS_AND_VALIDATION.md`
7. `06_AGREEMENTS_E_SIGNATURES_AND_VERSIONING.md`
8. `07_HUMAN_ORIGIN_CERTIFICATION_STANDARD.md`
9. `08_EVIDENCE_REVIEW_AND_DECISIONING.md`
10. `09_PASSPORT_MANIFESTS_AND_CREDENTIALS.md`
11. `10_C2PA_PROVENANCE_AND_DERIVATIVES.md`
12. `11_TOURIFY_SHIELD_AND_TRAINING_RESERVATION.md`
13. `12_BLOCKCHAIN_ATTESTATION_REGISTRY.md`
14. `13_DATABASE_MIGRATIONS_RLS_AND_STORAGE.md`
15. `14_API_EVENTS_AND_BACKGROUND_JOBS.md`
16. `15_UI_UX_AND_EXISTING_SURFACE_INTEGRATION.md`
17. `16_RIGHTS_OPERATIONS_DISPUTES_AND_APPEALS.md`
18. `17_SECURITY_PRIVACY_KEYS_AND_RETENTION.md`
19. `18_TESTING_PILOT_AND_ROLLOUT.md`
20. `19_PHASE_3_ROYALTY_AND_VALUATION_READINESS.md`
21. `20_NON_DESTRUCTIVE_INTEGRATION_CHECKLIST.md`
22. `21_DEFINITION_OF_DONE.md`
23. `22_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`
24. `23_CURRENT_STANDARDS_AND_LEGAL_RESEARCH.md`

## Codex control files

- `CURRENT_STATE_AUDIT_TEMPLATE.md`
- `phase-2-execution-plan.schema.json`
- `phase-2-execution-plan.template.json`

Codex must create a repository-specific `phase-2-execution-plan.json` after auditing the current implementation. No production migration should be created from the reference templates until the actual schema, ID types, RLS policies, capabilities, job infrastructure, and generated types have been inspected.


## Primary references

- DDEX standards and current specifications: https://kb.ddex.net/reference-material/standards-specifications/
- DDEX standards overview: https://ddex.net/standards/
- C2PA Technical Specification 2.4: https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model/
- W3C Bitstring Status List 1.0: https://www.w3.org/TR/vc-bitstring-status-list/
- U.S. Copyright Office AI initiative and reports: https://www.copyright.gov/ai/
- 17 U.S.C. § 204, signed writing for copyright transfers: https://www.law.cornell.edu/uscode/text/17/204
- 15 U.S.C. § 7001, electronic records and signatures: https://www.law.cornell.edu/uscode/text/15/7001
- IFPI ISRC guidance: https://isrc.ifpi.org/
- ISWC official service: https://www.iswc.org/iswc
- OpenZeppelin Contracts access control: https://docs.openzeppelin.com/contracts/5.x/access-control
