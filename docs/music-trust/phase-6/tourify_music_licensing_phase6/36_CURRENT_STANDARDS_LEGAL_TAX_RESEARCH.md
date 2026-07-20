# Phase 6 Current Standards, Legal, Tax, and Industry Research

**Research date:** 2026-07-17  
**Purpose:** implementation baseline only; not legal or tax advice. Codex must re-check current official sources before production decisions.

## Copyright and licence boundaries

- U.S. copyright owners hold separate reproduction, derivative, distribution, public-performance and authorization rights; sound recordings have a limited digital-audio performance right. Source: https://www.copyright.gov/what-is-copyright/
- Musical compositions and sound recordings are separate works and commonly have separate owners/licensors. Source: https://www.copyright.gov/engage/musicians/
- Section 115 covers making and distributing phonorecords, including defined digital phonorecord deliveries; it expressly excludes sounds accompanying audiovisual works from a digital phonorecord delivery. Source: https://www.copyright.gov/title17/92chap1.html
- The Copyright Office continued the designation of The MLC and DLC on June 3, 2026. The MLC administers the U.S. blanket statutory mechanical licence for covered digital uses, not a general sync/master clearance system. Source: https://www.copyright.gov/newsnet/2026/1087.html
- Sections 112 and 114 provide statutory pathways for eligible digital audio transmissions and ephemeral recordings; those pathways do not create a general on-demand, audiovisual or master-use licence. Source: https://www.copyright.gov/licensing/sec_112.html
- WIPO describes sync as permission to synchronize music with images and emphasizes separate music/recording, territory, window, scene and cue-sheet considerations. Sources: https://www.wipo.int/en/web/music/ and https://www.wipo.int/web-publications/rights-clearance-a-guide-for-independent-filmmakers/en/3-rights-assessed-during-clearance.html

## DDEX

- DDEX currently lists ten standards families. Relevant Phase 6 families include ERN, MWDR (MWN/MWL/LoD), BWARM, RDR, RIN, DSR, Catalogue Transfers and Anomaly Reporting. Source: https://kb.ddex.net/about-ddex-standards/ddex-standards/
- Current published specifications listed by DDEX include ERN 4.3.2, MWN 1.3.1, MWL 1.0.1, BWARM 2.1, RDR-N 1.5, RDR-R 1.1, RDR-RCC 1.0, RIN 2.1 and DSR profiles for UGC, audiovisual and royalty reporting. Source: https://kb.ddex.net/reference-material/standards-specifications/
- MWL enables U.S. record companies or DSPs to request mechanical licences from rights societies/publishers and receive grants or rejections. Source: https://kb.ddex.net/implementing-each-standard/musical-work-data-and-rights-communication-%28mwdr%29/us-musical-work-licensing-choreography-standard-%28mwl%29/
- RDR supports cross-territory recording, performer, mandate, revenue and conflict exchanges. Source: https://kb.ddex.net/implementing-each-standard/recording-data-and-rights-standards-%28rdr%29/
- Production implementation requires a free DDEX Implementation Licence and typically a DDEX Party Identifier. Source: https://kb.ddex.net/general-implementation-guidance/licensing-the-standards/

## CISAC and audiovisual reporting

- CISAC formats include CWR for work registration, CAF for rights-flow/mandates and CRD for royalty distributions. Source: https://www.cisac.org/formats
- CISAC’s Global Cue Sheet Standard 2.0 includes recording metadata. Source: https://www.cisac.org/Newsroom/news-releases/cisac-publishers-and-recording-industry-come-together-upgrade-harmonised
- On June 18, 2026, CISAC announced AVR+, an implementation-ready machine-readable format based on Global Cue Sheet Standard 2.0. Source: https://www.cisac.org/Newsroom/news-releases/cisac-launches-first-global-format-modernise-audiovisual-music-data-and
- CIS-Net is a restricted network used by member societies and authorized rightsholders; Tourify should use authorized access/partnerships rather than scraping. Source: https://www.cisac.org/services/information-services/cis-net

## Collective and multi-territory administration

- WIPO describes CMOs as entities that monitor use, negotiate licences, collect fees and distribute remuneration where individual licensing is impractical. Source: https://www.wipo.int/en/web/copyright/collective-management
- The EU collective-rights framework includes requirements for electronic processing, repertoire identification, monitoring, invoicing, collection and distribution for multi-territorial online music licences. Source: https://www.wipo.int/wipolex/en/text/474323

## AI training reservations

- The U.S. Copyright Office’s Part 3 AI training report remains labeled pre-publication as of the research date; the Office says a final version will follow without substantive changes expected. Source: https://www.copyright.gov/ai/
- EU Directive 2019/790 Article 4 conditions the general TDM exception on rights not having been expressly reserved, including machine-readable means for online content. Source: https://eur-lex.europa.eu/eli/dir/2019/790/oj
- The EU AI Act requires general-purpose AI providers to maintain a policy to comply with Union copyright law, including rights reservations, and to publish a sufficiently detailed training-content summary. Source: https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX:32024R1689
- TDMRep expresses machine-readable TDM reservations but is a W3C Community Group final specification, not a W3C Standard. Source: https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/

## U.S. cross-border withholding

- IRS Publication 515 (2026) covers withholding on payments to nonresident aliens and foreign entities, including documentation and treaty claims. Source: https://www.irs.gov/publications/p515
- Foreign beneficial owners commonly document status/treaty claims using applicable W-8 forms. Source: https://www.irs.gov/individuals/international-taxpayers/forms-for-foreign-beneficial-owners
- 2026 Form 1042-S instructions include motion picture/television copyright royalties and other copyright/broadcast royalties as reporting categories. Source: https://www.irs.gov/instructions/i1042s

## Implementation conclusions

1. Build a rights-and-authority router, not a universal licensor.
2. Keep composition, master, neighbouring, performer/identity and auxiliary rights separate.
3. Treat search, quote, approval and payment as non-licensing states until the agreement is executed and effective.
4. Use standards at adapter boundaries; preserve a versioned internal model.
5. Make AI licensing explicit, granular, opt-in and revocable for future availability.
6. Route collective/statutory uses to approved societies/providers and retain evidence of the pathway.
7. Keep tax, payment, insurance and legal decisions with approved professionals/providers.
