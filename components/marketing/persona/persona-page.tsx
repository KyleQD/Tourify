import Link from "next/link"
import { ArrowRight, ExternalLink, X, Check } from "lucide-react"
import { MarketingShell } from "@/components/marketing/nav/marketing-shell"
import { BETA_URL } from "@/components/marketing/nav/site-header"
import { AuroraBg } from "@/components/marketing/motion/aurora-bg"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { SpotlightCard } from "@/components/marketing/motion/spotlight-card"
import { SectionHeading } from "@/components/marketing/section-heading"
import { StatusBadge } from "@/components/marketing/status-badge"
import { FeaturePreview } from "@/components/marketing/feature-previews"
import { FaqList } from "@/components/marketing/faq-list"
import { FinalCta } from "@/components/marketing/sections/final-cta"
import { PersonaWidget } from "@/components/marketing/persona/persona-widget"
import { accents } from "@/lib/marketing/accent"
import { getFeature } from "@/lib/marketing/features"
import { personas, type Persona } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

export function PersonaPage({ persona }: { persona: Persona }) {
  const a = accents[persona.accent]
  const firstFeature = getFeature(persona.features[0]?.slug ?? "")
  const others = personas.filter((p) => p.slug !== persona.slug)

  return (
    <MarketingShell>
      <section className="relative isolate overflow-hidden pb-20 pt-16 sm:pt-24">
        <AuroraBg colors={[a.glow, "bg-blue-600/20", "bg-fuchsia-600/15"]} />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-400">
              <Link href="/solutions" className="hover:text-white">
                Solutions
              </Link>
              <span className="mx-2" aria-hidden>
                /
              </span>
              <span className="text-slate-200">{persona.name}</span>
            </nav>
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", a.bg, a.border, a.text)}>
              <persona.icon className="h-3.5 w-3.5" aria-hidden />
              Tourify for {persona.name.toLowerCase()}
            </span>
            <h1 className="mt-5 text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {persona.headline[0]}
              <br />
              <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", a.gradientText)}>{persona.headline[1]}</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-300">{persona.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#get-started"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Create your free account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href={BETA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Try the Beta <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/40 backdrop-blur">
              <div className={cn("pointer-events-none absolute -inset-px rounded-3xl opacity-40 blur-2xl", a.glow)} aria-hidden />
              <div className="relative">
                {firstFeature && (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{firstFeature.title}</p>
                      <StatusBadge status={firstFeature.status} />
                    </div>
                    <FeaturePreview slug={firstFeature.slug} />
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Before and after" title={<>Less juggling, more {persona.name.toLowerCase()} work</>} />
          <Stagger className="mt-12 space-y-4" stagger={0.12}>
            {persona.pains.map((p) => (
              <StaggerItem key={p.before}>
                <div className="grid overflow-hidden rounded-2xl border border-white/10 md:grid-cols-2">
                  <div className="flex gap-3 bg-white/[0.02] p-5 text-slate-400">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden />
                    <p>{p.before}</p>
                  </div>
                  <div className={cn("flex gap-3 p-5 text-white", a.bg)}>
                    <Check className={cn("mt-0.5 h-5 w-5 shrink-0", a.text)} aria-hidden />
                    <p>{p.after}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What you get" title={<>Tools that fit how you work</>} />
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
            {persona.features.map((pf) => {
              const f = getFeature(pf.slug)
              if (!f) return null
              return (
                <StaggerItem key={pf.slug}>
                  <Link href={`/features/${f.slug}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded-2xl">
                    <SpotlightCard className="h-full p-6">
                      <div className="flex items-center justify-between">
                        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", a.bgStrong)}>
                          <f.icon className={cn("h-5 w-5", a.text)} aria-hidden />
                        </span>
                        <StatusBadge status={f.status} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{pf.body}</p>
                    </SpotlightCard>
                  </Link>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">A day in the life</p>
            <h2 className="mt-3 text-balance text-3xl font-bold sm:text-4xl">How a day could look</h2>
            <ol className="mt-8 space-y-6 border-l border-white/10 pl-6">
              {persona.day.map((d) => (
                <Reveal as="li" key={d.time} className="relative">
                  <span className={cn("absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ring-4 ring-slate-950", a.solid)} aria-hidden />
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", a.text)}>{d.time}</p>
                  <h3 className="mt-1 font-semibold text-white">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{d.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal>
            <PersonaWidget slug={persona.slug} title={persona.widgetTitle} body={persona.widgetBody} />
          </Reveal>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title={<>Questions from {persona.name.toLowerCase()}</>} />
          <div className="mt-12">
            <FaqList items={persona.faqs} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-10" aria-label="Other solutions">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4">
          <span className="mr-2 text-sm text-slate-500">Not you?</span>
          {others.map((p) => (
            <Link
              key={p.slug}
              href={`/solutions/${p.slug}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              )}
            >
              <p.icon className={cn("h-3.5 w-3.5", accents[p.accent].text)} aria-hidden />
              {p.name}
            </Link>
          ))}
        </div>
      </section>

      <FinalCta
        title={<>Ready to try Tourify as {persona.name.toLowerCase().replace(/s$/, "")} ?</>}
        description="Create a free account and explore the open beta."
      />
    </MarketingShell>
  )
}
