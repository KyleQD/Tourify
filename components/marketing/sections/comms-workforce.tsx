import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion/reveal"
import { SampleBadge } from "@/components/marketing/charts/sample-badge"
import { StatusBadge } from "@/components/marketing/status-badge"
import { cn } from "@/lib/utils"

const messages = [
  { from: "Venue", text: "Can we move doors to 7:00?", me: false },
  { from: "You", text: "Works for us. Updating the day sheet.", me: true },
  { from: "Promoter", text: "Confirmed. Ticket page updated.", me: false },
  { from: "You", text: "Thanks, everyone is in sync.", me: true },
]

const roster = [
  { role: "Front of house", who: "Sample Crew A", state: "Confirmed", dot: "bg-emerald-400" },
  { role: "Bar", who: "Sample Crew B", state: "Confirmed", dot: "bg-emerald-400" },
  { role: "Stage tech", who: "Open shift", state: "Needs cover", dot: "bg-amber-400" },
  { role: "Security", who: "Sample Crew C", state: "Pending", dot: "bg-sky-400" },
]

export function CommsWorkforce() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Day of show"
          title={
            <>
              Keep the people <GradientText>on the same page</GradientText>
            </>
          }
          description="Conversations, schedules and rosters live beside the event they belong to, so nothing gets lost between the van and the venue."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Messaging in context</h3>
                <StatusBadge status="beta" />
              </div>
              <p className="mt-2 text-sm text-slate-400">Threads tied to the event, tour or booking they are about.</p>
              <Stagger className="mt-6 space-y-3 rounded-2xl bg-slate-950/60 p-4" stagger={0.18}>
                {messages.map((m, i) => (
                  <StaggerItem key={i} className={cn("flex", m.me && "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        m.me ? "rounded-br-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white" : "rounded-bl-sm bg-white/10 text-slate-100",
                      )}
                    >
                      <span className="mb-0.5 block text-[11px] font-medium opacity-70">{m.from}</span>
                      {m.text}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
              <Link href="/features/messaging" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-white">
                About messaging <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Crew and scheduling</h3>
                <StatusBadge status="in-development" />
              </div>
              <p className="mt-2 text-sm text-slate-400">Fill every role, see gaps early and keep shift details current.</p>
              <div className="mt-6 rounded-2xl bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500">Friday roster</span>
                  <SampleBadge />
                </div>
                <Stagger className="space-y-2" stagger={0.1}>
                  {roster.map((r) => (
                    <StaggerItem key={r.role}>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-white">{r.role}</p>
                          <p className="text-slate-400">{r.who}</p>
                        </div>
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className={cn("h-2 w-2 rounded-full", r.dot)} aria-hidden />
                          {r.state}
                        </span>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <Link href="/features/workforce" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-white">
                About crew tools <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
