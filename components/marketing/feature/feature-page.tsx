import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { MarketingShell } from "@/components/marketing/nav/marketing-shell"
import { AuroraBg } from "@/components/marketing/motion/aurora-bg"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { SectionHeading } from "@/components/marketing/section-heading"
import { StatusBadge } from "@/components/marketing/status-badge"
import { FeaturePreview } from "@/components/marketing/feature-previews"
import { FinalCta } from "@/components/marketing/sections/final-cta"
import { accents } from "@/lib/marketing/accent"
import { features, type Feature } from "@/lib/marketing/features"
import { getPersona } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

export function FeaturePage({ feature }: { feature: Feature }) {
  const a = accents[feature.accent]
  const related = features.filter((f) => f.slug !== feature.slug).slice(0, 3)

  return (
    <MarketingShell>
      <section className="relative isolate overflow-hidden pb-20 pt-16 sm:pt-24">
        <AuroraBg colors={[a.glow, "bg-blue-600/20", "bg-fuchsia-600/15"]} />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-400">
              <Link href="/features" className="hover:text-white">
                Features
              </Link>
              <span className="mx-2" aria-hidden>
                /
              </span>
              <span className="text-slate-200">{feature.title}</span>
            </nav>
            <div className="flex items-center gap-3">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.bgStrong)}>
                <feature.icon className={cn("h-5 w-5", a.text)} aria-hidden />
              </span>
              <StatusBadge status={feature.status} />
            </div>
            <h1 className="mt-5 text-balance text-5xl font-bold tracking-tight sm:text-6xl">{feature.title}</h1>
            <p className="mt-4 text-pretty text-xl text-slate-200">{feature.summary}</p>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-slate-400">{feature.intro}</p>
            <Link
              href="/#get-started"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Create your free account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/40 backdrop-blur">
              <FeaturePreview slug={feature.slug} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title={<>Three steps, no spreadsheets</>} />
          <Stagger className="mt-12 grid gap-5 md:grid-cols-3" stagger={0.12}>
            {feature.steps.map((s, i) => (
              <StaggerItem key={s.title}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold", a.bgStrong, a.text)}>{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Benefits</p>
            <h2 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">What it does for you</h2>
            <ul className="mt-8 space-y-4">
              {feature.benefits.map((b) => (
                <Reveal as="li" key={b} className="flex gap-3 text-slate-200">
                  <Check className={cn("mt-1 h-5 w-5 shrink-0", a.text)} aria-hidden />
                  {b}
                </Reveal>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Who uses it</p>
            <h2 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">Built for these roles</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {feature.personas.map((slug) => {
                const p = getPersona(slug)
                if (!p) return null
                const pa = accents[p.accent]
                return (
                  <li key={slug}>
                    <Link
                      href={`/solutions/${p.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      <p.icon className={cn("h-5 w-5", pa.text)} aria-hidden />
                      <span className="text-sm font-medium text-white">{p.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-slate-950/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold">More from Tourify</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {related.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/features/${f.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <div className="flex items-center justify-between">
                    <f.icon className={cn("h-5 w-5", accents[f.accent].text)} aria-hidden />
                    <StatusBadge status={f.status} />
                  </div>
                  <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{f.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FinalCta />
    </MarketingShell>
  )
}
