# Current Standards, Legal, Privacy and Competition Research

Research date: 2026-07-17. This document is a product-planning baseline, not legal advice. Codex must re-check official sources before implementation and release.

## U.S. competitor collaboration and information exchange

- The FTC and DOJ withdrew the 2000 Competitor Collaboration Guidelines in December 2024, stating that they no longer provided reliable guidance. Official notice: https://www.ftc.gov/news-events/news/press-releases/2024/12/ftc-doj-withdraw-guidelines-collaboration-among-competitors
- In February 2026 the agencies opened an inquiry about possible updated guidance, specifically identifying information/data sharing, algorithmic pricing, labor collaborations and joint licensing as topics; the comment deadline was later extended to May 21, 2026. Official notices: https://www.justice.gov/opa/pr/justice-department-and-federal-trade-commission-seek-public-comment-guidance-business and https://www.ftc.gov/news-events/news/press-releases/2026/04/ftc-doj-extend-deadline-public-comment-guidance-business-collaborations
- Price fixing, bid rigging and market allocation remain core prohibited conduct. FTC overview: https://www.ftc.gov/advice-guidance/competition-guidance/guide-antitrust-laws/dealings-competitors/price-fixing
- DOJ actions involving RealPage and Agri Stats illustrate current enforcement attention to competitively sensitive data and algorithmic coordination. Official sources: https://www.justice.gov/opa/pr/justice-department-requires-realpage-end-sharing-competitively-sensitive-information-and and https://www.justice.gov/opa/pr/justice-department-requires-agri-stats-end-exchange-competitively-sensitive-information

### Product consequence

Do not encode the historical FTC information-exchange “safety zone” as a legal safe harbor. Use conservative thresholds as product controls only, and require matter-specific counsel for each benchmark and group program.

## Labor and independent creators

- The FTC issued a January 2025 policy statement concerning protected organizing by independent contractors and gig workers. Official release: https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-issues-policy-statement-clarifying-independent-contractors-gig-workers-organizing-activities-are
- NLRB materials state that independent contractors are generally excluded from NLRA coverage, while covered employees have concerted-activity and collective-bargaining rights. Official sources: https://www.nlrb.gov/about-nlrb/rights-we-protect/your-rights/employee-rights and https://www.nlrb.gov/guidance/key-reference-materials/gc-collective-bargaining-resources
- Worker classification remains fact-specific and the Department of Labor proposed a revised rule in February 2026. Official source: https://www.dol.gov/agencies/whd/flsa/misclassification/2026rulemaking

### Product consequence

An artist may act as an employee, independent contractor, business, licensor or rights owner in different transactions. Labor activity cannot be conflated with collective sale or licensing of independent intellectual property. Require counsel and jurisdiction analysis.

## Privacy, pseudonymization and differential privacy

- NIST SP 800-226 (March 2025) provides guidance for evaluating differential-privacy guarantees and warns that implementation details and privacy hazards matter. Official source: https://csrc.nist.gov/pubs/sp/800/226/final
- NISTIR 8053 explains that de-identified datasets can sometimes be re-identified. Official source: https://www.nist.gov/publications/de-identification-personal-information
- EDPB Guidelines 01/2025 explain that pseudonymized data that can be attributed using additional information remains personal data. Official source: https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_en

### Product consequence

Treat pseudonymization as a safeguard, not an exemption. Store privacy-unit definitions, attack tests, cohort thresholds, dominance limits, query budgets and release approvals.

## Benchmark and policy publication posture

Every Tourify benchmark should disclose that it is historical and descriptive, not a recommendation; identify coverage and uncertainty; prohibit use for coordinated pricing or retaliation; and support emergency revocation. Policy alerts must retain official-source links, publication/effective dates, supersession and review deadlines.

## Required refresh triggers

Re-run legal and policy review when the FTC/DOJ issue new competitor-collaboration guidance; labor or independent-contractor standards change; new state freelance bargaining laws apply; privacy regulators finalize anonymization guidance; or Tourify adds actual representation, collective licensing, pricing, external negotiation or group communications.
