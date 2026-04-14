import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Tourify",
  description: "Privacy Policy for the Tourify platform — Tourify App LLC",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            &larr; Back to Tourify
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-1">Tourify App LLC &mdash; Las Vegas, Nevada</p>
        <p className="text-slate-400 mb-8">Effective Date: April 13, 2026 &nbsp;|&nbsp; Last Updated: April 13, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          {/* 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
            <p className="text-slate-300 leading-relaxed">
              <strong>Tourify App LLC</strong> (&quot;Tourify,&quot; &quot;Company,&quot; &quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;), a limited liability company organized under the laws
              of the State of Nevada with its principal place of business in Las Vegas, NV, is
              committed to protecting your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform, website, mobile
              applications, and related services (collectively, the &quot;Service&quot;). By using the
              Service, you consent to the practices described in this policy. Please also review our{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-slate-200 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
              <li><strong>Account information:</strong> name, email address, password, account type (artist, venue, organizer, fan)</li>
              <li><strong>Profile information:</strong> display name, username, avatar, bio, location, website, social links</li>
              <li><strong>Content:</strong> posts, articles, blog posts, comments, messages, music uploads, videos, photos, event listings, contracts, site maps, and marketplace listings</li>
              <li><strong>Financial information:</strong> payment methods, billing address, Stripe Connect account details (processed and stored by Stripe, not directly by Tourify)</li>
              <li><strong>Communications:</strong> direct messages, group chats, support requests, email correspondence</li>
              <li><strong>Event data:</strong> event details, attendee lists, RSVPs, ticket purchases, logistics information, travel coordination details, site map data</li>
              <li><strong>Employment/crew data:</strong> team member profiles, shift schedules, onboarding documents, contract signatures</li>
              <li><strong>Preference data:</strong> notification preferences, news feed preferences, followed topics, genres, and sources</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
              <li><strong>Device information:</strong> browser type, operating system, device model, screen resolution, device identifiers</li>
              <li><strong>Usage data:</strong> pages visited, features used, actions taken, timestamps, session duration, click patterns</li>
              <li><strong>Log data:</strong> IP address, access times, referring/exit URLs, HTTP method and status codes</li>
              <li><strong>Location data:</strong> general geographic location based on IP address; precise location only if explicitly permitted by you</li>
              <li><strong>Performance data:</strong> page load times, errors, crash reports (anonymized)</li>
              <li><strong>Push notification tokens:</strong> device tokens for mobile push notifications (if you opt in)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-200 mt-4">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-2">
              <li><strong>Authentication providers:</strong> if you sign in via social login (Google, Apple, etc.), we receive your name, email, and profile picture</li>
              <li><strong>Payment processors:</strong> Stripe provides us with transaction status, payout information, and account verification status</li>
              <li><strong>RSS feeds:</strong> we aggregate publicly available content from third-party music publications for the Pulse Industry Feed</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li>To provide, operate, and maintain the Service</li>
              <li>To create and manage your account and authenticate your identity</li>
              <li>To display your profile, posts, articles, and content to other users as you direct</li>
              <li>To deliver your content to followers&apos; feeds and, where applicable, to the Pulse page</li>
              <li>To facilitate team management, role assignment, and permissions</li>
              <li>To process financial transactions, ticket purchases, and marketplace orders</li>
              <li>To deliver messages, notifications (email, push, in-app), and transactional communications</li>
              <li>To personalize your news feed and content recommendations</li>
              <li>To aggregate third-party RSS content for the Pulse Industry Feed</li>
              <li>To monitor and analyze usage patterns, engagement metrics, and platform performance</li>
              <li>To detect, prevent, and address fraud, abuse, security threats, and technical issues</li>
              <li>To enforce our Terms of Service and applicable policies</li>
              <li>To comply with legal obligations and respond to lawful requests</li>
              <li>To improve and develop new features for the Service</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">4. How We Share Your Information</h2>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                <strong className="text-white">Other Users:</strong> Your profile, posts, articles,
                music, and public content are visible to other users according to your visibility
                settings. Messages are shared with their intended recipients.
              </li>
              <li>
                <strong className="text-white">Your Team/Organization:</strong> Information necessary
                for collaboration (schedules, contracts, logistics) is shared with members of your
                organization according to their assigned roles and permissions.
              </li>
              <li>
                <strong className="text-white">Service Providers:</strong> We share data with
                third-party providers who perform services on our behalf, including:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Supabase (database hosting and authentication)</li>
                  <li>Vercel (web hosting and deployment)</li>
                  <li>Stripe (payment processing)</li>
                  <li>Email delivery services (transactional emails)</li>
                  <li>Analytics providers (anonymized usage data)</li>
                  <li>Cloud storage providers (media files)</li>
                </ul>
              </li>
              <li>
                <strong className="text-white">Legal Requirements:</strong> We may disclose information
                if required by law, regulation, subpoena, court order, or other legal process.
              </li>
              <li>
                <strong className="text-white">Safety &amp; Enforcement:</strong> We may share information
                to protect the rights, property, or safety of Tourify, our users, or the public.
              </li>
              <li>
                <strong className="text-white">Business Transfers:</strong> In connection with a merger,
                acquisition, reorganization, or sale of assets, your information may be transferred.
                We will notify you before your data becomes subject to a different privacy policy.
              </li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">5. Cookies &amp; Tracking Technologies</h2>
            <p className="text-slate-300 leading-relaxed">
              We use cookies and similar technologies (local storage, session tokens) to authenticate
              users, remember preferences, and analyze usage. Essential cookies are required for the
              Service to function. You can manage cookie preferences through your browser settings,
              but disabling essential cookies may prevent you from using certain features.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">6. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement industry-standard technical and organizational security measures to protect
              your personal information, including:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li>Encryption of data in transit (TLS/HTTPS) and at rest</li>
              <li>Row-Level Security (RLS) policies on database tables</li>
              <li>Role-based access controls</li>
              <li>Regular security assessments and dependency audits</li>
              <li>Secure authentication with hashed passwords and session management</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              However, no method of transmission over the Internet or electronic storage is 100%
              secure. We cannot guarantee absolute security and are not liable for breaches beyond
              our reasonable control.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">7. Data Retention</h2>
            <p className="text-slate-300 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed
              to provide the Service. After account deletion, we may retain certain data for a
              reasonable period to comply with legal obligations, resolve disputes, enforce
              agreements, and maintain backups. Anonymized and aggregated data may be retained
              indefinitely. Agreement acceptance records (ToS, Privacy Policy) are retained for
              compliance purposes.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">8. Your Rights &amp; Choices</h2>
            <p className="text-slate-300 leading-relaxed">
              Depending on your jurisdiction (including rights under CCPA, GDPR, and Nevada privacy
              law), you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data (subject to legal exceptions).</li>
              <li><strong className="text-white">Portability:</strong> Request a copy of your data in a machine-readable format.</li>
              <li><strong className="text-white">Restriction:</strong> Request that we restrict processing of your data.</li>
              <li><strong className="text-white">Objection:</strong> Object to processing of your personal data for certain purposes.</li>
              <li><strong className="text-white">Opt-out of Sale:</strong> We do not sell personal information, but you may exercise this right if applicable law requires.</li>
              <li><strong className="text-white">Notification preferences:</strong> Manage email, push, and in-app notification settings in your account.</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@tourify.app" className="text-purple-400 hover:text-purple-300">
                privacy@tourify.app
              </a>. We will respond within the timeframe required by applicable law (typically 30–45 days).
              We will not discriminate against you for exercising your privacy rights.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">9. Children&apos;s Privacy</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service is not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children under 18. If you are a parent or guardian
              and believe your child has provided personal information to Tourify, please contact us
              at{" "}
              <a href="mailto:privacy@tourify.app" className="text-purple-400 hover:text-purple-300">
                privacy@tourify.app
              </a>{" "}
              and we will promptly delete such information.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">10. International Data Transfers</h2>
            <p className="text-slate-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country
              of residence, including the United States, where data protection laws may differ. By
              using the Service, you consent to such transfers. We take steps to ensure that
              transferred data receives adequate protection consistent with applicable law.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">11. Third-Party Links &amp; Services</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service may contain links to third-party websites, services, or content (including
              RSS feed sources, Stripe, and social media platforms). This Privacy Policy does not
              apply to third-party services. We are not responsible for the privacy practices of
              third parties and encourage you to review their privacy policies independently.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">12. Changes to This Policy</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes, we
              will notify you by email and/or by posting a prominent notice on the Service at least
              thirty (30) days before the changes take effect. The &quot;Last Updated&quot; date at
              the top of this page indicates when the policy was last revised. Your continued use
              of the Service after the effective date constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">13. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300 text-sm space-y-1">
              <p><strong className="text-white">Tourify App LLC</strong></p>
              <p>Las Vegas, Nevada, United States</p>
              <p>
                Privacy inquiries:{" "}
                <a href="mailto:privacy@tourify.app" className="text-purple-400 hover:text-purple-300">
                  privacy@tourify.app
                </a>
              </p>
              <p>
                Legal inquiries:{" "}
                <a href="mailto:legal@tourify.app" className="text-purple-400 hover:text-purple-300">
                  legal@tourify.app
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Tourify App LLC. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link>
            <Link href="/" className="text-slate-400 hover:text-white">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
