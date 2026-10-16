import { MarketingShell } from "@/components/marketing/nav/marketing-shell"
import { Hero } from "@/components/marketing/sections/hero"
import { CapabilityMarquee } from "@/components/marketing/sections/capability-marquee"
import { ProblemSolution } from "@/components/marketing/sections/problem-solution"
import { FeatureBento } from "@/components/marketing/sections/feature-bento"
import { TourMap } from "@/components/marketing/sections/tour-map"
import { PersonaTabs } from "@/components/marketing/sections/persona-tabs"
import { AnalyticsShowcase } from "@/components/marketing/sections/analytics-showcase"
import { WorkflowTimeline } from "@/components/marketing/sections/workflow-timeline"
import { CommsWorkforce } from "@/components/marketing/sections/comms-workforce"
import { EcosystemOrbit } from "@/components/marketing/sections/ecosystem-orbit"
import { Roadmap } from "@/components/marketing/sections/roadmap"
import { Faq } from "@/components/marketing/sections/faq"
import { FinalCta } from "@/components/marketing/sections/final-cta"

export function TourifyLandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <CapabilityMarquee />
      <ProblemSolution />
      <FeatureBento />
      <TourMap />
      <PersonaTabs />
      <AnalyticsShowcase />
      <WorkflowTimeline />
      <CommsWorkforce />
      <EcosystemOrbit />
      <Roadmap />
      <Faq />
      <FinalCta />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Tourify",
            url: "https://tourify.live",
            description: "A platform where artists, venues, crews, promoters, organizers and fans plan, book and experience live events.",
          }),
        }}
      />
    </MarketingShell>
  )
}
