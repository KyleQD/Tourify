import { Metadata } from "next"
import { LEGAL_EMAIL } from "@/components/legal/legal-constants"
import {
  LegalContactBlock,
  LegalLink,
  LegalPageShell,
} from "@/components/legal/legal-page-shell"
import { MUSIC_TRAINING_RESERVATION_POLICY_VERSION } from "@/lib/music-rights/training-reservation"

export const metadata: Metadata = {
  title: "Music AI Training Reservation | Tourify",
  description:
    "Tourify rights reservation policy for AI model training and dataset use of hosted music — Tourify App LLC",
}

export default function MusicTrainingReservationPage() {
  return (
    <LegalPageShell
      title="Music AI Training Reservation"
      version={MUSIC_TRAINING_RESERVATION_POLICY_VERSION}
      currentPath="/legal/music-training-reservation"
    >
      <section>
        <h2 className="text-2xl font-semibold text-white">1. Purpose</h2>
        <p className="text-slate-300 leading-relaxed">
          This page states Tourify&apos;s default reservation against AI model training, dataset
          inclusion, and similar machine-learning uses of music hosted on the Service, unless a
          separate written license from the rights holder authorizes that use. These signals express
          rights and preferences; they are not a guarantee of technical enforcement against every
          noncompliant scraper or model trainer.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">2. Default reservation</h2>
        <p className="text-slate-300 leading-relaxed">
          Unless an asset is explicitly marked otherwise in product metadata and a written license
          is in place, Tourify and rights holders reserve all rights to prohibit AI training and
          related machine-learning uses of uploaded music, stems, lyrics excerpts stored for rights
          workflows, and protected derivatives.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">3. Tourify and vendors</h2>
        <p className="text-slate-300 leading-relaxed">
          Tourify and its vendors do not use artist uploads for foundation-model training without a
          separate opt-in. Operational processing for delivery, moderation, fingerprinting, and
          rights workflows is governed by the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> and applicable product terms.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">4. Machine-readable signals</h2>
        <p className="text-slate-300 leading-relaxed">
          Supplemental crawler and TDM reservation signals may be published at{" "}
          <LegalLink href="/.well-known/tdmrep.json">/.well-known/tdmrep.json</LegalLink> and in
          robots rules after legal and technical review. Asset-level permission state may appear in
          Rights Passport / C2PA assertions when those features are enabled.
        </p>
      </section>

      <section id="licensing-contact">
        <h2 className="text-2xl font-semibold text-white">5. Licensing contact</h2>
        <p className="text-slate-300 leading-relaxed">
          For written AI-training or dataset license requests, contact the rights holder through
          their Tourify licensing channels when available, or email{" "}
          <a className="text-purple-300 hover:text-purple-200" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>{" "}
          for routing. Tourify is not the copyright office and does not grant licenses it does not
          control.
        </p>
      </section>

      <LegalContactBlock />
    </LegalPageShell>
  )
}
