import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Marketplace Seller Agreement | Tourify",
  description: "Terms and conditions for sellers on the Tourify Marketplace — Tourify App LLC",
}

const SELLER_AGREEMENT_VERSION = "1.0"

export default function SellerAgreementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            &larr; Back to Tourify
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Marketplace Seller Agreement</h1>
        <p className="text-slate-400 mb-1">Tourify App LLC &mdash; Las Vegas, Nevada</p>
        <p className="text-slate-400 mb-2">Effective Date: April 13, 2026 &nbsp;|&nbsp; Last Updated: April 13, 2026</p>
        <p className="text-slate-500 mb-8 text-sm">Version {SELLER_AGREEMENT_VERSION}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white">1. Introduction and Acceptance</h2>
            <p className="text-slate-300 leading-relaxed">
              This Marketplace Seller Agreement (&quot;Seller Agreement&quot;) is a legally binding agreement
              between you and <strong>Tourify App LLC</strong>, a Nevada limited liability company
              (&quot;Tourify,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              It governs your use of the Tourify Marketplace (&quot;Marketplace&quot;) as a seller.
              By listing items for sale, connecting a Stripe account, or otherwise participating
              in the Marketplace as a seller, you agree to be bound by this Seller Agreement in
              addition to the Tourify{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>.
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              If you do not agree to any part of this Seller Agreement, you may not list items for sale
              on the Marketplace.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">2. Tourify&apos;s Role as Marketplace Facilitator</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify App LLC operates as a marketplace facilitator and technology platform. Tourify is <strong>not
              a party</strong> to any transaction between buyers and sellers. Tourify does not take title to,
              possess, or control any items listed on the Marketplace. Tourify does not guarantee, endorse,
              or warrant the quality, safety, legality, or availability of any items, services, or
              experiences listed by sellers. Tourify does not supervise, direct, or control any seller
              or their business operations.
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              All transactions are directly between the buyer and the seller. The seller is solely
              responsible for the listing, pricing, fulfillment, quality, and legal compliance of all
              items and services they offer through the Marketplace.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">3. Service Fee Structure</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify charges a <strong>10% service fee</strong> that is added on top of the seller&apos;s
              listed price and paid by the buyer. The seller receives 100% of their listed price.
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                <strong>Seller sets the price:</strong> You determine the price for your items or services.
              </li>
              <li>
                <strong>Buyer pays listed price + 10% fee:</strong> For example, if you list an item at $100,
                the buyer pays $110 ($100 to you + $10 service fee to Tourify).
              </li>
              <li>
                <strong>Seller receives full listed price:</strong> You receive the full $100. Tourify
                collects only the $10 service fee from the buyer.
              </li>
              <li>
                <strong>Applicable taxes:</strong> Applicable sales tax may be added separately and is the
                responsibility of the seller to comply with local tax obligations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">4. Seller Eligibility and Obligations</h2>
            <p className="text-slate-300 leading-relaxed">
              As a Marketplace seller, you represent, warrant, and agree that:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                You are at least 18 years of age and have the legal authority to enter into this agreement.
              </li>
              <li>
                All information in your listings is accurate, complete, and not misleading, including descriptions,
                images, pricing, and availability.
              </li>
              <li>
                You have all necessary rights, licenses, and permissions to sell the items or services you list,
                including intellectual property rights.
              </li>
              <li>
                You will fulfill all orders promptly and in accordance with the terms described in your listings.
              </li>
              <li>
                You are responsible for handling buyer inquiries, complaints, refunds, and returns in a
                professional and timely manner.
              </li>
              <li>
                You comply with all applicable local, state, national, and international laws and regulations
                relating to your listings, including but not limited to consumer protection, tax obligations,
                intellectual property, and product safety.
              </li>
              <li>
                You will maintain a connected Stripe account in good standing for receiving payments.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">5. Permitted Items and Services</h2>
            <p className="text-slate-300 leading-relaxed">
              The Marketplace supports the sale of a wide range of items and services, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>Music, beats, stems, and digital audio files</li>
              <li>Event tickets and experiences</li>
              <li>Physical merchandise (apparel, accessories, collectibles)</li>
              <li>Photography prints, digital downloads, and photo sessions</li>
              <li>Fine art (originals, prints, commissions)</li>
              <li>Professional services (DJ services, sound engineering, photography, etc.)</li>
              <li>Equipment and venue rentals</li>
              <li>Digital assets and creative content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">6. Prohibited Items and Conduct</h2>
            <p className="text-slate-300 leading-relaxed">
              You may not list or sell the following through the Marketplace:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>Illegal goods or services, or items that facilitate illegal activity</li>
              <li>Counterfeit, stolen, or unauthorized goods</li>
              <li>Items that infringe on the intellectual property rights of any third party</li>
              <li>Weapons, drugs, or controlled substances</li>
              <li>Discriminatory, hateful, obscene, or harmful content</li>
              <li>Items misrepresented in description, condition, or origin</li>
              <li>Items that violate Stripe&apos;s Restricted Businesses list</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              Tourify reserves the right to remove any listing and suspend any seller account that
              violates these prohibitions at any time, without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">7. Storefront Customization</h2>
            <p className="text-slate-300 leading-relaxed">
              The Marketplace provides tools for you to customize the visual appearance of your storefront,
              including themes, color schemes, layout styles, animation effects, display names, taglines,
              product images, and descriptions. By customizing your storefront, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                You are solely responsible for all content displayed on your storefront, including images,
                text, branding, and any custom visual elements.
              </li>
              <li>
                Tourify does not review, approve, or endorse the content or appearance of any customized
                storefront.
              </li>
              <li>
                Your storefront content must not infringe any third-party intellectual property rights,
                contain false or misleading information, or violate any applicable law.
              </li>
              <li>
                Tourify reserves the right to remove or reset storefront customizations that violate these
                terms or that Tourify deems, in its sole discretion, to be harmful, misleading, or
                inappropriate.
              </li>
              <li>
                Tourify is not liable for any damages, losses, or claims arising from the content or
                appearance of your storefront.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">8. External Links</h2>
            <p className="text-slate-300 leading-relaxed">
              The Marketplace allows you to add links to external websites on your storefront. By adding
              external links, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                You are solely responsible for the content of any external website you link to.
              </li>
              <li>
                External links must not direct users to websites that are fraudulent, malicious, illegal,
                or that violate any third-party rights.
              </li>
              <li>
                Tourify does not control, monitor, endorse, or assume any responsibility for the content,
                privacy practices, or availability of linked external websites.
              </li>
              <li>
                Tourify is not liable for any damages or losses resulting from a user&apos;s interaction
                with any external website linked from your storefront.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">9. Services, Rentals &amp; Commission Work</h2>
            <p className="text-slate-300 leading-relaxed">
              If you offer professional services (e.g., DJ services, photography, sound engineering),
              equipment or venue rentals, or custom commission work through the Marketplace, the following
              additional obligations apply:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                You are solely responsible for the scope, quality, safety, and timeliness of any service
                or rental you provide.
              </li>
              <li>
                You must hold all necessary licenses, permits, insurance, and qualifications required by
                applicable law for the services you offer.
              </li>
              <li>
                You must clearly communicate the scope, terms, and any limitations of your service or
                rental to the buyer before the transaction.
              </li>
              <li>
                You are responsible for any injury, damage, or loss arising from your performance of
                services or the rental of your equipment.
              </li>
              <li>
                Tourify makes no representations about any seller&apos;s qualifications, licensure,
                insurance coverage, or fitness to perform any service. Tourify does not verify credentials
                of any seller.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">10. Independent Contractor Status; No Agency</h2>
            <p className="text-slate-300 leading-relaxed">
              You are an independent third party, not an employee, agent, joint venturer, or partner of
              Tourify App LLC. Nothing in this Seller Agreement or your use of the Marketplace creates
              an employment, agency, or partnership relationship between you and Tourify. You shall not
              represent yourself as an agent or representative of Tourify. You are solely responsible for
              your own tax obligations, insurance, and compliance with labor and employment laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">11. Payments and Stripe Connect</h2>
            <p className="text-slate-300 leading-relaxed">
              All Marketplace payments are processed through Stripe. As a seller, you must connect a
              Stripe Express account to your Tourify account. By doing so, you also agree to Stripe&apos;s{" "}
              <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                Connected Account Agreement
              </a>.
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                Funds from sales are transferred to your connected Stripe account according to Stripe&apos;s
                standard payout schedule.
              </li>
              <li>
                Tourify is not responsible for any delays, holds, or issues with Stripe payouts. Disputes
                regarding payment processing should be directed to Stripe.
              </li>
              <li>
                You are responsible for all tax reporting obligations related to your Marketplace income.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">12. Refunds and Disputes</h2>
            <p className="text-slate-300 leading-relaxed">
              Sellers are responsible for establishing and honoring their own refund policies, which must be
              clearly communicated to buyers. In the event of a dispute between a buyer and seller:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                The buyer and seller should attempt to resolve the dispute directly.
              </li>
              <li>
                Tourify may, at its sole discretion, assist with mediation but is under no obligation to do so.
              </li>
              <li>
                Tourify is not liable for any losses, damages, or costs arising from disputes between
                buyers and sellers.
              </li>
              <li>
                In cases of chargebacks or payment disputes initiated through Stripe, the seller is
                responsible for any associated fees or losses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">13. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed">
              By listing items on the Marketplace, you represent and warrant that you own or have all
              necessary rights to the content and items you sell. You retain ownership of your content
              and intellectual property. You grant Tourify a non-exclusive, worldwide, royalty-free
              license to display, distribute, and promote your listings solely for the purpose of
              operating and marketing the Marketplace.
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              Tourify respects intellectual property rights and will respond to valid takedown notices
              in accordance with applicable law. If you believe a listing infringes your rights, contact
              us at{" "}
              <a href="mailto:legal@tourify.app" className="text-purple-400 hover:text-purple-300">
                legal@tourify.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">14. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TOURIFY APP LLC, ITS MEMBERS,
              MANAGERS, OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>
                Any loss of revenue, profit, data, or business opportunities arising from your use
                of the Marketplace.
              </li>
              <li>
                Any damages resulting from the actions or omissions of buyers, including non-payment,
                chargebacks, or misuse of purchased items.
              </li>
              <li>
                The quality, safety, legality, or delivery of any goods or services sold through
                the Marketplace.
              </li>
              <li>
                Any claims arising from services you performed, rentals you provided, or commission
                work you completed through the Marketplace.
              </li>
              <li>
                Any content, appearance, or customization of your storefront, including themes, effects,
                images, descriptions, or external links.
              </li>
              <li>
                Any indirect, incidental, special, consequential, exemplary, or punitive damages of any kind.
              </li>
              <li>
                Any downtime, technical issues, or service interruptions affecting the Marketplace.
              </li>
            </ul>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide mt-3">
              TOURIFY APP LLC&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF
              OR RELATED TO THIS SELLER AGREEMENT SHALL NOT EXCEED THE TOTAL SERVICE FEES COLLECTED
              BY TOURIFY FROM YOUR TRANSACTIONS IN THE SIX (6) MONTHS PRECEDING THE CLAIM. THE
              LIMITATIONS IN THIS SECTION APPLY REGARDLESS OF THE THEORY OF LIABILITY, WHETHER BASED
              IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, AND EVEN IF
              TOURIFY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">15. Indemnification</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to defend, indemnify, and hold harmless Tourify App LLC, its members, managers,
              officers, employees, agents, and affiliates from and against any and all claims, damages,
              losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising
              out of or related to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>Your listings, items, services, rentals, or commissions offered through the Marketplace</li>
              <li>Any breach of this Seller Agreement or the Tourify Terms of Service</li>
              <li>Any violation of applicable laws or regulations</li>
              <li>Any infringement of third-party intellectual property or other rights</li>
              <li>Any disputes between you and buyers or other third parties</li>
              <li>Any tax liabilities arising from your Marketplace sales</li>
              <li>Any content, customization, or external links on your storefront</li>
              <li>Any injury, damage, or loss arising from services you performed or equipment you rented</li>
              <li>Any claim that you misrepresented your qualifications, licensure, or credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">16. Suspension and Termination</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify reserves the right to suspend or terminate your seller access at any time, with or
              without notice, for any reason, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
              <li>Violation of this Seller Agreement or the Tourify Terms of Service</li>
              <li>Fraudulent, deceptive, or illegal activity</li>
              <li>Excessive buyer complaints, disputes, or chargebacks</li>
              <li>Failure to fulfill orders or provide adequate customer service</li>
              <li>Listing prohibited items or content</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-3">
              Upon termination, any pending orders must still be fulfilled. Tourify will process any
              remaining payouts according to Stripe&apos;s standard procedures, less any amounts owed to
              Tourify or subject to dispute.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">17. Modifications to This Agreement</h2>
            <p className="text-slate-300 leading-relaxed">
              Tourify may modify this Seller Agreement at any time. We will notify sellers of material
              changes at least 30 days before they take effect. Your continued use of the Marketplace
              after the effective date constitutes acceptance of the updated agreement. If you do not
              agree with the changes, you must stop listing items and close your storefront before
              the changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">18. Governing Law and Dispute Resolution</h2>
            <p className="text-slate-300 leading-relaxed">
              This Seller Agreement shall be governed by and construed in accordance with the laws of the
              State of Nevada, United States of America, without regard to its conflict of law provisions.
              Any dispute, controversy, or claim arising out of or relating to this Seller Agreement
              shall first be attempted to be resolved through good-faith negotiation. If the dispute
              cannot be resolved within thirty (30) days, it shall be submitted to binding arbitration
              administered by the American Arbitration Association (&quot;AAA&quot;) under its Commercial
              Arbitration Rules. The arbitration shall take place in Clark County, Nevada.
            </p>
            <p className="text-slate-300 leading-relaxed mt-3">
              <strong>Class Action Waiver:</strong> You agree that any arbitration or proceeding shall
              be conducted only on an individual basis and not as a class, consolidated, or representative
              action. You waive any right to participate in a class action lawsuit or class-wide
              arbitration against Tourify App LLC.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">19. Disclaimer of Warranties</h2>
            <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
              THE MARKETPLACE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS,
              WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TOURIFY APP LLC DOES NOT
              WARRANT THAT THE MARKETPLACE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT
              ANY DEFECTS WILL BE CORRECTED. TOURIFY MAKES NO WARRANTIES OR REPRESENTATIONS REGARDING
              THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY CONTENT OR LISTINGS ON THE MARKETPLACE.
              YOUR USE OF THE MARKETPLACE AS A SELLER IS AT YOUR SOLE RISK.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white">20. Contact Information</h2>
            <p className="text-slate-300 leading-relaxed">
              For questions about this Seller Agreement or the Marketplace, contact us:
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
            <Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link>
            <Link href="/" className="text-slate-400 hover:text-white">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
