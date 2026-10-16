"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"
import { accents } from "@/lib/marketing/accent"
import { getFeature } from "@/lib/marketing/features"
import { personas } from "@/lib/marketing/personas"
import { cn } from "@/lib/utils"

export function PersonaTabs() {
  const [index, setIndex] = useState(0)
  const persona = personas[index]
  const a = accents[persona.accent]

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      setIndex((i) => (i + 1) % personas.length)
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      setIndex((i) => (i - 1 + personas.length) % personas.length)
    }
  }

  return (
    <section id="solutions" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Solutions"
          title={
            <>
              Built for everyone <GradientText>behind the show</GradientText>
            </>
          }
          description="Pick your role to see what Tourify does for you, then dive into a page made for it."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div
            role="tablist"
            aria-label="User types"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {personas.map((p, i) => {
              const pa = accents[p.accent]
              const selected = i === index
              return (
                <button
                  key={p.slug}
                  role="tab"
                  id={`persona-tab-${p.slug}`}
                  aria-selected={selected}
                  aria-controls="persona-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                    selected ? cn("text-white", pa.bg, pa.border) : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <p.icon className={cn("h-5 w-5", selected ? pa.text : "text-slate-500")} aria-hidden />
                  {p.name}
                </button>
              )
            })}
          </div>

          <div
            role="tabpanel"
            id="persona-panel"
            aria-labelledby={`persona-tab-${persona.slug}`}
            className="relative min-h-[26rem] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl transition-colors duration-500"
              style={{ background: `${a.hex}33` }}
              aria-hidden
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={persona.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <p className={cn("text-sm font-semibold uppercase tracking-[0.16em]", a.text)}>{persona.name}</p>
                <h3 className="mt-3 text-balance text-3xl font-bold text-white sm:text-4xl">
                  {persona.headline[0]} <span className={a.text}>{persona.headline[1]}</span>
                </h3>
                <p className="mt-4 max-w-xl text-pretty text-slate-300">{persona.sub}</p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {persona.features.slice(0, 4).map((pf) => {
                    const f = getFeature(pf.slug)
                    if (!f) return null
                    return (
                      <li key={pf.slug} className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-4">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", a.text)} aria-hidden />
                        <div>
                          <p className="text-sm font-semibold text-white">{f.title}</p>
                          <p className="mt-0.5 text-sm leading-snug text-slate-400">{pf.body}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <Link
                  href={`/solutions/${persona.slug}`}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Explore Tourify for {persona.name.toLowerCase()}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
