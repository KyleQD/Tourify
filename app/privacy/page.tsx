import { Metadata } from "next"
import { PRIVACY_EMAIL, LEGAL_EMAIL } from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"

export const metadata: Metadata = {
  title: "Privacy Policy | Tourify",
  description: "Privacy Policy for the Tourify platform — Tourify App LLC",
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" currentPath="/privacy">
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
        <p className="text-slate-300 leading-relaxed">
          <strong>Tourify App LLC</strong> (&quot;Tourify,&quot; &quot;Company,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your information when you use our platform, website, mobile
          applications, and related services (collectively, the &quot;Service&quot;). By using the Service, you
          consent to the practices described here. Please also review our{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink> and, if applicable, our{" "}
          <LegalLink href="/legal/workforce-terms">Workforce &amp; Hiring Terms</LegalLink>.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>

        <h3 className="text-lg font-medium text-slate-200 mt-4">2.1 Information You Provide</h3>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
          <li><strong>Account information:</strong> name, email, password, account type and personas</li>
          <li><strong>Profile information:</strong> display name, username, avatar, bio, location, social links, EPK data</li>
          <li><strong>Content:</strong> posts, articles, polls, messages, music, videos, photos, event listings, site maps, contracts</li>
          <li><strong>Financial information:</strong> billing details and Stripe Connect account status (card data processed by Stripe)</li>
          <li><strong>Ticketing data:</strong> purchase history, transfer recipients, wallet credentials, check-in records, promo/referral usage</li>
          <li><strong>Workforce &amp; hiring data:</strong> job applications, onboarding responses, government ID images, tax forms (e.g., W-9), bank or direct-deposit details, certifications, background-check documents, waivers, shift and roster records</li>
          <li><strong>Communications:</strong> support requests, direct messages, group chats, notification preferences</li>
          <li><strong>Agreement records:</strong> ToS, Privacy, seller agreement, ticket buyer, and workforce term acceptances</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-200 mt-4">2.2 Information Collected Automatically</h3>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
          <li><strong>Device &amp; usage data:</strong> browser, OS, pages visited, features used, session duration, IP address, logs</li>
          <li><strong>Location:</strong> general location from IP; precise location only with permission</li>
          <li><strong>Performance data:</strong> errors and anonymized crash reports</li>
          <li><strong>Push tokens:</strong> if you opt in to mobile notifications</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-200 mt-4">2.3 Information from Third Parties</h3>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
          <li><strong>Authentication providers:</strong> social login profile basics</li>
          <li><strong>Payment processors:</strong> transaction and payout status from Stripe</li>
          <li><strong>Integrations:</strong> data from Shopify, Printful, Slack, or other services you connect</li>
          <li><strong>RSS/public sources:</strong> aggregated news content for News Pulse</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
          <li>Provide, operate, and maintain the Service</li>
          <li>Authenticate users and manage multi-persona accounts</li>
          <li>Display content according to your visibility and role settings</li>
          <li>Process ticket purchases, transfers, check-in, and marketplace orders</li>
          <li>Facilitate hiring, onboarding, roster management, and shift scheduling for organizations</li>
          <li>Store and transmit workforce documents to authorized organization reviewers per RBAC</li>
          <li>Deliver messages, notifications, and transactional communications</li>
          <li>Detect fraud, abuse, and security threats; enforce policies</li>
          <li>Comply with legal obligations and respond to lawful requests</li>
          <li>Improve and develop features</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. How We Share Your Information</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>
            <strong className="text-white">Other Users:</strong> Public profile and content visibility per your settings.
            Messages go to intended recipients.
          </li>
          <li>
            <strong className="text-white">Your Organization / Employer:</strong> Hiring organizations and authorized
            administrators may access workforce onboarding data, documents, roster, and shift information according to
            assigned permissions. Tourify does not control how employers use data after access.
          </li>
          <li>
            <strong className="text-white">Event Organizers:</strong> Ticket purchasers&apos; contact information may be
            shared with organizers for fulfillment, entry, and event communications.
          </li>
          <li>
            <strong className="text-white">Service Providers:</strong> Supabase, Vercel, Stripe, email delivery, analytics,
            and cloud storage providers processing data on our behalf under contractual safeguards.
          </li>
          <li>
            <strong className="text-white">Legal &amp; Safety:</strong> When required by law or to protect rights, safety, and security.
          </li>
          <li>
            <strong className="text-white">Business Transfers:</strong> In mergers, acquisitions, or asset sales, with notice where required.
          </li>
        </ul>
        <p className="text-slate-300 leading-relaxed mt-3">
          <strong>We do not sell your personal information to third parties.</strong>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">5. Workforce &amp; Sensitive Data</h2>
        <p className="text-slate-300 leading-relaxed">
          Workforce onboarding may involve sensitive personal information including government-issued identification,
          tax identifiers, and banking details. Such data may be stored in encrypted or access-controlled systems and
          private storage buckets. Authorized organization personnel—not Tourify staff routinely—review documents
          for hiring purposes. Tourify is not an employer and does not make hiring decisions. Workers should only
          submit documents to organizations they trust. See the{" "}
          <LegalLink href="/legal/workforce-terms">Workforce &amp; Hiring Terms</LegalLink> for role-specific notices.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">6. Cookies &amp; Tracking Technologies</h2>
        <p className="text-slate-300 leading-relaxed">
          We use cookies, session tokens, and local storage to authenticate users, remember preferences, and analyze
          usage. Essential cookies are required for core functionality. You may manage non-essential cookies through
          browser settings; disabling essential cookies may limit Service functionality. A standalone cookie policy
          may be published separately in the future.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">7. Data Security</h2>
        <p className="text-slate-300 leading-relaxed">
          We implement technical and organizational measures including encryption in transit (TLS), encryption at rest
          where applicable, row-level security, role-based access controls, and secure authentication. No method of
          transmission or storage is 100% secure. We cannot guarantee absolute security and are not liable for breaches
          beyond our reasonable control. In the event of a breach affecting personal information, we will notify affected
          users and authorities as required by applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">8. Data Retention</h2>
        <p className="text-slate-300 leading-relaxed">
          We retain personal information while your account is active and as needed to provide the Service. After
          deletion, we may retain data for legal compliance, dispute resolution, enforcement, and backups for a
          reasonable period. Workforce documents may be retained per organization policies and legal requirements;
          workers should contact the hiring organization for employer-side deletion requests. Agreement acceptance
          records (ToS, Privacy, addenda) are retained for compliance. Ticketing and financial records may be retained
          per tax and payment processor requirements. Anonymized aggregates may be retained indefinitely.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">9. Your Rights &amp; Choices</h2>
        <p className="text-slate-300 leading-relaxed">
          Depending on jurisdiction (including CCPA, GDPR, and Nevada privacy law), you may have rights to access,
          correct, delete, restrict, object to processing, and port your data. Contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-purple-400 hover:text-purple-300">{PRIVACY_EMAIL}</a>.
          We respond within timeframes required by law (typically 30–45 days). We do not discriminate for exercising
          privacy rights. Workforce data held for an employer may require coordinated requests with that organization.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">10. Children&apos;s Privacy</h2>
        <p className="text-slate-300 leading-relaxed">
          The Service is not intended for individuals under 18. We do not knowingly collect data from children under 18.
          Contact <a href={`mailto:${PRIVACY_EMAIL}`} className="text-purple-400 hover:text-purple-300">{PRIVACY_EMAIL}</a> to
          request deletion of a child&apos;s information.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">11. International Data Transfers</h2>
        <p className="text-slate-300 leading-relaxed">
          Data may be processed in the United States and other countries with differing protection laws. By using the
          Service, you consent to such transfers. We take steps to ensure adequate safeguards consistent with applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">12. Third-Party Links &amp; Services</h2>
        <p className="text-slate-300 leading-relaxed">
          Third-party websites and integrations (Stripe, social platforms, RSS sources) have their own privacy practices.
          This policy does not apply to them. Review third-party policies independently.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">13. Changes to This Policy</h2>
        <p className="text-slate-300 leading-relaxed">
          We may update this Privacy Policy. Material changes will be notified by email and/or prominent notice at least
          thirty (30) days before effectiveness where practicable. Continued use after the effective date constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">14. Contact Us</h2>
        <p className="text-slate-300 leading-relaxed">Privacy and data requests:</p>
        <LegalContactBlock email={PRIVACY_EMAIL} label="Privacy inquiries" />
        <p className="text-slate-300 leading-relaxed mt-3 text-sm">
          Legal inquiries:{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className="text-purple-400 hover:text-purple-300">{LEGAL_EMAIL}</a>
        </p>
      </section>
    </LegalPageShell>
  )
}
