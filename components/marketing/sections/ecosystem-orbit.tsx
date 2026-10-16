import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Reveal } from "@/components/marketing/motion/reveal"
import { EcosystemNetwork } from "@/components/marketing/sections/ecosystem-network"

export function EcosystemOrbit() {
  return (
    <section className="border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The ecosystem"
          title={
            <>
              Seven roles. <GradientText>One shared show.</GradientText>
            </>
          }
          description="When an artist confirms a date, the venue's calendar, the crew roster and the fan's ticket page all update together. Pick a role to see the tools it runs on."
        />
        <Reveal className="mt-14">
          <EcosystemNetwork />
        </Reveal>
      </div>
    </section>
  )
}
