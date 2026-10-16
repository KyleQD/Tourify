import { ArrowRight, Check, X } from "lucide-react"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal"

const scattered = [
  "Routing in a spreadsheet",
  "Booking threads in email",
  "Crew in a group chat",
  "Day sheets as PDFs",
  "Tickets on another site",
  "Shifts on a shared doc",
]

const unified = [
  "One calendar for every date",
  "Booking requests with clear status",
  "Teams and threads in one inbox",
  "Shared schedules that stay current",
  "Events and tickets side by side",
  "Rosters your whole team can see",
]

export function ProblemSolution() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Tourify"
          title={
            <>
              Live events run on too many tools. <GradientText>Put them in one place.</GradientText>
            </>
          }
          description="Most teams stitch together spreadsheets, inboxes and chats. Tourify replaces the patchwork with a single workspace built for live events."
        />

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <Reveal>
            <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Without Tourify</p>
              <Stagger className="mt-5 space-y-3" stagger={0.07}>
                {scattered.map((item, i) => (
                  <StaggerItem key={item}>
                    <div
                      className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-3 text-slate-400"
                      style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.6}deg)` }}
                    >
                      <X className="h-4 w-4 shrink-0 text-rose-400/80" aria-hidden />
                      {item}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Reveal>

          <div className="hidden items-center lg:flex" aria-hidden>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/[0.12] via-white/[0.04] to-cyan-500/[0.08] p-6 shadow-[0_30px_100px_-40px_rgba(168,85,247,0.6)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-purple-200">With Tourify</p>
              <Stagger className="mt-5 space-y-3" stagger={0.07}>
                {unified.map((item) => (
                  <StaggerItem key={item}>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100">
                      <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      {item}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
