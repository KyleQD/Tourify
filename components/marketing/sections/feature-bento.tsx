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

const spans: Record<string, string> = {
  tours: "lg:col-span-2",
  analytics: "lg:col-span-2",
  messaging: "lg:col-span-2",
  "profiles-epk": "lg:col-span-2",
}

export function FeatureBento() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The platform"
          title={
            <>
              Everything a show needs, <GradientText>working together</GradientText>
            </>
          }
          description="Ten connected tools. Each one is useful alone and better beside the others. Every badge shows exactly where a feature stands today."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
          {features.map((f) => {
            const a = accents[f.accent]
            return (
              <StaggerItem key={f.slug} className={cn(spans[f.slug])}>
                <SpotlightCard color={`${a.hex}33`} className="h-full">
                  <Link
                    href={`/features/${f.slug}`}
                    className="flex h-full flex-col gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", a.bg, a.border)}>
                        <f.icon className={cn("h-5 w-5", a.text)} aria-hidden />
                      </span>
                      <StatusBadge status={f.status} />
                    </div>
                    <FeaturePreview slug={f.slug} />
                    <div className="mt-auto">
                      <h3 className="flex items-center gap-1.5 text-lg font-semibold text-white">
                        {f.title}
                        <ArrowUpRight
                          className="h-4 w-4 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                          aria-hidden
                        />
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.summary}</p>
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
