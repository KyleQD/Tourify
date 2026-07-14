import { Metadata } from "next"
import {
  LEGAL_EMAIL,
  PLATFORM_TOS_VERSION,
} from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"

export const metadata: Metadata = {
  title: "Terms of Service | Tourify",
  description: "Terms of Service for the Tourify platform — Tourify App LLC",
}

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" version={`${PLATFORM_TOS_VERSION}.0`} currentPath="/terms">
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you
          (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and <strong>Tourify App LLC</strong>,
          a limited liability company organized under the laws of the State of Nevada, with its
          principal place of business in Las Vegas, NV (&quot;Tourify,&quot; &quot;Company,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, accessing, or using the Tourify
          platform, website, mobile applications, APIs, or any related services (collectively, the
          &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound
          by these Terms and our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>, which is incorporated herein by reference.
          If you do not agree, you must not access or use the Service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Description of the Service</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify is a comprehensive technology platform for the live music and events industry. The Service
          includes, but is not limited to:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
          <li>Artist, venue, organization, and event-organizer dashboards and management tools</li>
          <li>Multi-persona accounts (artist, venue, organization, worker, fan) under a single login</li>
          <li>Social networking: profiles, feeds, posts, polls, follows, messaging, and notifications</li>
          <li>Content publishing: blog posts, articles, music uploads, streaming, photos, and News Pulse</li>
          <li>News aggregation from third-party RSS sources</li>
          <li>Public artist profiles, EPK (electronic press kit) builders, and booking inquiry tools</li>
          <li>Event creation, advancing, day sheets, command center, logistics, site maps, and travel coordination</li>
          <li>Ticketing, RSVPs, digital wallet, ticket transfers, check-in, box office, and revenue settlements</li>
          <li>Marketplace for merchandise, services, digital goods, and third-party fulfillment integrations</li>
          <li>Hiring, job postings, applications, onboarding workflows, roster management, and shift scheduling</li>
          <li>Collection and storage of workforce documents (government ID, tax forms, bank details, certifications, waivers)</li>
          <li>Contract creation, e-signatures, and agreement acceptance tracking</li>
          <li>Role-based access control (RBAC), organization invites, and delegated account relationships</li>
          <li>Financial tools: payments, Stripe Connect, fee calculation, settlements, and analytics</li>
          <li>Third-party integrations including Stripe, Shopify, Printful, Slack, and calendar export (ICS)</li>
          <li>Mobile applications for iOS and Android</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mt-3">
          Tourify may add, modify, or discontinue features of the Service at any time without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. Platform Role &amp; Intermediary Disclaimer</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify provides software and technology services only. Except where Tourify explicitly acts as a
          payment facilitator collecting platform fees, Tourify is <strong>not</strong> a party to transactions,
          contracts, employment relationships, or events facilitated through the Service. Tourify is not:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
          <li>A venue, promoter, event producer, or ticket seller (organizers are merchants of record for ticket sales)</li>
          <li>A booking agent, talent manager, or artist representative</li>
          <li>An employer, employer of record, payroll provider, benefits administrator, or staffing agency</li>
          <li>A background-check provider, consumer reporting agency, or work-eligibility verifier (I-9/E-Verify)</li>
          <li>An escrow agent, insurer, safety consultant, engineer, or legal advisor</li>
          <li>A guarantor that any event will occur, any hire will be suitable, or any transaction will be completed</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mt-3">
          You acknowledge that interactions with other users and third parties through the Service are at your
          sole risk. Tourify does not control user conduct, organizer decisions, employer hiring practices, or
          third-party integrations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. Eligibility &amp; User Accounts</h2>
        <p className="text-slate-300 leading-relaxed">
          You must be at least 18 years of age (or the age of majority in your jurisdiction) to create an account.
          By registering, you represent and warrant that:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
          <li>All registration information you provide is truthful, accurate, and complete.</li>
          <li>You will maintain the accuracy of such information.</li>
          <li>You are solely responsible for the confidentiality of your credentials and for all activity under your account.</li>
          <li>You will immediately notify Tourify of any unauthorized use of your account.</li>
          <li>You will not create more than one personal account or share account credentials.</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mt-3">
          Tourify reserves the right to suspend or terminate accounts that violate these Terms or that we
          reasonably believe are fraudulent, inactive, or harmful to the community.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">5. Multi-Persona Accounts &amp; Delegated Access</h2>
        <p className="text-slate-300 leading-relaxed">
          A single login may control multiple personas (e.g., artist, venue, organization, worker, fan).
          You are responsible for all activity conducted under every persona linked to your account.
          Granting another user delegated access (including manager, posting, or administrative permissions
          through account relationships) creates an agency relationship <strong>between those users only</strong>,
          not between the delegate and Tourify. Delegating users remain liable for actions taken by delegates
          within granted permissions. Tourify is not responsible for misuse of delegated access.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">6. User Roles, Organizations &amp; RBAC</h2>
        <p className="text-slate-300 leading-relaxed">
          The Service supports organization administrators, role-based permissions, and team collaboration.
          Organization administrators are solely responsible for assigning, reviewing, and revoking access;
          for actions taken by members under their organization account; and for compliance with laws governing
          data they access (including workforce and financial data). RBAC controls access within the Service but
          does not create a fiduciary or professional duty by Tourify to your organization or its members.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">7. User-Generated Content</h2>
        <p className="text-slate-300 leading-relaxed">
          &quot;User Content&quot; means any content you create, upload, post, share, or transmit through the Service,
          including text, articles, polls, photos, videos, music, profiles, event listings, site maps, contracts,
          messages, onboarding responses, and marketplace listings.
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li><strong>Ownership:</strong> You retain ownership rights in your User Content.</li>
          <li>
            <strong>License Grant:</strong> You grant Tourify a non-exclusive, worldwide, royalty-free, sublicensable,
            transferable license to use, reproduce, modify, adapt, publish, translate, distribute, perform, and display
            such content solely to operate, promote, and improve the Service.
          </li>
          <li>
            <strong>Standards:</strong> You represent that your User Content does not infringe third-party rights and
            complies with applicable law and these Terms.
          </li>
          <li>
            <strong>Music &amp; Audio:</strong> You represent you own or have cleared all rights for uploaded music and audio.
          </li>
          <li>
            <strong>Polls &amp; Surveys:</strong> Poll results are not scientific, audited, or certified for regulatory purposes.
          </li>
          <li>
            <strong>Removal:</strong> Tourify may remove User Content that violates these Terms without prior notice.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">8. Acceptable Use Policy</h2>
        <p className="text-slate-300 leading-relaxed">You agree not to:</p>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
          <li>Violate any applicable law or regulation.</li>
          <li>Post unlawful, defamatory, harassing, hateful, or violent content.</li>
          <li>Infringe intellectual property, privacy, or publicity rights.</li>
          <li>Impersonate any person or entity or misrepresent affiliation.</li>
          <li>Spam, phish, scrape, or use bots without written consent.</li>
          <li>Attempt unauthorized access or disrupt the Service.</li>
          <li>Upload malware or circumvent security measures.</li>
          <li>Use the Service for fraud, scalping in violation of organizer rules, or illegal ticket resale where prohibited.</li>
          <li>Misuse workforce onboarding to submit false identity, tax, or banking information.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">9. Marketplace &amp; Financial Transactions</h2>
        <p className="text-slate-300 leading-relaxed">
          The Marketplace allows Sellers to list items and services for sale to Buyers. Tourify acts solely as a
          marketplace facilitator and is <strong>not</strong> a party to Buyer-Seller transactions.
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>
            <strong>Service Fee:</strong> A service fee (currently 10%, subject to change with notice) may be added
            to the Buyer&apos;s total.
          </li>
          <li>
            <strong>Stripe:</strong> Payments are processed through Stripe. Sellers must accept the{" "}
            <LegalLink href="/marketplace/seller-agreement">Marketplace Seller Agreement</LegalLink> and maintain
            a connected Stripe account.
          </li>
          <li>
            <strong>Seller Responsibility:</strong> Sellers are solely responsible for listings, fulfillment, tax,
            refunds, and legal compliance.
          </li>
          <li>
            <strong>Fulfillment Integrations:</strong> Third-party fulfillment (e.g., Printful, Shopify) is between
            the Seller and that provider; Tourify is not responsible for shipping delays or product defects.
          </li>
          <li>
            <strong>No Liability:</strong> Tourify is not liable for disputes, chargebacks, non-delivery, quality,
            safety, or misrepresentation between users.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">10. Ticketing &amp; Events</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify provides ticketing technology. <strong>Event organizers are merchants of record</strong> for ticket
          sales and are solely responsible for event accuracy, capacity, permits, safety, ADA compliance, alcohol and
          minor policies, insurance, cancellations, postponements, and refund policies. Tourify does not guarantee
          that events will occur as described.
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>
            <strong>Fees &amp; Taxes:</strong> Platform and processing fees and applicable taxes may be passed through
            to Buyers as disclosed at checkout.
          </li>
          <li>
            <strong>Transfers &amp; Resale:</strong> Transfer and resale rules are set by organizers. Unauthorized
            duplication, scalping, or credential sharing may result in ticket voiding without refund.
          </li>
          <li>
            <strong>QR &amp; Wallet:</strong> You are responsible for safeguarding ticket credentials. Tourify is not
            liable for lost, stolen, or fraudulently transferred tickets.
          </li>
          <li>
            <strong>Chargebacks:</strong> Chargebacks and payment disputes may be allocated to organizers per Stripe
            and organizer policies.
          </li>
          <li>
            <strong>Settlements:</strong> Revenue allocation and settlement tools are informational; they do not
            constitute escrow, legal settlement advice, or guaranteed payouts.
          </li>
          <li>
            <strong>Ticket Buyer Terms:</strong> By purchasing tickets you also agree to the{" "}
            <LegalLink href="/legal/ticket-buyer-terms">Ticket Buyer Terms</LegalLink> and any organizer-specific
            terms displayed at checkout.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">11. Workforce, Hiring &amp; Onboarding</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify provides hiring and workforce management tools. <strong>Tourify is not an employer, employer of
          record, payroll provider, or staffing agency.</strong> Organizations using hiring features are solely
          responsible for employment decisions, worker classification (employee vs. independent contractor), wages,
          benefits, tax withholding, discrimination and harassment compliance, workplace safety, and applicable
          labor laws.
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>
            <strong>Document Collection:</strong> Onboarding may collect government ID, tax forms (e.g., W-9), bank
            details, certifications, and waivers. Submission does not constitute Tourify verification of identity,
            work eligibility (I-9/E-Verify), or credentials.
          </li>
          <li>
            <strong>Background Checks:</strong> Document upload is not a FCRA-compliant background check unless
            your organization separately contracts with a qualified provider.
          </li>
          <li>
            <strong>Employer Access:</strong> Authorized organization administrators may access worker data per RBAC.
            Tourify is not liable for employer misuse of worker PII.
          </li>
          <li>
            <strong>Waivers &amp; Agreements:</strong> Worker waivers and employment terms displayed in onboarding
            are between the worker and the hiring organization. Tourify is not a party to those agreements.
          </li>
          <li>
            <strong>Shifts &amp; Roster:</strong> Accepting a shift or appearing on a roster does not create an
            employment relationship with Tourify.
          </li>
          <li>
            See also the <LegalLink href="/legal/workforce-terms">Workforce &amp; Hiring Terms</LegalLink>.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">12. Logistics, Site Maps &amp; Event Operations</h2>
        <p className="text-slate-300 leading-relaxed">
          Site maps, advancing data, day sheets, vendor workflows, and logistics tools are operational planning aids
          only. They are not engineering drawings, safety certifications, or OSHA compliance documents. Organizers and
          employers are solely responsible for on-site safety, crowd management, egress, and regulatory compliance.
          Tourify is not liable for injuries, incidents, or losses arising from reliance on user-generated logistics
          data or worker task completion attestations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">13. Artist Profiles, EPK &amp; Booking</h2>
        <p className="text-slate-300 leading-relaxed">
          Artists warrant the accuracy of public profile, EPK, press, and booking information. Booking inquiry tools
          route communications only; Tourify is not a booking agent unless separately agreed in writing. Verification
          badges indicate platform verification status only and do not constitute endorsement of talent, reliability,
          or suitability. Public contact information may be visible to other users; you are responsible for harassment
          or misuse risks you accept by publishing contact details.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">14. Contracts &amp; E-Signatures</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify facilitates contract workflows but is <strong>not a party</strong> to user agreements. Tourify does
          not provide legal advice and makes no representations regarding validity or enforceability of user-generated
          contracts. Consult independent counsel before signing.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">15. Third-Party Content, Integrations &amp; RSS</h2>
        <p className="text-slate-300 leading-relaxed">
          The Service integrates with and displays content from third parties (RSS feeds, Stripe, Shopify, Printful,
          Slack, social platforms, and linked websites). Third-party content and services are provided &quot;as is.&quot;
          Tourify does not endorse, verify, or guarantee third-party content and is not responsible for integration
          downtime, sync errors, OAuth token security after grant, or practices of linked sites. Your use of
          third-party services is subject to their terms and privacy policies.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">16. Messaging &amp; Communications</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify provides messaging, group chats, and notifications. You agree not to use messaging for spam or
          harassment. Tourify has no obligation to monitor private messages and is not responsible for user-to-user
          communications. Tourify may send transactional and product communications; you may manage preferences in
          settings where available.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">17. Payments &amp; Payment Processors</h2>
        <p className="text-slate-300 leading-relaxed">
          Payment card data is processed by Stripe and other payment processors. Tourify does not store full payment
          card numbers. By using payment features you agree to{" "}
          <a href="https://stripe.com/legal" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300">
            Stripe&apos;s Terms of Service
          </a>{" "}
          and applicable Connected Account terms. Tourify is not liable for processor outages, declines, holds, or
          account restrictions imposed by payment partners.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">18. Intellectual Property</h2>
        <p className="text-slate-300 leading-relaxed">
          The Service and its original content (excluding User Content), features, design, trademarks, and source code
          are the exclusive property of Tourify App LLC and its licensors. Nothing in these Terms grants rights to use
          Tourify trademarks without prior written consent.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">19. DMCA &amp; Copyright Complaints</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify complies with the DMCA. Send takedown notices to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className="text-purple-400 hover:text-purple-300">{LEGAL_EMAIL}</a>.
          Repeat infringers may be terminated.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">20. Disclaimer of Warranties</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND,
          EITHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, OR COURSE OF PERFORMANCE. TOURIFY APP LLC DOES NOT WARRANT UNINTERRUPTED, SECURE, OR ERROR-FREE
          OPERATION, OR THAT RESULTS WILL MEET YOUR REQUIREMENTS. YOUR USE IS AT YOUR SOLE RISK.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">21. Limitation of Liability</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TOURIFY APP LLC, ITS MEMBERS, MANAGERS,
          OFFICERS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR
          USE, ARISING OUT OF OR IN CONNECTION WITH: (A) YOUR ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE
          SERVICE; (B) CONDUCT OR CONTENT OF ANY THIRD PARTY; (C) USER CONTENT OR THIRD-PARTY CONTENT; (D) MARKETPLACE
          TRANSACTIONS; (E) CHARGEBACKS OR PAYMENT DISPUTES; (F) CONTRACTS OR E-SIGNATURES; (G) EVENTS, TICKET SALES,
          TRANSFERS, ATTENDANCE, OR CANCELLATIONS; (H) HIRING, ONBOARDING, EMPLOYMENT, WORKER CLASSIFICATION, OR WORKPLACE
          INCIDENTS; (I) COLLECTION, STORAGE, OR EMPLOYER ACCESS TO WORKFORCE PII; (J) SITE MAPS, LOGISTICS, OR ADVANCING
          DATA; (K) SETTLEMENT OR REVENUE ALLOCATION CALCULATIONS; (L) DELEGATED PERSONA OR RBAC MISUSE; (M) THIRD-PARTY
          INTEGRATIONS OR SERVICE PROVIDER FAILURES; (N) ARTIST BOOKING OR PUBLIC PROFILE CONTENT; OR (O) ANY OTHER MATTER
          RELATING TO THE SERVICE.
        </p>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide mt-3">
          IN NO EVENT SHALL TOURIFY APP LLC&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE GREATER OF
          (A) THE AMOUNT YOU PAID TO TOURIFY IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S.
          DOLLARS ($100.00). THESE LIMITATIONS APPLY REGARDLESS OF THEORY OF LIABILITY AND EVEN IF TOURIFY HAS BEEN
          ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">22. Indemnification</h2>
        <p className="text-slate-300 leading-relaxed">
          You agree to defend, indemnify, and hold harmless Tourify App LLC and its members, managers, officers,
          employees, agents, and affiliates from claims, damages, losses, liabilities, costs, and expenses (including
          reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) your violation of these Terms or
          applicable law; (c) your User Content; (d) disputes with other users; (e) Marketplace activity; (f) event
          organization or ticket sales; (g) hiring, onboarding, roster, or shift decisions; (h) worker classification,
          wages, or workplace claims involving your organization; (i) misuse of delegated access or RBAC; (j) tax or
          regulatory obligations; or (k) any claim by a third party related to goods, services, events, or employment
          you provide or facilitate through the Service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">23. Dispute Resolution &amp; Arbitration</h2>
        <p className="text-slate-300 leading-relaxed">
          Disputes shall first be addressed through good-faith negotiation. If unresolved within thirty (30) days,
          disputes shall be submitted to binding arbitration administered by the AAA under its Commercial Arbitration
          Rules in Clark County, Nevada.
        </p>
        <p className="text-slate-300 leading-relaxed mt-3">
          <strong>Class Action Waiver:</strong> Proceedings shall be conducted only on an individual basis. You waive
          any right to participate in class, consolidated, or representative actions.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">24. Governing Law</h2>
        <p className="text-slate-300 leading-relaxed">
          These Terms are governed by the laws of the State of Nevada, without regard to conflict-of-law principles.
          Where arbitration does not apply, you consent to exclusive jurisdiction in Clark County, Nevada courts.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">25. Termination</h2>
        <p className="text-slate-300 leading-relaxed">
          We may suspend or terminate your account immediately for any reason, including breach of these Terms. Upon
          termination, your right to use the Service ceases. Provisions that by nature should survive (including
          warranties, indemnity, liability limits, and dispute resolution) survive termination.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">26. Modifications to Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          We may modify these Terms at any time. Material changes will be notified by email and/or prominent notice at
          least thirty (30) days before effectiveness where practicable. Continued use after the effective date
          constitutes acceptance. If you disagree, stop using the Service and request account deletion.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">27. Severability</h2>
        <p className="text-slate-300 leading-relaxed">
          If any provision is held invalid, the remainder continues in effect. The invalid provision shall be modified
          to the minimum extent necessary to be enforceable while preserving intent.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">28. Force Majeure</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify App LLC is not liable for failure or delay due to causes beyond reasonable control, including natural
          disasters, pandemics, war, government action, labor disputes, internet or telecom failures, cyberattacks, or
          failures of third-party providers (Stripe, Supabase, Vercel, cloud hosts, and integration partners).
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">29. Entire Agreement</h2>
        <p className="text-slate-300 leading-relaxed">
          These Terms, together with the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>,{" "}
          <LegalLink href="/marketplace/seller-agreement">Marketplace Seller Agreement</LegalLink> (if applicable),{" "}
          <LegalLink href="/legal/ticket-buyer-terms">Ticket Buyer Terms</LegalLink> (if you purchase tickets), and{" "}
          <LegalLink href="/legal/workforce-terms">Workforce &amp; Hiring Terms</LegalLink> (if you use hiring features),
          constitute the entire agreement between you and Tourify App LLC regarding the Service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">30. Contact Us</h2>
        <p className="text-slate-300 leading-relaxed">Questions about these Terms:</p>
        <LegalContactBlock email={LEGAL_EMAIL} />
      </section>
    </LegalPageShell>
  )
}
