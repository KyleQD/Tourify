import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { SectionHeading, GradientText } from "@/components/marketing/section-heading"
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { SpotlightCard } from "@/components/marketing/motion/spotlight-card"
import { StatusBadge } from "@/components/marketing/status-badge"
import { FeaturePreview } from "@/components/marketing/feature-previews"
import { accents } from "@/lib/marketing/accent"
import { features } from "@/lib/marketing/features"
import { cn } from "@/lib/utils"

const wide = new Set(["tours", "analytics"])

export function FeatureBento() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The platform"
          title={
            <>
              Ten tools. <GradientText>One source of truth.</GradientText>
            </>
          }
          description="Every date, ticket, shift and message is tied to the show it belongs to. Change a set time once and every person who needs it sees it."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-4" stagger={0.06}>
          {features.map((f) => {
            const a = accents[f.accent]
            return (
              <StaggerItem key={f.slug} className={cn(wide.has(f.slug) && "lg:col-span-2")}>
                <SpotlightCard color={`${a.hex}33`} className="group h-full">
                  <Link
                    href={`/features/${f.slug}`}
                    className="flex h-full flex-col gap-5 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", a.bg, a.border)}>
                          <f.icon className={cn("h-4 w-4", a.text)} aria-hidden />
                        </span>
                        <span className="text-sm font-semibold leading-tight text-white">{f.title}</span>
                      </span>
                      <StatusBadge status={f.status} className="shrink-0 whitespace-nowrap" />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-relaxed text-slate-400 text-pretty">{f.summary}</p>
                      <ArrowUpRight
                        className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                        aria-hidden
                      />
                    </div>
                    <div className="flex-1 [&>div]:h-full">
                      <FeaturePreview slug={f.slug} />
                    </div>
                  </Link>
                </SpotlightCard>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
