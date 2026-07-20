# Current Standards, Legal, Privacy and Public Treaty-System Review

**Research date:** July 18, 2026  
**Status:** architecture and issue-spotting research; not legal advice or proof of institutional status.

## 1. UN Charter relationship framework

The United Nations Charter treats specialized agencies as bodies established by intergovernmental agreement with broad international responsibilities and brought into relationship with the United Nations under Articles 57 and 63. Article 63 provides for agreements between ECOSOC and eligible agencies, subject to General Assembly approval. Phase 16 must therefore keep all specialized-agency and UN-relationship labels disabled until the actual external process is complete.

Primary sources:

- United Nations Charter, Articles 57–63: https://www.un.org/en/about-us/un-charter/full-text
- Repertory, Article 57: https://legal.un.org/repertory/art57.shtml
- Repertory, Article 63: https://legal.un.org/repertory/art63.shtml
- Agreement between the United Nations and WIPO: https://wipolex-res.wipo.int/edocs/lexdocs/treaties/en/un-wipo/trt_un_wipo_001en.html

## 2. Treaty registration and publication

Article 102 of the Charter requires UN Members to register treaties and international agreements with the Secretariat and provides a consequence for non-registration before UN organs. The current registration regulations distinguish entry into force and provisional application and provide formal submission requirements. Tourify can track a submission and reconciled external result but cannot create a UN registration number itself.

Primary sources:

- Charter Article 102: https://legal.un.org/repertory/art102.shtml
- Article 102 registration regulations: https://treaties.un.org/Pages/Resource.aspx?path=Publication%2FRegulation%2FPage1_en.xml
- UN Treaty Handbook: https://treaties.un.org/Pages/Resource.aspx?path=Publication%2FTH%2FPage1_en.xml
- Final Clauses Handbook: https://treaties.un.org/Pages/Resource.aspx?path=Publication%2FFC%2FPage1_en.xml

## 3. Constitutive instruments and specialized organizations

WIPO’s Convention is its constituent instrument, and WIPO became a specialized agency through a separate relationship process. ITU likewise identifies its Constitution and Convention as the treaty basis defining the Union’s purposes and structure. These examples support a data model that separates the constitutive instrument, amendments, membership actions, relationship agreements, operational regulations and technical standards.

Primary sources:

- WIPO Convention summary: https://www.wipo.int/en/web/treaties/convention/summary_wipo_convention
- WIPO authentic text: https://www.wipo.int/wipolex/en/treaties/textdetails/12412
- ITU Constitution and Convention collection: https://www.itu.int/en/history/pages/constitutionandconvention.aspx

## 4. Privileges and immunities

The Convention on the Privileges and Immunities of the Specialized Agencies entered into force in 1948 and applies through state participation and agency-specific annexes. As of July 15, 2026, the UN Treaty Collection listed 131 parties to the framework convention. Coverage varies by state and agency. Phase 16 must store grants by jurisdiction, instrument, beneficiary and effective period; a global boolean is legally and technically unsafe.

Primary source:

- UN Treaty Collection status: https://treaties.un.org/pages/ViewDetails.aspx?chapter=3&mtdsg_no=III-2&src=TREATY

## 5. Institutional responsibility

The International Law Commission adopted 67 draft articles on the responsibility of international organizations in 2011. They address attribution, internationally wrongful acts, consequences and state responsibility connected with international organizations. They remain an important reference rather than a complete self-executing code. Phase 16 therefore needs matter-specific responsibility and claims analysis.

Primary sources:

- ILC texts: https://legal.un.org/ilc/texts/9_11.shtml
- ILC analytical guide: https://legal.un.org/ilc/guide/9_11.shtml

## 6. Funding and assessed contributions

UN assessed contributions are based on an approved budget and a scale determined by the General Assembly. Current UN materials state that the 2025–2027 scale was adopted in December 2024. Voluntary contributions follow separate acceptance rules. Phase 16 must distinguish appropriations, assessments, voluntary contributions, service fees and earmarked funding and must not invoice a participant without an effective legal basis.

Primary sources:

- UN assessed contributions: https://policy.un.org/en/finance-and-budget/contributions-and-other-income/assessed-contributions
- Current assessment year: https://www.un.org/en/ga/contributions/current.shtml
- Voluntary contributions: https://policy.un.org/en/finance-and-budget/contributions-and-other-income/voluntary-contributions
- Financial Regulations and Rules: https://policy.un.org/en/finance-and-budget/programme-planning-budget-and-finance-framework/financial-regulations-and-rules

## 7. Administrative justice

The ILO Administrative Tribunal hears employment complaints against the ILO and other organizations that have recognized its jurisdiction and satisfy the applicable approval requirements. Its Statute was amended through 2021, and its Rules were amended again in May 2026. Phase 16 must not claim tribunal jurisdiction without actual recognition and must preserve an accessible staff remedy during any interim period.

Primary sources:

- ILO Administrative Tribunal Statute: https://www.ilo.org/resource/statute-administrative-tribunal-international-labour-organization
- Consolidated Statute and Rules, June 2026: https://www.ilo.org/resource/other/statute-and-rules-administrative-tribunal-consolidated-version-statut-et

## 8. Implementation implications

1. Legal-character fields are mandatory and public.
2. Draft, signed, ratified, effective, registered and published are separate states.
3. UN relationship, specialized-agency status, treaty registration, privileges and immunities are externally reconciled statuses.
4. Participant authority must be proved for each state or international organization.
5. Host, privilege, budget and staff-justice records are jurisdiction-specific.
6. Public-law services are enumerated and cannot adjudicate copyright ownership.
7. Every external status is versioned and never silently overwrites the prior record.
8. Research requires scheduled legal review before pilot and before every expansion.
