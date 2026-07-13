import { Metadata } from "next"
import { LEGAL_EMAIL, SELLER_AGREEMENT_VERSION } from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"

export const metadata: Metadata = {
  title: "Marketplace Seller Agreement | Tourify",
  description: "Terms and conditions for sellers on the Tourify Marketplace — Tourify App LLC",
}

export default function SellerAgreementPage() {
  return (
    <LegalPageShell
      title="Marketplace Seller Agreement"
      version={SELLER_AGREEMENT_VERSION}
      currentPath="/marketplace/seller-agreement"
    >
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Introduction and Acceptance</h2>
        <p className="text-slate-300 leading-relaxed">
          This Marketplace Seller Agreement (&quot;Seller Agreement&quot;) is a legally binding agreement between you
          and <strong>Tourify App LLC</strong> (&quot;Tourify&quot;). It governs your use of the Tourify Marketplace
          as a seller. By listing items, connecting Stripe, or publishing listings, you agree to this Seller
          Agreement plus the Tourify <LegalLink href="/terms">Terms of Service</LegalLink> and{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Tourify&apos;s Role as Marketplace Facilitator</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify operates as a marketplace facilitator and technology platform only. Tourify is <strong>not a
          party</strong> to buyer-seller transactions, does not take title to listed items, and does not guarantee
          quality, safety, legality, or availability of listings. Sellers are solely responsible for listings,
          pricing, fulfillment, and compliance.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. Service Fee Structure</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify charges a <strong>10% service fee</strong> added to the buyer&apos;s total (subject to change with
          notice). Sellers receive their listed price; applicable sales tax compliance is the seller&apos;s responsibility.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. Seller Eligibility and Obligations</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-2 mt-3">
          <li>You are at least 18 and legally able to contract.</li>
          <li>Listings are accurate, complete, and not misleading.</li>
          <li>You have rights to sell listed items and services.</li>
          <li>You fulfill orders promptly and handle inquiries, refunds, and returns.</li>
          <li>You comply with consumer protection, tax, IP, and product safety laws.</li>
          <li>You maintain a connected Stripe account in good standing.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">5. Permitted &amp; Prohibited Items</h2>
        <p className="text-slate-300 leading-relaxed">
          Permitted items include music, merchandise, digital goods, services, rentals, and commissions as allowed
          by law and Stripe policies. Prohibited items include illegal goods, counterfeits, IP-infringing items,
          weapons, drugs, hateful content, misrepresented goods, and items on Stripe&apos;s Restricted Businesses list.
          Tourify may remove listings without notice.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">6. Storefront Customization &amp; External Links</h2>
        <p className="text-slate-300 leading-relaxed">
          You are solely responsible for storefront content, themes, images, and external links. Tourify does not
          review or endorse storefront content and is not liable for third-party sites you link to.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">7. Services, Rentals &amp; Commission Work</h2>
        <p className="text-slate-300 leading-relaxed">
          Sellers offering services or rentals are solely responsible for scope, quality, safety, timeliness, licenses,
          insurance, and any injury or damage arising from performance. Tourify does not verify credentials.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">8. Third-Party Fulfillment (Shopify, Printful &amp; Others)</h2>
        <p className="text-slate-300 leading-relaxed">
          If you connect third-party fulfillment or inventory integrations (e.g., Shopify, Printful), you authorize
          data sharing necessary to sync listings and fulfill orders. Fulfillment, shipping, quality, and customer
          service for integrated orders remain your responsibility. Tourify is not liable for integration downtime,
          sync errors, shipping delays, lost packages, or product defects handled by third-party fulfillment providers.
          Disputes regarding physical goods fulfilled by third parties are between you and the buyer (and the
          fulfillment provider as applicable).
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">9. Independent Contractor Status</h2>
        <p className="text-slate-300 leading-relaxed">
          You are an independent third party, not an employee, agent, or partner of Tourify App LLC. You are
          responsible for your own taxes, insurance, and regulatory compliance.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">10. Payments, Stripe Connect &amp; Chargebacks</h2>
        <p className="text-slate-300 leading-relaxed">
          Payments are processed through Stripe. You agree to Stripe&apos;s{" "}
          <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
            Connected Account Agreement
          </a>.
          Tourify is not responsible for payout delays, holds, or account restrictions. You bear chargeback fees and
          losses arising from your sales.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">11. Refunds and Disputes</h2>
        <p className="text-slate-300 leading-relaxed">
          You must communicate refund policies clearly. Buyer-seller disputes should be resolved directly. Tourify
          may assist at its discretion but has no obligation to mediate and is not liable for dispute outcomes.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">12. Intellectual Property</h2>
        <p className="text-slate-300 leading-relaxed">
          You warrant rights to listed content. You grant Tourify a limited license to display listings to operate the
          Marketplace. Report infringement to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className="text-purple-400 hover:text-purple-300">{LEGAL_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">13. Limitation of Liability</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOURIFY APP LLC SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSSES ARISING FROM LISTINGS, BUYER DISPUTES,
          CHARGEBACKS, FULFILLMENT INTEGRATIONS, STOREFRONT CONTENT, OR SERVICE INTERRUPTIONS. TOURIFY&apos;S
          AGGREGATE LIABILITY SHALL NOT EXCEED SERVICE FEES COLLECTED FROM YOUR TRANSACTIONS IN THE SIX (6) MONTHS
          PRECEDING THE CLAIM.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">14. Indemnification</h2>
        <p className="text-slate-300 leading-relaxed">
          You indemnify Tourify against claims arising from your listings, storefront, fulfillment integrations,
          tax obligations, buyer disputes, services performed, injuries from rentals or services, and breach of this
          Agreement or the Terms of Service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">15. Suspension and Termination</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify may suspend or terminate seller access for violations, fraud, excessive disputes, or prohibited
          listings. Pending orders must still be fulfilled where applicable.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">16. Modifications</h2>
        <p className="text-slate-300 leading-relaxed">
          Material changes will be notified at least 30 days before effectiveness. Continued Marketplace use
          constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">17. Governing Law &amp; Arbitration</h2>
        <p className="text-slate-300 leading-relaxed">
          Nevada law governs. Disputes proceed to AAA arbitration in Clark County, Nevada, on an individual basis
          with a class action waiver.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">18. Disclaimer of Warranties</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          THE MARKETPLACE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. YOUR USE AS A SELLER IS AT
          YOUR SOLE RISK.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">19. Contact</h2>
        <LegalContactBlock email={LEGAL_EMAIL} />
      </section>
    </LegalPageShell>
  )
}
