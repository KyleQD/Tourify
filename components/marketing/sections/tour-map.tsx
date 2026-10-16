"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, MapPin } from "lucide-react"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { SampleBadge } from "@/components/marketing/charts/sample-badge"
import { StatusBadge } from "@/components/marketing/status-badge"
import { cn } from "@/lib/utils"

const stops = [
  { city: "Los Angeles", date: "Mar 06", x: 110, y: 250, drive: "Start", venue: "Sample venue A", cap: 1200 },
  { city: "Denver", date: "Mar 09", x: 290, y: 200, drive: "17h 10m", venue: "Sample venue B", cap: 850 },
  { city: "Chicago", date: "Mar 13", x: 470, y: 150, drive: "13h 00m", venue: "Sample venue C", cap: 1500 },
  { city: "Nashville", date: "Mar 15", x: 560, y: 235, drive: "7h 40m", venue: "Sample venue D", cap: 600 },
  { city: "Atlanta", date: "Mar 17", x: 610, y: 275, drive: "4h 10m", venue: "Sample venue E", cap: 1000 },
  { city: "New York", date: "Mar 21", x: 720, y: 125, drive: "13h 30m", venue: "Sample venue F", cap: 2000 },
]

const path =
  "M110 250 C 190 210 220 190 290 200 S 410 140 470 150 S 530 215 560 235 S 590 270 610 275 S 690 170 720 125"

export function TourMap() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(2)
  const stop = stops[active]

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Tour routing"
          title={
            <>
              See the whole run <GradientText>before you load the van</GradientText>
            </>
          }
          description="Lay out dates city by city, check drive times between stops and spot the gaps. Select a stop to explore this sample route."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-3 shadow-2xl shadow-black/40 sm:p-5">
            <div className="absolute right-4 top-4 z-10 flex gap-2">
              <SampleBadge label="Sample route" />
            </div>
            <svg viewBox="0 0 820 400" className="h-auto w-full" role="img" aria-label="Sample tour route across six US cities">
              <defs>
                <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1" fill="rgba(148,163,184,0.18)" />
                </pattern>
                <linearGradient id="map-route" x1="0" x2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <rect width="820" height="400" fill="url(#map-grid)" />
              <path d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" />
              <motion.path
                d={path}
                fill="none"
                stroke="url(#map-route)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 2.4, ease: "easeInOut" }}
              />
              {stops.map((s, i) => (
                <g
                  key={s.city}
                  transform={`translate(${s.x} ${s.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.city}, ${s.date}`}
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(i)}
                  className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-cyan-300"
                >
                  <circle r="18" fill="transparent" stroke="transparent" strokeWidth="2" />
                  {i === active && (
                    <circle r="12" fill="none" stroke="#c084fc" strokeOpacity="0.7" className="mkt-pulse-ring" style={{ transformOrigin: "center" }} />
                  )}
                  <circle r={i === active ? 7 : 5} fill={i === active ? "#f5d0fe" : "#c4b5fd"} />
                  <text y="-16" textAnchor="middle" fontSize="12" fontWeight="600" fill={i === active ? "#fff" : "#94a3b8"}>
                    {s.city}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur" aria-live="polite">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-purple-200">
                  <MapPin className="h-4 w-4" aria-hidden />
                  Stop {active + 1} of {stops.length}
                </p>
                <p className="text-sm text-slate-400">{stop.date}</p>
              </div>
              <h3 className="mt-3 text-2xl font-bold text-white">{stop.city}</h3>
              <p className="text-sm text-slate-400">{stop.venue}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950/60 p-3">
                  <dt className="text-slate-500">Drive from previous</dt>
                  <dd className="mt-1 font-semibold text-white">{stop.drive}</dd>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-3">
                  <dt className="text-slate-500">Capacity</dt>
                  <dd className="mt-1 font-semibold text-white">{stop.cap.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <ol className="grid grid-cols-2 gap-2" aria-label="Route stops">
              {stops.map((s, i) => (
                <li key={s.city}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={i === active}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                      i === active
                        ? "border-purple-400/50 bg-purple-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="block font-medium">{s.city}</span>
                    <span className="text-xs text-slate-500">{s.date}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between gap-3">
              <StatusBadge status="beta" />
              <Link href="/features/tours" className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-white">
                Explore tour planning <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
