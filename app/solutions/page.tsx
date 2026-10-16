import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MarketingShell } from "@/components/marketing/nav/marketing-shell"
import { AuroraBg } from "@/components/marketing/motion/aurora-bg"
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { SpotlightCard } from "@/components/marketing/motion/spotlight-card"
import { GradientText } from "@/components/marketing/section-heading"
import { FinalCta } from "@/components/marketing/sections/final-cta"
import { accents } from "@/lib/marketing/accent"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Solutions",
  description: "Tourify for artists, tour managers, venues, event organizers, crew, promoters and fans.",
  alternates: { canonical: "/solutions" },
}

export default function SolutionsIndex() {
  return (
    <MarketingShell>
      <section className="relative isolate overflow-hidden pb-12 pt-20 text-center sm:pt-28">
        <AuroraBg />
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Solutions</p>
          <h1 className="mt-4 text-balance text-5xl font-bold tracking-tight sm:text-6xl">
            One platform, <GradientText>seven ways in</GradientText>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-slate-300">
            Choose the role that matches how you work to see what Tourify does for you.
          </p>
        </div>
      </section>
      <section className="pb-24">
        <Stagger className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8" stagger={0.07}>
          {personas.map((p) => {
            const a = accents[p.accent]
            return (
              <StaggerItem key={p.slug}>
                <Link href={`/solutions/${p.slug}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <SpotlightCard className="h-full p-6">
                    <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.bgStrong)}>
                      <p.icon className={cn("h-5 w-5", a.text)} aria-hidden />
                    </span>
                    <h2 className="mt-4 text-xl font-semibold text-white">{p.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.tagline}</p>
                    <span className={cn("mt-5 inline-flex items-center gap-1.5 text-sm font-medium", a.text)}>
                      Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                    </span>
                  </SpotlightCard>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>
      <FinalCta />
    </MarketingShell>
  )
}
