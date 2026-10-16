"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { accents } from "@/lib/marketing/accent"
import { features } from "@/lib/marketing/features"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

const HUB = { x: 50, y: 50 }

function rowY(i: number, n: number) {
  return ((i + 0.5) / n) * 100
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

export function EcosystemNetwork() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => setActive((a) => (a + 1) % personas.length), 3800)
    return () => clearInterval(id)
  }, [paused])

  const persona = personas[active]
  const pa = accents[persona.accent]
  const linked = new Set(persona.features.map((f) => f.slug))

  const select = (i: number) => {
    setPaused(true)
    setActive(i)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <div className="relative grid h-[34rem] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-24 sm:gap-x-40 md:grid-cols-[13rem_1fr_13rem] md:gap-x-0">
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {personas.map((p, i) => {
              const on = i === active
              return (
                <path
                  key={p.slug}
                  d={curve(22, rowY(i, personas.length), HUB.x, HUB.y)}
                  fill="none"
                  stroke={on ? accents[p.accent].hex : "rgba(255,255,255,0.07)"}
                  strokeWidth={on ? 2 : 1}
                  strokeDasharray={on ? "6 6" : undefined}
                  vectorEffect="non-scaling-stroke"
                  className={cn("transition-[stroke] duration-500", on && "mkt-dash-flow")}
                />
              )
            })}
            {features.map((f, i) => {
              const on = linked.has(f.slug)
              return (
                <path
                  key={f.slug}
                  d={curve(HUB.x, HUB.y, 78, rowY(i, features.length))}
                  fill="none"
                  stroke={on ? pa.hex : "rgba(255,255,255,0.07)"}
                  strokeOpacity={on ? 0.8 : 1}
                  strokeWidth={on ? 1.75 : 1}
                  strokeDasharray={on ? "6 6" : undefined}
                  vectorEffect="non-scaling-stroke"
                  className={cn("transition-[stroke] duration-500", on && "mkt-dash-flow")}
                />
              )
            })}
          </svg>

          <ul className="relative z-10 flex flex-col justify-around" aria-label="User types">
            {personas.map((p, i) => {
              const a = accents[p.accent]
              const on = i === active
              return (
                <li key={p.slug}>
                  <button
                    type="button"
                    onClick={() => select(i)}
                    onMouseEnter={() => select(i)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                      on ? cn("bg-slate-900", a.border, "text-white shadow-lg") : "border-white/[0.06] bg-slate-950/80 text-slate-400 hover:text-white",
                    )}
                    style={on ? { boxShadow: `0 0 32px -8px ${a.hex}` } : undefined}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", on ? a.bgStrong : "bg-white/[0.04]")}>
                      <p.icon className={cn("h-3.5 w-3.5", on ? a.text : "text-slate-500")} aria-hidden />
                    </span>
                    <span className="truncate font-medium">{p.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="relative z-10 hidden items-center justify-center md:flex">
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-white/15 bg-slate-950 text-center">
              <span className="absolute inset-0 rounded-full mkt-pulse-ring" style={{ boxShadow: `0 0 0 1px ${pa.hex}` }} aria-hidden />
              <span
                className="absolute -inset-6 rounded-full opacity-40 blur-2xl transition-colors duration-700"
                style={{ background: pa.hex }}
                aria-hidden
              />
              <span className="relative text-sm font-bold text-white">Tourify</span>
              <span className="relative mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">Shared show data</span>
            </div>
          </div>

          <ul className="relative z-10 flex flex-col justify-around" aria-label="Features">
            {features.map((f) => {
              const on = linked.has(f.slug)
              return (
                <li key={f.slug}>
                  <Link
                    href={`/features/${f.slug}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                      on ? cn("bg-slate-900 text-white", pa.border) : "border-transparent text-slate-600 hover:text-slate-300",
                    )}
                  >
                    <f.icon className={cn("h-3.5 w-3.5 shrink-0", on ? pa.text : "text-slate-700")} aria-hidden />
                    <span className="truncate">{f.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <aside
        className={cn("flex flex-col rounded-3xl border bg-slate-950/80 p-6 transition-colors duration-500", pa.border)}
        aria-live="polite"
      >
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", pa.bgStrong)}>
          <persona.icon className={cn("h-5 w-5", pa.text)} aria-hidden />
        </span>
        <p className={cn("mt-5 text-xs font-semibold uppercase tracking-widest", pa.text)}>{persona.name}</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight text-white text-balance">
          {persona.headline[0]} {persona.headline[1]}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{persona.sub}</p>
        <ul className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-5">
          {persona.features.slice(0, 4).map((pf) => {
            const f = features.find((x) => x.slug === pf.slug)
            if (!f) return null
            return (
              <li key={pf.slug} className="flex gap-2.5 text-sm">
                <f.icon className={cn("mt-0.5 h-4 w-4 shrink-0", pa.text)} aria-hidden />
                <span className="leading-snug text-slate-300">
                  <span className="font-medium text-white">{f.title}.</span> {pf.body}
                </span>
              </li>
            )
          })}
        </ul>
        <Link
          href={`/solutions/${persona.slug}`}
          className="group mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-white"
        >
          Tourify for {persona.name.toLowerCase()}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
        </Link>
      </aside>
    </div>
  )
}
