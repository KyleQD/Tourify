import Link from "next/link"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { StatusBadge } from "@/components/marketing/status-badge"
import { featureStatusMeta, featureStatusOrder } from "@/lib/marketing/feature-status"
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
              Honest about <GradientText>what is ready</GradientText>
            </>
          }
          description="Tourify is in open beta. Here is where each area stands today. Statuses change as we ship."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureStatusOrder.map((status) => {
            const group = items.filter((i) => i.status === status)
            return (
              <div key={status} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={status} />
                  <span className="text-xs text-slate-500">{group.length}</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{featureStatusMeta[status].description}</p>
                <Stagger className="mt-4 space-y-2" stagger={0.05}>
                  {group.length === 0 && <p className="text-sm text-slate-600">Nothing here right now.</p>}
                  {group.map((item) => (
                    <StaggerItem key={item.title}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="block rounded-xl border border-white/[0.06] bg-slate-950/50 p-3 transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-400">{item.body}</p>
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-400">{item.body}</p>
                        </div>
                      )}
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
