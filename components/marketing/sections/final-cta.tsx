"use client"

import Link from "next/link"
import { ArrowRight, ExternalLink } from "lucide-react"
import { AuroraBg } from "@/components/marketing/motion/aurora-bg"
import { Magnetic } from "@/components/marketing/motion/magnetic"
import { Reveal } from "@/components/marketing/motion/reveal"
import { GradientText } from "@/components/marketing/section-heading"

const BETA_URL = "https://demo.tourify.live"

export function FinalCta({
  title,
  description = "Create a free account and try Tourify in the open beta.",
  primaryLabel = "Create your free account",
}: {
  title?: React.ReactNode
  description?: string
  primaryLabel?: string
}) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] py-28">
      <AuroraBg />
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {title ?? (
            <>
              Ready for your next <GradientText>show?</GradientText>
            </>
          )}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-slate-300">{description}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <Link
              href="/#get-started"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-slate-950 shadow-xl shadow-white/10 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Magnetic>
          <Magnetic>
            <a
              href={BETA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Try the Beta
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  )
}
