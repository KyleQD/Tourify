import { Metadata } from "next"
import { LEGAL_EMAIL, WORKFORCE_TERMS_VERSION } from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"

export const metadata: Metadata = {
  title: "Workforce & Hiring Terms | Tourify",
  description: "Terms for employers and workers using Tourify hiring tools — Tourify App LLC",
}

export default function WorkforceTermsPage() {
  return (
    <LegalPageShell
      title="Workforce & Hiring Terms"
      version={WORKFORCE_TERMS_VERSION}
      currentPath="/legal/workforce-terms"
    >
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Scope &amp; Parties</h2>
        <p className="text-slate-300 leading-relaxed">
          These Workforce &amp; Hiring Terms (&quot;Workforce Terms&quot;) supplement the Tourify{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink> and{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>. They apply to organizations that post jobs,
          review applications, manage onboarding, roster, or shifts (&quot;Employers&quot;) and individuals who
          apply, onboard, or work through the Service (&quot;Workers&quot;). Tourify provides software only and is
          not a party to employment or contractor relationships between Employers and Workers.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Tourify Is Not an Employer or Payroll Provider</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify App LLC is <strong>not</strong> an employer, employer of record, joint employer, payroll provider,
          benefits administrator, staffing agency, or professional employer organization. Employers are solely
          responsible for hiring decisions, wages, scheduling, termination, worker classification (employee vs.
          independent contractor), tax withholding, workers&apos; compensation, unemployment insurance, and
          compliance with labor, anti-discrimination, and immigration laws.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. Employer Responsibilities</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>Assign RBAC permissions appropriately and revoke access when no longer needed.</li>
          <li>Use workforce data only for legitimate hiring and employment purposes.</li>
          <li>Provide accurate job descriptions and onboarding requirements.</li>
          <li>Honor agreements, waivers, and policies you present to Workers through onboarding templates.</li>
          <li>Maintain workplace safety and comply with OSHA and local safety requirements at events.</li>
          <li>Respond to Worker data access and deletion requests for data you control as employer.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. Worker Responsibilities</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>Provide accurate personal, tax, banking, and identification information.</li>
          <li>Review and understand agreements and waivers presented by the Employer before acknowledging.</li>
          <li>Comply with Employer policies, shift requirements, and event safety instructions.</li>
          <li>Understand that submitting documents through Tourify does not guarantee hiring or continued work.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">5. Sensitive Data &amp; Document Collection</h2>
        <p className="text-slate-300 leading-relaxed">
          Onboarding may collect government ID, tax forms (e.g., W-9), bank details, certifications, and background
          documents. Tourify stores data using access controls and encryption where applicable. Authorized Employer
          personnel may review documents per RBAC. Tourify does <strong>not</strong> verify identity, work
          eligibility (I-9/E-Verify), professional licensure, or background suitability unless explicitly stated as
          a separate paid service. Document upload is not a Fair Credit Reporting Act consumer report.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">6. Waivers &amp; Onboarding Agreements</h2>
        <p className="text-slate-300 leading-relaxed">
          Waivers, NDAs, safety acknowledgements, and similar text in onboarding templates are presented by the
          Employer, not Tourify. Enforceability is between Worker and Employer. Tourify is not liable for the
          content, enforceability, or adequacy of Employer-supplied agreement text.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">7. Shifts, Roster &amp; Site Operations</h2>
        <p className="text-slate-300 leading-relaxed">
          Accepting a shift, appearing on a roster, or completing site-map tasks does not create an employment
          relationship with Tourify. Site maps and logistics tools are planning aids, not certified safety
          documents. Employers are responsible for on-site supervision and incident response.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">8. Limitation of Liability</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOURIFY APP LLC IS NOT LIABLE FOR HIRING DECISIONS, DISCRIMINATION
          OR HARASSMENT CLAIMS, WORKER CLASSIFICATION DISPUTES, WAGE OR BENEFIT CLAIMS, WORKPLACE INJURIES, EMPLOYER
          MISUSE OF WORKER PII, OR INACCURATE DOCUMENTS SUBMITTED BY WORKERS OR EMPLOYERS. LIABILITY LIMITS IN THE
          TERMS OF SERVICE APPLY.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">9. Indemnification</h2>
        <p className="text-slate-300 leading-relaxed">
          Employers indemnify Tourify for claims arising from their hiring practices, workforce data handling, and
          employment relationships. Workers indemnify Tourify for false information they submit and violations of
          these Terms or Employer policies that give rise to third-party claims against Tourify.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">10. Governing Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          Nevada law, arbitration, and class action waiver in the Terms of Service apply. For privacy practices
          see the Privacy Policy.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">11. Contact</h2>
        <LegalContactBlock email={LEGAL_EMAIL} />
      </section>
    </LegalPageShell>
  )
}
