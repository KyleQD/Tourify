# Current Standards, Legal, Tax and Research Review

## Purpose

Record the current official-source baseline for cooperative structures, data governance, privacy engineering, research ethics, competition, collective management, standards and tax.

## Primary workflows

1. Verify the applicable entity statute and tax treatment with counsel and advisers.
2. Use official source dates and preserve snapshots.
3. Review changes before each launch gate.
4. Link every material change to impacted tasks and feature flags.

## Required controls

- This document is research, not a legal or tax opinion.
- Older guidelines are not treated as current law when withdrawn or superseded.
- Jurisdiction-specific advice is mandatory before cross-border launch.

## Primary records

- `phase9_policy_sources`
## Canonical source-of-truth rules

- `artist_music` remains the catalog anchor; Phase 9 stores references and approved extracts, not replacement catalog rows.
- Rights Passports, Phase 6 licences and Phase 7 administration/enforcement records remain immutable source evidence.
- Phase 8 consent, privacy and benchmark decisions are inputs, but cooperative membership and data contribution require new, separately executed records.
- External research institutions, regulators, standards bodies, CMOs, courts and government registries remain authoritative for their own decisions and filings.
- Every derived dataset, analysis, publication and benefit allocation points to an immutable input manifest and policy version.

## Stop conditions

Stop the workflow when any of the following is true:

- membership, contribution licence, consent, authority or permitted purpose is missing or expired;
- the source dataset cannot be reproduced from an approved lineage manifest;
- the cohort fails minimum-size, independence, concentration, delay or re-identification controls;
- the request would expose current or future competitive strategy, prices, bids, rates or contract positions;
- research ethics, privacy, security, export, IP, competition or jurisdiction review is incomplete;
- an output could be interpreted as legal, tax, investment or coordinated pricing advice;
- the board, member vote, independent committee or outside authority required by policy has not approved the action;
- a member withdrawal, legal hold, regulator request or incident requires processing to pause.

## Existing-system integration

- Consume approved, versioned extracts through adapters or event outboxes; never query confidential operational tables directly from public or researcher-facing routes.
- Do not modify upload, stream, entitlement, player, feed, profile, EPK, marketplace, licensing, rights-administration, royalty or mobile behavior.
- Keep Phase 9 routes under a dedicated namespace and behind feature, jurisdiction and entity-readiness flags.
- Use route handlers under `app/api/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, additive migrations and explicit RLS.
- Use restricted storage, short-lived signed URLs, access logs and output review for all cooperative and research files.

## Required tests

- membership versus ordinary Tourify-account separation;
- purpose-specific contribution and revocation behavior;
- RLS for members, directors, committee reviewers, researchers, administrators and workers;
- small-cohort, concentration, stale-source and re-identification stop conditions;
- default-deny research access and output release;
- competition-sensitive content detection and escalation;
- idempotent external submissions and compensating rollback;
- regression coverage for upload, playback, entitlement, marketplace, feed, profile, EPK, analytics and mobile.

## Completion evidence

Codex may mark this area complete only after it records:

1. audited repository paths and deployed database objects;
2. approved legal/entity/governance assumptions and named operational owners;
3. migrations, generated types, RLS tests and route tests;
4. privacy, ethics, competition, security and jurisdiction review evidence;
5. feature flags, stop conditions, monitoring and rollback instructions; and
6. task-level files changed, commands run, test results and unresolved blockers in `phase-9-execution-plan.json`.

## Official-source baseline reviewed July 2026

### Nevada cooperative forms

Nevada Revised Statutes Chapter 81 provides multiple cooperative forms. The current published chapter includes cooperative associations that may be formed by five or more persons for lawful business and issue non-stock membership certificates, plus separate nonprofit cooperative corporation provisions. This does not determine that a Nevada Chapter 81 entity is the best structure for Tourify or its creators.

Source: https://www.leg.state.nv.us/NRs/NRS-081.html

### United States cooperative taxation

IRS Form 1120-C applies to corporations operating on a cooperative basis under section 1381 and allocating amounts to patrons based on business done with or for patrons. Entity classification, patronage status and nonpatronage activity require tax-adviser analysis.

Source: https://www.irs.gov/instructions/i1120c

### Securities boundary

A cooperative label does not automatically remove securities-law risk. Membership units, transferable interests, profit expectations, tokens or investment-like marketing require separate securities analysis. An April 2025 submission to the SEC requested a safe harbor for certain nontransferable cooperative membership interests, demonstrating that no broad express safe harbor should be assumed from that submission alone.

Source: https://www.sec.gov/about/crypto-task-force/written-submission/ctf-written-input-coa-coop-blockchain-orgs-prop-rulemaking-non-fungible-memb-interests-043025

### EU Data Governance Act and data altruism

The EU Data Governance Act creates a framework for recognized data altruism organizations. Official EU materials state that recognized organizations must be not-for-profit, meet transparency requirements and implement safeguards for individuals and companies that voluntarily make data available for objectives of general interest. This model does not automatically fit compensated creator data or commercial research licensing.

Sources:
- https://digital-strategy.ec.europa.eu/en/policies/data-governance-act-explained
- https://digital-strategy.ec.europa.eu/en/policies/data-altruism-organisations

### Privacy-enhancing technologies

NIST SP 800-226 provides guidance for evaluating differential-privacy guarantees. OECD materials describe PETs such as trusted execution environments, federated learning, secure multi-party computation, differential privacy and homomorphic encryption, while cautioning that PETs have utility, efficiency and governance tradeoffs.

Sources:
- https://www.nist.gov/publications/guidelines-evaluating-differential-privacy-guarantees
- https://www.oecd.org/en/publications/emerging-privacy-enhancing-technologies_bf121be4-en.html
- https://www.oecd.org/en/publications/sharing-trustworthy-ai-models-with-privacy-enhancing-technologies_a266160b-en.html

### Research ethics

The U.S. Common Rule governs covered human-subject research conducted or supported by participating federal departments and agencies and includes requirements involving IRBs and informed consent. Not every Tourify analytics or secondary-data project is automatically covered, but Phase 9 requires a documented ethics determination rather than assuming non-applicability.

Sources:
- https://www.hhs.gov/ohrp/regulations-and-policy/regulations/common-rule/index.html
- https://www.hhs.gov/ohrp/coded-private-information-or-biospecimens-used-research.html

### Competition and collaboration

The FTC and DOJ withdrew the 2000 competitor-collaboration guidelines in December 2024. In February 2026 they opened a public inquiry on possible updated guidance, specifically identifying joint licensing, algorithmic pricing, information and data sharing and labor collaborations. Phase 9 therefore requires matter-specific competition review and does not encode the withdrawn guidelines as a safe harbor.

Source: https://www.ftc.gov/news-events/news/press-releases/2026/02/federal-trade-commission-department-justice-seek-public-comment-guidance-business-collaborations

### Collective management

WIPO describes collective management organizations as entities authorized or mandated to manage rights for multiple rightsholders, typically monitoring use, negotiating terms, licensing, collecting and distributing remuneration. WIPO's 2025 Good Practice Toolkit is a comparative, non-normative resource. Cooperative data governance does not itself create CMO authority.

Sources:
- https://www.wipo.int/en/web/copyright/collective-management
- https://www.wipo.int/publications/en/series/index.jsp?id=180

### Standards participation

Standards and community groups have their own membership, contribution, confidentiality and intellectual-property rules. The W3C Data Privacy Vocabularies and Controls Community Group is open to interested participants and works on privacy ontologies and taxonomies; participation does not mean W3C endorsement or adoption of a proposal.

Source: https://www.w3.org/community/dpvcg/2026/01/26/data-privacy-vocabularies-and-controls-community-group-dpvcg/
