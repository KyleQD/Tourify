import { cn } from "@/lib/utils"

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[11px] leading-tight text-slate-300 shadow-inner",
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  )
}

function Dots() {
  return (
    <div className="mb-2 flex gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
    </div>
  )
}

function EventsPreview() {
  const days = Array.from({ length: 14 }, (_, i) => i + 1)
  const marked = new Set([3, 7, 8, 12])
  return (
    <Frame>
      <Dots />
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">Upcoming</span>
        <span className="text-purple-300">4 shows</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md text-[10px]",
              marked.has(d) ? "bg-purple-500/40 font-semibold text-white" : "bg-white/[0.04] text-slate-500",
            )}
          >
            {d}
          </div>
        ))}
      </div>
    </Frame>
  )
}

function TicketingPreview() {
  const tiers = [
    { n: "Early bird", p: "$18", w: "100%", c: "bg-amber-400" },
    { n: "General", p: "$25", w: "64%", c: "bg-orange-400" },
    { n: "VIP", p: "$60", w: "22%", c: "bg-rose-400" },
  ]
  return (
    <Frame>
      <Dots />
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.n}>
            <div className="mb-1 flex justify-between">
              <span className="text-white">{t.n}</span>
              <span>{t.p}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full", t.c)} style={{ width: t.w }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function ToursPreview() {
  return (
    <Frame>
      <Dots />
      <svg viewBox="0 0 200 80" className="h-20 w-full">
        <path d="M14 56 C50 20 80 66 112 34 S170 16 188 40" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" className="mkt-dash-flow" />
        {[
          [14, 56],
          [62, 40],
          [112, 34],
          [152, 28],
          [188, 40],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#93c5fd" />
        ))}
      </svg>
      <div className="flex justify-between text-slate-400">
        <span>5 cities</span>
        <span>Sample route</span>
      </div>
    </Frame>
  )
}

function WorkforcePreview() {
  const rows = [
    ["Door", "Sam", "bg-emerald-400"],
    ["Bar", "Priya", "bg-emerald-400"],
    ["Stage", "Open", "bg-amber-400"],
  ]
  return (
    <Frame>
      <Dots />
      <div className="space-y-1.5">
        {rows.map(([role, who, c]) => (
          <div key={role} className="flex items-center justify-between rounded-md bg-white/[0.04] px-2 py-1.5">
            <span className="text-white">{role}</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", c)} />
              {who}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function LogisticsPreview() {
  const items = [
    ["14:00", "Load-in"],
    ["17:30", "Soundcheck"],
    ["19:00", "Doors"],
    ["20:30", "Set"],
  ]
  return (
    <Frame>
      <Dots />
      <ul className="space-y-1.5">
        {items.map(([t, l]) => (
          <li key={t} className="flex gap-2">
            <span className="w-10 text-rose-300">{t}</span>
            <span className="text-white">{l}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function MessagingPreview() {
  return (
    <Frame>
      <Dots />
      <div className="space-y-1.5">
        <div className="max-w-[80%] rounded-lg rounded-bl-sm bg-white/10 px-2 py-1.5 text-white">Can we move doors to 7?</div>
        <div className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-cyan-500/40 px-2 py-1.5 text-white">Works for us.</div>
        <div className="max-w-[60%] rounded-lg rounded-bl-sm bg-white/10 px-2 py-1.5 text-white">Confirmed.</div>
      </div>
    </Frame>
  )
}

function AnalyticsPreview() {
  const bars = [38, 52, 44, 68, 60, 82, 74]
  return (
    <Frame>
      <Dots />
      <div className="flex h-16 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-fuchsia-600 to-purple-400" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="mt-2 text-slate-400">Sample data</p>
    </Frame>
  )
}

function ProfilePreview() {
  return (
    <Frame>
      <Dots />
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500" />
        <div>
          <p className="font-semibold text-white">Sample Artist</p>
          <p className="text-slate-400">Indie / Live</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <div className="aspect-video rounded bg-purple-500/30" />
        <div className="aspect-video rounded bg-fuchsia-500/30" />
        <div className="aspect-video rounded bg-blue-500/30" />
      </div>
    </Frame>
  )
}

function DiscoveryPreview() {
  const items = ["Sample Band", "The Room", "Open mic night"]
  return (
    <Frame>
      <Dots />
      <div className="mb-2 rounded-md bg-white/[0.06] px-2 py-1.5 text-slate-400">Search shows, artists, venues</div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-5 w-5 rounded bg-cyan-500/40" />
            <span className="text-white">{i}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function BookingsPreview() {
  const cols = [
    ["New", "2", "bg-blue-400"],
    ["Talking", "3", "bg-amber-400"],
    ["Confirmed", "1", "bg-emerald-400"],
  ]
  return (
    <Frame>
      <Dots />
      <div className="grid grid-cols-3 gap-1.5">
        {cols.map(([n, c, color]) => (
          <div key={n} className="rounded-md bg-white/[0.04] p-1.5 text-center">
            <span className={cn("mx-auto mb-1 block h-1.5 w-1.5 rounded-full", color)} />
            <p className="text-lg font-bold text-white">{c}</p>
            <p className="text-slate-400">{n}</p>
          </div>
        ))}
      </div>
    </Frame>
  )
}

const previews: Record<string, () => React.JSX.Element> = {
  events: EventsPreview,
  ticketing: TicketingPreview,
  tours: ToursPreview,
  workforce: WorkforcePreview,
  logistics: LogisticsPreview,
  messaging: MessagingPreview,
  analytics: AnalyticsPreview,
  "profiles-epk": ProfilePreview,
  discovery: DiscoveryPreview,
  bookings: BookingsPreview,
}

export function FeaturePreview({ slug }: { slug: string }) {
  const Preview = previews[slug]
  return Preview ? <Preview /> : null
}
