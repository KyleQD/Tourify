import Image from "next/image"
import { Check, MapPin, Pause, Search } from "lucide-react"
import { cn } from "@/lib/utils"

function Frame({
  path,
  children,
  className,
}: {
  path: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 text-[11px] leading-tight text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <span className="truncate font-mono text-[10px] text-slate-500">tourify.live/{path}</span>
        <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-px text-[9px] uppercase tracking-wider text-slate-500">
          Sample
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function EventsPreview() {
  const shows: Record<number, string> = { 3: "The Echo", 7: "Lowlands", 8: "Lowlands", 12: "Paper Moon" }
  const days = Array.from({ length: 14 }, (_, i) => i + 1)
  return (
    <Frame path="events">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">June</span>
        <span className="text-purple-300">4 shows</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-center text-[9px] text-slate-600">
            {d}
          </span>
        ))}
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded-md text-[10px]",
              shows[d] ? "bg-purple-500/30 font-semibold text-white ring-1 ring-purple-400/40" : "bg-white/[0.03] text-slate-500",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-2 py-1.5">
        <span className="text-white">Next: Paper Moon</span>
        <span className="text-slate-400">Thu 12 · 8pm</span>
      </div>
    </Frame>
  )
}

function TicketingPreview() {
  const tiers = [
    { n: "Early bird", sold: 100, cap: 100, c: "bg-amber-400" },
    { n: "General", sold: 212, cap: 260, c: "bg-orange-400" },
    { n: "VIP", sold: 9, cap: 40, c: "bg-rose-400" },
  ]
  return (
    <Frame path="tickets">
      <div className="mb-2.5 flex items-end justify-between">
        <div>
          <p className="text-slate-500">Sold</p>
          <p className="text-lg font-bold text-white">321 / 400</p>
        </div>
        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">80%</span>
      </div>
      <div className="flex flex-col gap-2">
        {tiers.map((t) => (
          <div key={t.n}>
            <div className="mb-1 flex justify-between">
              <span className="text-white">{t.n}</span>
              <span className="text-slate-500">
                {t.sold === t.cap ? "Sold out" : `${t.sold}/${t.cap}`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full", t.c)} style={{ width: `${(t.sold / t.cap) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function ToursPreview() {
  const stops = [
    { x: 18, y: 62, c: "Seattle" },
    { x: 70, y: 40, c: "Portland" },
    { x: 128, y: 58, c: "Boise" },
    { x: 186, y: 30, c: "Denver" },
    { x: 250, y: 52, c: "Austin" },
  ]
  const d = stops.map((s, i) => `${i === 0 ? "M" : "L"}${s.x} ${s.y}`).join(" ")
  return (
    <Frame path="tours/summer-run">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-white">Summer run</span>
        <span className="text-blue-300">5 stops · 2,140 mi</span>
      </div>
      <svg viewBox="0 0 270 84" className="h-24 w-full">
        <defs>
          <pattern id="tour-grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M18 0H0V18" fill="none" stroke="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect width="270" height="84" fill="url(#tour-grid)" />
        <path d={d} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 4" className="mkt-dash-flow" />
        {stops.map((s, i) => (
          <g key={s.c}>
            <circle cx={s.x} cy={s.y} r={i === 2 ? 6 : 3.5} fill={i === 2 ? "rgba(96,165,250,0.25)" : "#93c5fd"} />
            {i === 2 && <circle cx={s.x} cy={s.y} r="3" fill="#bfdbfe" />}
            <text x={s.x} y={s.y + 15} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {s.c}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between border-t border-white/[0.06] pt-2 text-slate-400">
        <span>Boise to Denver</span>
        <span className="text-white">11h 40m drive</span>
      </div>
    </Frame>
  )
}

function WorkforcePreview() {
  const rows = [
    { role: "Door", who: "Sam K.", time: "6:30p", ok: true },
    { role: "Bar", who: "Priya N.", time: "6:00p", ok: true },
    { role: "Stage", who: "Unfilled", time: "4:00p", ok: false },
  ]
  return (
    <Frame path="crew/friday">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-white">Friday shifts</span>
        <span className="text-emerald-300">2 of 3 filled</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.role} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold",
                r.ok ? "bg-emerald-500/25 text-emerald-200" : "border border-dashed border-amber-400/60 text-amber-300",
              )}
            >
              {r.ok ? r.who[0] : "?"}
            </span>
            <span className="text-white">{r.role}</span>
            <span className={cn("ml-auto", r.ok ? "text-slate-400" : "text-amber-300")}>{r.who}</span>
            <span className="w-9 text-right text-slate-500">{r.time}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function LogisticsPreview() {
  const items = [
    { t: "2:00p", l: "Load-in", done: true },
    { t: "5:30p", l: "Soundcheck", done: true },
    { t: "7:00p", l: "Doors", now: true },
    { t: "8:30p", l: "Headline set" },
  ]
  return (
    <Frame path="day-sheet">
      <ol className="relative flex flex-col gap-2.5 border-l border-white/10 pl-3">
        {items.map((i) => (
          <li key={i.t} className="relative flex items-center gap-2">
            <span
              className={cn(
                "absolute -left-[17px] h-2 w-2 rounded-full",
                i.done ? "bg-rose-400" : i.now ? "bg-rose-300 mkt-pulse-ring" : "bg-slate-700",
              )}
            />
            <span className="w-9 font-mono text-rose-300/80">{i.t}</span>
            <span className={cn(i.done ? "text-slate-500 line-through" : "text-white")}>{i.l}</span>
            {i.now && <span className="ml-auto rounded bg-rose-400/15 px-1.5 text-[9px] text-rose-200">Now</span>}
          </li>
        ))}
      </ol>
    </Frame>
  )
}

function MessagingPreview() {
  return (
    <Frame path="inbox/paper-moon">
      <div className="mb-2 flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/25 text-[10px] font-semibold text-cyan-200">PM</span>
        <div>
          <p className="font-semibold text-white">Paper Moon booking</p>
          <p className="text-[10px] text-slate-500">Venue, artist, tour manager</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="max-w-[78%] rounded-lg rounded-bl-sm bg-white/10 px-2 py-1.5 text-white">Can we move doors to 7pm?</div>
        <div className="ml-auto max-w-[78%] rounded-lg rounded-br-sm bg-cyan-500/35 px-2 py-1.5 text-white">
          Works for us. Updating the day sheet.
        </div>
        <div className="flex w-fit items-center gap-1 rounded-lg bg-white/10 px-2 py-2">
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-300" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-300 [animation-delay:120ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-300 [animation-delay:240ms]" />
        </div>
      </div>
    </Frame>
  )
}

function AnalyticsPreview() {
  const points = [22, 30, 26, 40, 37, 52, 48, 63, 58, 72, 69, 84]
  const w = 300
  const h = 90
  const step = w / (points.length - 1)
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(h - (p / 100) * h).toFixed(1)}`).join(" ")
  return (
    <Frame path="analytics">
      <div className="mb-2 grid grid-cols-3 gap-2">
        {[
          ["Tickets", "1,284", "+18%"],
          ["Revenue", "$31.2k", "+12%"],
          ["Sell-through", "86%", "+6 pts"],
        ].map(([l, v, d]) => (
          <div key={l} className="rounded-lg bg-white/[0.04] px-2 py-1.5">
            <p className="text-[10px] text-slate-500">{l}</p>
            <p className="text-sm font-bold text-white">{v}</p>
            <p className="text-[10px] text-emerald-300">{d}</p>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="h-24 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="an-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d946ef" stopOpacity="0.45" />
            <stop offset="1" stopColor="#d946ef" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.05)" />
        ))}
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#an-fill)" />
        <path d={line} fill="none" stroke="#e879f9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-slate-600">
        <span>Week 1</span>
        <span>Week 6</span>
        <span>Week 12</span>
      </div>
    </Frame>
  )
}

function ProfilePreview() {
  const tracks = [
    ["Neon Hours", "3:41"],
    ["Low Tide", "4:02"],
  ]
  return (
    <Frame path="nova-lane">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          <Image src="/marketing/artist-portrait.png" alt="" fill sizes="80px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold text-white">
            Nova Lane
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500">
              <Check className="h-2.5 w-2.5 text-white" />
            </span>
          </p>
          <p className="text-slate-400">Indie pop · Portland, OR</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {["Press kit", "Stage plot", "Rider"].map((t) => (
              <span key={t} className="rounded border border-purple-400/25 bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-200">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        {tracks.map(([t, d], i) => (
          <li key={t} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10">
              {i === 0 ? <Pause className="h-2 w-2 text-white" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
            </span>
            <span className="text-white">{t}</span>
            {i === 0 && (
              <span className="flex h-3 items-end gap-px">
                {[3, 7, 5, 9, 4].map((b, j) => (
                  <span key={j} className="w-0.5 animate-pulse rounded-full bg-purple-300" style={{ height: b + 2, animationDelay: `${j * 90}ms` }} />
                ))}
              </span>
            )}
            <span className="ml-auto text-slate-500">{d}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function DiscoveryPreview() {
  const items = [
    { img: "/marketing/band-live.png", t: "The Static Hearts", m: "Sat 14 · The Echo" },
    { img: "/marketing/venue-room.png", t: "Paper Moon", m: "Venue · 400 cap" },
    { img: "/marketing/show-crowd.png", t: "Lowlands Fest", m: "Jun 7-8 · Outdoor" },
  ]
  return (
    <Frame path="discover">
      <div className="mb-2 flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1.5 text-slate-400">
        <Search className="h-3 w-3" />
        <span>indie near Portland</span>
        <span className="ml-auto h-3 w-px animate-pulse bg-cyan-300" />
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.t} className="flex items-center gap-2">
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
              <Image src={i.img} alt="" fill sizes="32px" className="object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-white">{i.t}</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <MapPin className="h-2.5 w-2.5" />
                {i.m}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function BookingsPreview() {
  const cols = [
    { n: "New", dot: "bg-blue-400", cards: [["Nova Lane", "$1,800"], ["Ghost Pines", "$950"]] },
    { n: "Talks", dot: "bg-amber-400", cards: [["Static Hearts", "$2,400"], ["Juniper", "$1,200"]] },
    { n: "Signed", dot: "bg-emerald-400", cards: [["Mara Vale", "$3,100"]] },
  ]
  return (
    <Frame path="bookings">
      <div className="grid grid-cols-3 gap-1.5">
        {cols.map((c) => (
          <div key={c.n} className="flex flex-col gap-1 rounded-md bg-white/[0.03] p-1.5">
            <p className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
              <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
              {c.n}
            </p>
            {c.cards.map(([a, p]) => (
              <div key={a} className="rounded border border-white/[0.06] bg-slate-900 px-1.5 py-1">
                <p className="truncate text-[10px] text-white">{a}</p>
                <p className="text-[9px] text-slate-500">{p}</p>
              </div>
            ))}
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
