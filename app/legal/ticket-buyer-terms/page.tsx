import { Metadata } from "next"
import { LEGAL_EMAIL, TICKET_BUYER_TERMS_VERSION } from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"

export const metadata: Metadata = {
  title: "Ticket Buyer Terms | Tourify",
  description: "Terms for purchasing event tickets through Tourify — Tourify App LLC",
}

export default function TicketBuyerTermsPage() {
  return (
    <LegalPageShell
      title="Ticket Buyer Terms"
      version={TICKET_BUYER_TERMS_VERSION}
      currentPath="/legal/ticket-buyer-terms"
    >
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Scope &amp; Incorporation</h2>
        <p className="text-slate-300 leading-relaxed">
          These Ticket Buyer Terms (&quot;Buyer Terms&quot;) supplement the Tourify{" "}
          <LegalLink href="/terms">Terms of Service</LegalLink> and apply when you purchase, receive, transfer, or
          use tickets through the Service. By completing a ticket purchase, you agree to these Buyer Terms and any
          organizer-specific terms and refund policy displayed at checkout.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Tourify&apos;s Role</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify provides ticketing technology. <strong>The event organizer is the merchant of record</strong> for
          your ticket purchase. Tourify is not the event promoter, venue operator, or ticket seller except as a
          technology and fee-collection facilitator. Tourify does not guarantee that events will occur, match
          descriptions, or meet your expectations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. Pricing, Fees &amp; Taxes</h2>
        <p className="text-slate-300 leading-relaxed">
          Ticket face value, platform fees, processing fees, and applicable taxes are disclosed at checkout before
          payment. All amounts are charged in the currency displayed. You authorize Tourify and its payment
          processors to charge your selected payment method for the total shown.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. Refunds &amp; Cancellations</h2>
        <p className="text-slate-300 leading-relaxed">
          Refund eligibility is governed by the <strong>event organizer&apos;s refund policy</strong> displayed at
          checkout and by applicable law. Tourify does not guarantee refunds. If an event is cancelled,
          postponed, or materially changed, refund remedies are determined by the organizer unless otherwise required
          by law. Contact the organizer for refund requests; Tourify may assist operationally but has no obligation
          to issue refunds from its own funds.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">5. Transfers, Resale &amp; Credentials</h2>
        <p className="text-slate-300 leading-relaxed">
          Transfer and resale rules are set by the organizer. Unauthorized duplication, scalping where prohibited,
          or sharing QR codes, barcodes, or wallet credentials may void tickets without refund. You are responsible
          for safeguarding ticket credentials until used or transferred per organizer rules.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">6. Event Attendance &amp; Assumption of Risk</h2>
        <p className="text-slate-300 leading-relaxed">
          Attending live events involves inherent risks including crowd conditions, noise, weather, and third-party
          conduct. You assume all risks of attendance. The organizer and venue—not Tourify—are responsible for event
          safety, security, capacity, and compliance with local regulations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">7. Chargebacks &amp; Payment Disputes</h2>
        <p className="text-slate-300 leading-relaxed">
          Initiating a chargeback without a valid reason may result in ticket cancellation and account restrictions.
          Chargebacks may be passed through to organizers per payment processor rules. Tourify is not liable for
          payment processor decisions.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">8. Limitation of Liability</h2>
        <p className="text-slate-300 leading-relaxed uppercase text-sm tracking-wide">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOURIFY APP LLC IS NOT LIABLE FOR EVENT CANCELLATIONS,
          POSTPONEMENTS, CHANGES, VENUE CONDITIONS, PERSONAL INJURY AT EVENTS, LOST OR STOLEN CREDENTIALS,
          UNAUTHORIZED TRANSFERS, OR ORGANIZER REFUND DECISIONS. TOURIFY&apos;S AGGREGATE LIABILITY FOR TICKETING
          CLAIMS IS LIMITED AS SET FORTH IN THE TERMS OF SERVICE.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">9. Governing Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          Nevada law, arbitration, and class action waiver provisions in the Terms of Service apply to these Buyer
          Terms. If there is a conflict between organizer-specific checkout terms and these Buyer Terms regarding
          organizer obligations, organizer checkout terms control as between you and the organizer; Tourify remains
          a non-party facilitator.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">10. Contact</h2>
        <LegalContactBlock email={LEGAL_EMAIL} />
      </section>
    </LegalPageShell>
  )
}
