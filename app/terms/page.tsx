import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | Tourify",
  description: "Terms of Service for the Tourify platform — Tourify App LLC",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            &larr; Back to Tourify
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-1">Tourify App LLC &mdash; Las Vegas, Nevada</p>
        <p className="text-slate-400 mb-8">Effective Date: April 13, 2026 &nbsp;|&nbsp; Last Updated: April 13, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          {/* 1 */}
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
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>,
              which is incorporated herein by reference. If you do not agree, you must not access or use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">2. Description of the Service</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify is a comprehensive platform for the live music and events industry. The Service
              includes, but is not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li>Artist, venue, and event-organizer dashboards and management tools</li>
              <li>Social networking features: profiles, feeds, posts, follows, messaging, and notifications</li>
              <li>Content publishing: blog posts, articles, and user-generated journalistic media (&quot;Pulse&quot; / Community Stories)</li>
              <li>News aggregation from third-party RSS sources (&quot;Pulse&quot; Industry Feed)</li>
              <li>Music uploads, streaming, and the Jukebox player</li>
              <li>Event creation, logistics, site maps, travel coordination, and advancing tools</li>
              <li>Ticketing and RSVP systems</li>
              <li>Marketplace for merchandise, services, and digital goods</li>
              <li>Contract creation, e-signatures, and onboarding workflows</li>
              <li>Team and crew management, shift scheduling, and staffing</li>
              <li>Financial tools: payments, Stripe Connect integration, and analytics</li>
              <li>Achievements, gamification, and product-education features</li>
              <li>Mobile applications for iOS and Android</li>
              <li>API and third-party integrations</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              Tourify may add, modify, or discontinue features of the Service at any time without
              prior notice.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">3. Eligibility &amp; User Accounts</h2>
            <p className="text-slate-300 leading-relaxed">
              You must be at least 18 years of age (or the age of majority in your jurisdiction) to
              create an account. By registering, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li>All registration information you provide is truthful, accurate, and complete.</li>
              <li>You will maintain the accuracy of such information.</li>
              <li>You are solely responsible for the confidentiality of your credentials and for all activity under your account.</li>
              <li>You will immediately notify Tourify of any unauthorized use of your account.</li>
              <li>You will not create more than one personal account or share account credentials.</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              Tourify reserves the right to suspend or terminate accounts that violate these Terms or
              that we reasonably believe are fraudulent, inactive, or harmful to the community.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">4. User Roles &amp; Permissions</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service supports multiple account types and roles, including but not limited to
              artist accounts, venue accounts, admin/organizer accounts, crew members, vendors, and
              general fan/listener accounts. Organization administrators are responsible for managing
              team member access and ensuring that permissions are assigned appropriately. Users must
              only access features, data, and content within the scope of their assigned role.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">5. User-Generated Content</h2>
            <p className="text-slate-300 leading-relaxed">
              &quot;User Content&quot; means any content you create, upload, post, share, or transmit
              through the Service, including but not limited to text posts, articles, blog posts,
              comments, photos, videos, music, audio files, profile information, event listings,
              contracts, messages, and marketplace listings.
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                <strong>Ownership:</strong> You retain all ownership rights in your User Content.
              </li>
              <li>
                <strong>License Grant:</strong> By submitting User Content, you grant Tourify a
                non-exclusive, worldwide, royalty-free, sublicensable, transferable license to use,
                reproduce, modify, adapt, publish, translate, distribute, perform, and display such
                content solely in connection with operating, promoting, and improving the Service.
                This license survives termination of your account only to the extent necessary for
                Tourify to operate the Service (e.g., cached copies, backups, content already shared
                with other users).
              </li>
              <li>
                <strong>Content Standards:</strong> You represent and warrant that your User Content
                does not infringe any third-party rights, does not contain unlawful material, and
                complies with all applicable laws and these Terms.
              </li>
              <li>
                <strong>Pulse / Community Stories:</strong> Articles and blog posts published through
                the platform may be displayed in other users&apos; feeds and on the Pulse page if they
                receive sufficient engagement. Tourify does not guarantee distribution or visibility
                of any User Content.
              </li>
              <li>
                <strong>Music &amp; Audio:</strong> By uploading music or audio content, you represent
                that you own or have obtained all necessary rights, licenses, and clearances for
                such content. Tourify is not responsible for copyright infringement by users.
              </li>
              <li>
                <strong>Removal:</strong> Tourify reserves the right to remove or disable access to
                any User Content that violates these Terms, without prior notice.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">6. Acceptable Use Policy</h2>
            <p className="text-slate-300 leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 mt-3">
              <li>Violate any applicable local, state, national, or international law or regulation.</li>
              <li>Post content that is defamatory, obscene, threatening, harassing, hateful, or that promotes violence or discrimination.</li>
              <li>Infringe upon intellectual property rights of any third party.</li>
              <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
              <li>Use the Service for spam, unsolicited advertising, or phishing.</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or connected systems.</li>
              <li>Interfere with or disrupt the Service, servers, or networks.</li>
              <li>Use automated tools (bots, scrapers, crawlers) without prior written consent.</li>
              <li>Upload malicious code, viruses, or any harmful software.</li>
              <li>Use the Service for any fraudulent, deceptive, or illegal purpose.</li>
              <li>Circumvent or attempt to circumvent any security measures of the Service.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">7. Marketplace &amp; Financial Transactions</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service includes a Marketplace where users (&quot;Sellers&quot;) may list items,
              merchandise, and services for sale to other users (&quot;Buyers&quot;).
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                <strong>Facilitator Only:</strong> Tourify acts solely as a marketplace facilitator
                and is <strong>not</strong> a party to any transaction between Buyers and Sellers.
              </li>
              <li>
                <strong>Service Fee:</strong> A service fee (currently 10%) is added on top of the
                Seller&apos;s listed price and is paid by the Buyer. Tourify reserves the right to
                adjust fee percentages with notice.
              </li>
              <li>
                <strong>Payment Processing:</strong> All payments are processed through Stripe.
                Sellers must maintain a connected Stripe account in good standing. By using payment
                features, you also agree to{" "}
                <a href="https://stripe.com/legal" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300">
                  Stripe&apos;s Terms of Service
                </a>.
              </li>
              <li>
                <strong>No Endorsement or Warranty:</strong> Tourify does not endorse, guarantee, or
                warrant any items, services, or experiences listed on the Marketplace. Tourify does
                not verify the quality, safety, legality, or accuracy of listings.
              </li>
              <li>
                <strong>Seller Responsibility:</strong> Sellers are solely responsible for the accuracy
                of their listings, fulfillment, compliance with applicable laws, tax obligations, and
                handling of buyer inquiries, complaints, and refunds. Sellers must accept the{" "}
                <Link href="/marketplace/seller-agreement" className="text-purple-400 hover:text-purple-300">
                  Marketplace Seller Agreement
                </Link>.
              </li>
              <li>
                <strong>Refunds:</strong> Refund policies are set by individual Sellers. Tourify does
                not guarantee refunds for any Marketplace purchase. Disputes should be resolved
                directly between Buyer and Seller.
              </li>
              <li>
                <strong>No Liability for Transactions:</strong> Tourify is not liable for any disputes,
                losses, damages, or costs arising from transactions between users, including
                non-delivery, product quality, misrepresentation, chargebacks, or payment disputes.
              </li>
              <li>
                <strong>Services, Rentals &amp; Commissions:</strong> The Marketplace allows Sellers to
                offer professional services (e.g., DJ services, photography, sound engineering),
                equipment rentals, venue rentals, and custom commission work. Tourify does not
                supervise, direct, or control any service provider. The Seller is solely responsible
                for the scope, quality, timeliness, and safety of any service or rental they provide.
                Tourify makes no representations about any Seller&apos;s qualifications, licensure,
                insurance, or fitness to perform any service.
              </li>
              <li>
                <strong>No Agency or Employment Relationship:</strong> Nothing in these Terms or the use
                of the Marketplace creates an employment, agency, joint venture, or partnership
                relationship between Tourify and any user. Sellers offering services through the
                Marketplace are independent third parties, not employees, agents, or contractors of
                Tourify.
              </li>
              <li>
                <strong>Storefront Customization:</strong> Sellers may customize the appearance of their
                marketplace storefront, including themes, colors, layouts, effects, display names, taglines,
                and product images. Tourify does not review, approve, or endorse customized storefront
                content. Sellers are solely responsible for ensuring their storefront content does not
                infringe third-party rights, contain misleading information, or violate applicable law.
              </li>
              <li>
                <strong>External Links:</strong> Sellers may add links to external websites on their
                storefronts. Tourify does not control, endorse, or assume responsibility for the content,
                privacy practices, or availability of any external websites linked from a Seller&apos;s
                storefront. Accessing external links is at your own risk.
              </li>
              <li>
                <strong>Assumption of Risk:</strong> By purchasing items or services through the
                Marketplace, you acknowledge and accept the inherent risks associated with transactions
                between private parties, including the risk of fraud, misrepresentation, non-delivery,
                or unsatisfactory quality. You agree that Tourify bears no responsibility for these risks.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">8. Ticketing &amp; Events</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify provides tools for event creation, ticket sales, RSVPs, and event management.
              Event organizers are solely responsible for the accuracy of event details, ticket
              pricing, capacity limits, and compliance with local regulations. Tourify does not
              guarantee that events will occur as described and is not liable for event cancellations,
              changes, or attendee experiences. Refund policies for ticketed events are the sole
              responsibility of the event organizer.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">9. Contracts &amp; E-Signatures</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service provides tools for creating, sending, and electronically signing contracts
              and agreements between parties. Tourify facilitates these workflows but is{" "}
              <strong>not a party</strong> to any agreement between users. Tourify does not provide
              legal advice and makes no representations regarding the legal validity, enforceability,
              or sufficiency of any contract created through the Service. Users are strongly encouraged
              to consult independent legal counsel.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">10. Third-Party Content &amp; RSS Feeds</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service aggregates and displays content from third-party sources, including RSS
              feeds from music publications and news outlets (&quot;Third-Party Content&quot;).
              Third-Party Content is provided for informational purposes only. Tourify does not
              create, endorse, verify, or guarantee the accuracy of Third-Party Content and is not
              responsible for any errors, omissions, or harm resulting from such content. Links to
              external websites are provided as a convenience; Tourify is not responsible for the
              content or practices of linked sites.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">11. Messaging &amp; Communications</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service provides messaging and communication features, including direct messages,
              group chats, and notifications (email, push, in-app). You agree not to use messaging
              features to send spam, harassment, or unsolicited commercial communications. Tourify
              is not responsible for the content of messages between users. Tourify may send you
              transactional emails, security alerts, and product updates. You may manage notification
              preferences in your account settings.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">12. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed">
              The Service and its original content (excluding User Content), features, functionality,
              design, trademarks, trade names, logos, and source code are and shall remain the
              exclusive property of Tourify App LLC and its licensors, protected by copyright,
              trademark, patent, trade secret, and other intellectual property laws of the United
              States and foreign jurisdictions. Nothing in these Terms grants you any right to use
              the Tourify name, logo, or trademarks without prior written consent.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">13. DMCA &amp; Copyright Complaints</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify respects the intellectual property rights of others and complies with the
              Digital Millennium Copyright Act (&quot;DMCA&quot;). If you believe that your
              copyrighted work has been copied or used in a way that constitutes copyright
              infringement, please send a DMCA takedown notice to our designated agent at{" "}
              <a href="mailto:legal@tourify.app" className="text-purple-400 hover:text-purple-300">legal@tourify.app</a>.
              Repeat infringers may have their accounts terminated.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">14. Disclaimer of Warranties</h2>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS,
              WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
              TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, OR COURSE OF PERFORMANCE. TOURIFY APP LLC DOES NOT WARRANT THAT
              (A) THE SERVICE WILL FUNCTION UNINTERRUPTED, SECURE, OR AVAILABLE AT ANY PARTICULAR
              TIME OR LOCATION; (B) ANY ERRORS OR DEFECTS WILL BE CORRECTED; (C) THE SERVICE IS
              FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; OR (D) THE RESULTS OF USING THE SERVICE
              WILL MEET YOUR REQUIREMENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">15. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TOURIFY APP LLC,
              ITS MEMBERS, MANAGERS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR AFFILIATES
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
              DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL,
              DATA, USE, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH: (A) YOUR
              ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE SERVICE; (B) ANY CONDUCT OR
              CONTENT OF ANY THIRD PARTY ON THE SERVICE, INCLUDING BUT NOT LIMITED TO DEFAMATORY,
              OFFENSIVE, OR ILLEGAL CONDUCT; (C) ANY USER CONTENT OR THIRD-PARTY CONTENT ACCESSED
              THROUGH THE SERVICE; (D) ANY TRANSACTIONS CONDUCTED THROUGH THE MARKETPLACE, INCLUDING
              ITEMS OR SERVICES PURCHASED OR SOLD; (E) ANY FINANCIAL LOSSES FROM CHARGEBACKS, PAYMENT
              DISPUTES, OR STRIPE PROCESSING; (F) ANY CONTRACTS, AGREEMENTS, OR E-SIGNATURES CREATED
              THROUGH THE SERVICE; (G) ANY EVENTS, TICKET SALES, OR ATTENDANCE ISSUES; (H) ANY
              ACTIONS OR OMISSIONS OF OTHER USERS; (I) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR
              DATA OR TRANSMISSIONS; (J) ANY SERVICES, RENTALS, OR COMMISSION WORK OBTAINED THROUGH
              THE MARKETPLACE, INCLUDING THE QUALITY, SAFETY, TIMELINESS, OR LEGALITY THEREOF; (K) ANY
              CONTENT, APPEARANCE, OR CUSTOMIZATION OF USER STOREFRONTS, INCLUDING THEMES, EFFECTS,
              IMAGES, OR DESCRIPTIONS CHOSEN BY SELLERS; (L) ANY EXTERNAL WEBSITES LINKED FROM USER
              STOREFRONTS OR PROFILES; OR (M) ANY OTHER MATTER RELATING TO THE SERVICE.
            </p>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide mt-3">
              IN NO EVENT SHALL TOURIFY APP LLC&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS
              ARISING FROM OR RELATED TO THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU HAVE
              PAID TO TOURIFY IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED
              U.S. DOLLARS ($100.00). THE LIMITATIONS IN THIS SECTION APPLY REGARDLESS OF THE THEORY
              OF LIABILITY, WHETHER BASED IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY,
              OR OTHERWISE, AND EVEN IF TOURIFY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">16. Indemnification</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to defend, indemnify, and hold harmless Tourify App LLC, its members,
              managers, officers, employees, agents, and affiliates from and against any and all
              claims, damages, obligations, losses, liabilities, costs, and expenses (including
              reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) your
              violation of these Terms; (c) your violation of any third-party right, including
              intellectual property, privacy, or publicity rights; (d) your User Content; (e) any
              dispute between you and another user of the Service; (f) any Marketplace listings, items,
              services, rentals, or commissions you offer or purchase; (g) any content, customization,
              or external links on your storefront; (h) any tax obligations arising from your use of
              the Marketplace; or (i) any claim by a third party arising from services you performed or
              goods you sold through the Service.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">17. Dispute Resolution &amp; Arbitration</h2>
            <p className="text-slate-300 leading-relaxed">
              Any dispute, controversy, or claim arising out of or relating to these Terms or the
              Service shall first be attempted to be resolved through good-faith negotiation. If
              the dispute cannot be resolved within thirty (30) days, it shall be submitted to
              binding arbitration administered by the American Arbitration Association (&quot;AAA&quot;)
              under its Commercial Arbitration Rules. The arbitration shall take place in Clark
              County, Nevada. Judgment on the arbitration award may be entered in any court of
              competent jurisdiction.
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              <strong>Class Action Waiver:</strong> You agree that any arbitration or proceeding shall
              be conducted only on an individual basis and not as a class, consolidated, or
              representative action. You waive any right to participate in a class action lawsuit or
              class-wide arbitration.
            </p>
          </section>

          {/* 18 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">18. Governing Law</h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Nevada, United States of America, without regard to its conflict of law
              provisions. To the extent that arbitration is not applicable, you consent to the
              exclusive jurisdiction of the state and federal courts located in Clark County, Nevada.
            </p>
          </section>

          {/* 19 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">19. Termination</h2>
            <p className="text-slate-300 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without
              prior notice or liability, for any reason, including breach of these Terms. Upon
              termination: (a) your right to use the Service ceases immediately; (b) we may delete
              your account data after a reasonable retention period; (c) provisions of these Terms
              that by their nature should survive termination shall survive, including but not limited
              to ownership provisions, warranty disclaimers, indemnity, limitations of liability,
              and dispute resolution provisions. You may request account deletion at any time through
              your account settings or by contacting us.
            </p>
          </section>

          {/* 20 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">20. Modifications to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify reserves the right to modify these Terms at any time. If we make material
              changes, we will notify you by email and/or by posting a prominent notice on the
              Service at least thirty (30) days before the changes take effect. Your continued use
              of the Service after the effective date of any modifications constitutes your acceptance
              of the updated Terms. If you do not agree to the revised Terms, you must stop using the
              Service and may request account deletion.
            </p>
          </section>

          {/* 21 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">21. Severability</h2>
            <p className="text-slate-300 leading-relaxed">
              If any provision of these Terms is held to be invalid, illegal, or unenforceable, the
              remaining provisions shall continue in full force and effect. The invalid provision
              shall be modified to the minimum extent necessary to make it valid and enforceable
              while preserving its original intent.
            </p>
          </section>

          {/* 22 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">22. Force Majeure</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify App LLC shall not be liable for any failure or delay in performing its obligations
              under these Terms where such failure or delay results from causes beyond its reasonable
              control, including but not limited to acts of God, natural disasters, pandemics, epidemics,
              war, terrorism, riots, civil unrest, government actions or orders, labor disputes, strikes,
              power outages, internet or telecommunications failures, cyberattacks, or failures of
              third-party service providers (including Stripe, Supabase, Vercel, cloud hosting providers,
              and other infrastructure partners). During the period of such force majeure, Tourify&apos;s
              obligations under these Terms shall be suspended, and Tourify shall not be liable for any
              damages, losses, or costs resulting therefrom.
            </p>
          </section>

          {/* 23 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">23. Entire Agreement</h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms, together with the{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>{" "}
              and the{" "}
              <Link href="/marketplace/seller-agreement" className="text-purple-400 hover:text-purple-300">
                Marketplace Seller Agreement
              </Link>{" "}
              (if applicable), constitute the entire agreement between you and Tourify App LLC
              regarding the Service and supersede all prior agreements, understandings, and
              communications, whether written or oral.
            </p>
          </section>

          {/* 24 */}
          <section>
            <h2 className="text-2xl font-semibold text-white">24. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300 text-sm space-y-1">
              <p><strong className="text-white">Tourify App LLC</strong></p>
              <p>Las Vegas, Nevada, United States</p>
              <p>
                Email:{" "}
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
            <Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link>
            <Link href="/marketplace/seller-agreement" className="text-slate-400 hover:text-white">Seller Agreement</Link>
            <Link href="/" className="text-slate-400 hover:text-white">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
