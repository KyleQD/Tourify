import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { RoadmapBoard } from "@/components/marketing/sections/roadmap-board"
import { features, roadmapExtras } from "@/lib/marketing/features"

const items = [
  ...features.map((f) => ({ title: f.title, body: f.summary, status: f.status, href: `/features/${f.slug}` as string | null })),
  ...roadmapExtras.map((r) => ({ ...r, href: null as string | null })),
]

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Roadmap"
          title={
            <>
              Built in the open. <GradientText>Shipped every week.</GradientText>
            </>
          }
          description="Tourify is in open beta. This is exactly where each part of the platform stands today, with nothing rounded up."
        />
        <RoadmapBoard items={items} />
      </div>
    </section>
  )
}
