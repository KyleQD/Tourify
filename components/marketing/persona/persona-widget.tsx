"use client"

import { useState } from "react"
import { Check, Heart, Bell } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { RadialGauge } from "@/components/marketing/charts/radial-gauge"
import { SampleBadge } from "@/components/marketing/charts/sample-badge"
import { cn } from "@/lib/utils"

function toggle<T>(set: Set<T>, v: T) {
  const next = new Set(set)
  next.has(v) ? next.delete(v) : next.add(v)
  return next
}

function RouteBuilder() {
  const cities = [
    { n: "Los Angeles", h: 0 },
    { n: "Denver", h: 17 },
    { n: "Chicago", h: 13 },
    { n: "Nashville", h: 7 },
    { n: "Atlanta", h: 4 },
  ]
  const [on, setOn] = useState(new Set(["Los Angeles", "Denver"]))
  const hours = cities.filter((c) => on.has(c.n)).reduce((s, c) => s + c.h, 0)
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">Select cities to add them to the run.</p>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <button
            key={c.n}
            type="button"
            aria-pressed={on.has(c.n)}
            onClick={() => setOn(toggle(on, c.n))}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              on.has(c.n) ? "border-purple-400/60 bg-purple-500/20 text-white" : "border-white/10 text-slate-400 hover:bg-white/5",
            )}
          >
            {c.n}
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-950/60 p-4">
          <p className="text-slate-500">Stops</p>
          <p className="text-2xl font-bold text-white">{on.size}</p>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-4">
          <p className="text-slate-500">Est. drive time</p>
          <p className="text-2xl font-bold text-white">{hours}h</p>
        </div>
      </div>
    </div>
  )
}

function DaySheet() {
  const items = ["Load in 14:00", "Soundcheck 16:30", "Doors 19:00", "Set 21:00", "Load out 23:30"]
  const [done, setDone] = useState(new Set([items[0]]))
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">Tick items off as the day moves.</p>
      <Progress value={(done.size / items.length) * 100} className="mb-4 h-2 bg-white/10" aria-label="Day sheet progress" />
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i}>
            <button
              type="button"
              aria-pressed={done.has(i)}
              onClick={() => setDone(toggle(done, i))}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", done.has(i) ? "border-blue-400 bg-blue-500" : "border-white/20")}>
                {done.has(i) && <Check className="h-3 w-3" aria-hidden />}
              </span>
              <span className={cn(done.has(i) && "text-slate-500 line-through")}>{i}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BookingCalendar() {
  const [booked, setBooked] = useState(new Set([3, 4, 10]))
  const days = Array.from({ length: 14 }, (_, i) => i + 1)
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">Click a day to mark it booked.</p>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={booked.has(d)}
            aria-label={`Day ${d}${booked.has(d) ? ", booked" : ", open"}`}
            onClick={() => setBooked(toggle(booked, d))}
            className={cn(
              "aspect-square rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              booked.has(d) ? "bg-fuchsia-500/30 text-white ring-1 ring-fuchsia-400/50" : "bg-slate-950/60 text-slate-400 hover:bg-white/10",
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300">
        <span className="font-semibold text-white">{booked.size}</span> booked, {14 - booked.size} open
      </p>
    </div>
  )
}

function TierBuilder() {
  const [cap, setCap] = useState([800])
  const [sold, setSold] = useState([60])
  const tickets = Math.round((cap[0] * sold[0]) / 100)
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <RadialGauge value={sold[0]} label="Sold" color="#fbbf24" />
      <div className="w-full space-y-5 text-sm">
        <div>
          <div className="mb-2 flex justify-between text-slate-300">
            <span>Capacity</span>
            <span className="font-semibold text-white">{cap[0]}</span>
          </div>
          <Slider value={cap} onValueChange={setCap} min={100} max={2000} step={50} aria-label="Capacity" />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-slate-300">
            <span>Sold</span>
            <span className="font-semibold text-white">{sold[0]}%</span>
          </div>
          <Slider value={sold} onValueChange={setSold} min={0} max={100} step={1} aria-label="Percent sold" />
        </div>
        <p className="text-slate-400">
          {tickets.toLocaleString()} of {cap[0].toLocaleString()} tickets sold
        </p>
      </div>
    </div>
  )
}

function ShiftBoard() {
  const shifts = ["Bar, Fri 18:00", "Stage tech, Fri 15:00", "Front of house, Sat 19:00", "Security, Sat 20:00"]
  const [claimed, setClaimed] = useState(new Set<string>())
  return (
    <ul className="space-y-2">
      {shifts.map((s) => (
        <li key={s} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-4 py-3 text-sm">
          <span className="text-slate-200">{s}</span>
          <button
            type="button"
            aria-pressed={claimed.has(s)}
            onClick={() => setClaimed(toggle(claimed, s))}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              claimed.has(s) ? "bg-emerald-500 text-slate-950" : "border border-white/20 text-white hover:bg-white/10",
            )}
          >
            {claimed.has(s) ? "Claimed" : "Claim"}
          </button>
        </li>
      ))}
    </ul>
  )
}

function Funnel() {
  const stages = [
    { n: "Inquiries", v: 12 },
    { n: "Offers sent", v: 8 },
    { n: "Negotiating", v: 5 },
    { n: "Confirmed", v: 3 },
  ]
  const [i, setI] = useState(0)
  return (
    <div>
      <div className="space-y-2">
        {stages.map((s, idx) => (
          <button
            key={s.n}
            type="button"
            aria-pressed={idx === i}
            onClick={() => setI(idx)}
            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <div
              className={cn("rounded-lg px-4 py-2.5 text-sm transition-all", idx === i ? "bg-rose-500/40 text-white" : "bg-rose-500/15 text-slate-300")}
              style={{ width: `${(s.v / 12) * 100}%`, minWidth: "40%" }}
            >
              {s.n}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300">
        {stages[i].n}: <span className="font-semibold text-white">{stages[i].v}</span> offers
      </p>
    </div>
  )
}

function DiscoveryFeed() {
  const acts = ["Sample Artist One", "Sample Artist Two", "Sample Artist Three"]
  const [follow, setFollow] = useState(new Set([acts[0]]))
  const [alerts, setAlerts] = useState(new Set<string>())
  return (
    <ul className="space-y-2">
      {acts.map((a) => (
        <li key={a} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-4 py-3 text-sm">
          <span className="text-slate-200">{a}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-pressed={follow.has(a)}
              aria-label={`Follow ${a}`}
              onClick={() => setFollow(toggle(follow, a))}
              className="rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <Heart className={cn("h-4 w-4", follow.has(a) ? "fill-cyan-300 text-cyan-300" : "text-slate-500")} />
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Show alert for {a}</span>
              <Switch checked={alerts.has(a)} onCheckedChange={() => setAlerts(toggle(alerts, a))} />
            </label>
          </div>
        </li>
      ))}
    </ul>
  )
}

const widgets: Record<string, () => React.JSX.Element> = {
  artists: RouteBuilder,
  "tour-managers": DaySheet,
  venues: BookingCalendar,
  "event-organizers": TierBuilder,
  crew: ShiftBoard,
  promoters: Funnel,
  fans: DiscoveryFeed,
}

export function PersonaWidget({ slug, title, body }: { slug: string; title: string; body: string }) {
  const Widget = widgets[slug]
  if (!Widget) return null
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{body}</p>
        </div>
        <SampleBadge />
      </div>
      <div className="mt-6">
        <Widget />
      </div>
    </div>
  )
}
